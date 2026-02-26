import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from '../../../../../../src/agents/agent-scope';
import { listChannelPlugins } from '../../../../../../src/channels/plugins/index';
import { SECTION_NAMES, SectionName, sectionSchemas } from '../../../../../../src/config/config-schema';
import { buildConfigSchema } from '../../../../../../src/config/schema';
import { loadPluginManifestRegistry } from '../../../../../../src/plugins/manifest-registry';
import { getConfigManager } from '../../../../../lib/config-instance';

function asPlainObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
}

function deepMergeObjects(
    base: Record<string, unknown>,
    overlay: Record<string, unknown>
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
        const current = out[key];
        const currentObj = asPlainObject(current);
        const valueObj = asPlainObject(value);
        if (currentObj && valueObj) {
            out[key] = deepMergeObjects(currentObj, valueObj);
            continue;
        }
        out[key] = value;
    }
    return out;
}

function mergeSectionSchemas(
    mergedSchema: Record<string, unknown> | null,
    zodSchema: Record<string, unknown> | null
): Record<string, unknown> | null {
    if (!mergedSchema && !zodSchema) return null;
    if (!mergedSchema) return zodSchema;
    if (!zodSchema) return mergedSchema;

    // Start with Zod section schema for structure, then overlay merged dynamic
    // schema so plugin/channel manifest-derived fields win.
    const next: Record<string, unknown> = deepMergeObjects(zodSchema, mergedSchema);

    const required = new Set<string>([
        ...asStringArray(mergedSchema.required),
        ...asStringArray(zodSchema.required),
    ]);
    if (required.size > 0) {
        next.required = Array.from(required);
    } else {
        delete next.required;
    }

    return next;
}

function buildMergedSchema() {
    const cfg = getConfigManager().getAll(false) as any;
    const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
    const channels = listChannelPlugins().map((entry) => ({
        id: entry.id,
        label: entry.meta.label,
        description: entry.meta.blurb,
        configSchema: entry.configSchema?.schema,
        configUiHints: entry.configSchema?.uiHints,
    }));

    // Schema generation only needs manifest metadata, not plugin runtime loading.
    // This avoids hard failures from optional runtime-only plugin dependencies.
    let plugins: Array<{
        id: string;
        name?: string;
        description?: string;
        configUiHints?: Record<string, unknown>;
        configSchema?: Record<string, unknown>;
    }> = [];
    try {
        const manifestRegistry = loadPluginManifestRegistry({
            config: cfg,
            cache: true,
            workspaceDir,
        });
        plugins = manifestRegistry.plugins.map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            configUiHints: plugin.configUiHints,
            configSchema: plugin.configSchema,
        }));
    } catch (error) {
        console.warn('[config/schema] plugin manifest load failed; continuing without plugin metadata', error);
    }

    return buildConfigSchema({
        plugins,
        channels,
    });
}

// GET /api/config/schema/:section
export async function GET(
    request: Request,
    { params }: { params: Promise<{ section: string }> }
) {
    try {
        const { section } = await params;
        if (!SECTION_NAMES.includes(section as SectionName)) {
            return NextResponse.json(
                { error: `Unknown section: ${section}`, validSections: SECTION_NAMES },
                { status: 400 }
            );
        }

        let schema: any | null = null;
        let mergedSchema: any | null = null;
        let zodSectionSchema: any | null = null;

        try {
            const merged = buildMergedSchema();
            mergedSchema = (merged.schema as any)?.properties?.[section] ?? null;
        } catch {
            mergedSchema = null;
        }

        const zodSchema = sectionSchemas[section as SectionName];
        try {
            // Prefer Zod v4 native conversion with transform fallback behavior.
            // @ts-ignore
            if (typeof z.toJSONSchema === 'function') {
                // @ts-ignore
                zodSectionSchema = z.toJSONSchema(zodSchema, { target: 'draft-07', unrepresentable: 'any' });
            } else {
                const { zodToJsonSchema } = await import('zod-to-json-schema');
                zodSectionSchema = zodToJsonSchema(zodSchema, { target: 'jsonSchema7' });
            }
        } catch {
            try {
                const { zodToJsonSchema } = await import('zod-to-json-schema');
                zodSectionSchema = zodToJsonSchema(zodSchema, { target: 'jsonSchema7' });
            } catch {
                zodSectionSchema = {};
            }
        }

        schema = mergeSectionSchemas(asPlainObject(mergedSchema), asPlainObject(zodSectionSchema)) ?? {};

        return NextResponse.json({ section, schema });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to build schema' }, { status: 500 });
    }
}
