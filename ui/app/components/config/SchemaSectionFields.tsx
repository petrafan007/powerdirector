'use client';

import { useEffect, useMemo, useState } from 'react';
import { GroupField, MaskedField, NumberField, SelectField, TextField, ToggleField } from './fields';

type JsonSchema = {
    type?: string | string[];
    title?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema | JsonSchema[];
    additionalProperties?: JsonSchema | boolean;
    enum?: unknown[];
    const?: unknown;
    default?: unknown;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    nullable?: boolean;
};

type SchemaSectionFieldsProps = {
    section: string;
    data: any;
    update: (path: string, value: any) => void;
};

const SECRET_KEYWORDS = [
    'apikey', 'api_key', 'token', 'password', 'secret', 'auth', 'privatekey', 'signingsecret',
    'webhooktoken', 'accesstoken', 'authtoken', 'imappass', 'smtppass', 'apppassword'
];

function schemaType(schema: JsonSchema | undefined): string | undefined {
    if (!schema) return undefined;
    if (Array.isArray(schema.type)) {
        const nonNull = schema.type.filter((t) => t !== 'null');
        return nonNull[0] ?? schema.type[0];
    }
    return schema.type;
}

function humanize(raw: string): string {
    return raw
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .replace(/^./, (m) => m.toUpperCase());
}

function defaultValue(schema?: JsonSchema): unknown {
    if (!schema) return '';
    if (schema.default !== undefined) return schema.default;
    const type = schemaType(schema);
    if (type === 'object') return {};
    if (type === 'array') return [];
    if (type === 'boolean') return false;
    if (type === 'number' || type === 'integer') return 0;
    return '';
}

function pathKey(path: Array<string | number>): string {
    return path.map((segment) => String(segment)).join('.');
}

function hasKnownShape(schema?: JsonSchema): boolean {
    if (!schema) return false;
    return Boolean(
        schema.type ||
        schema.enum ||
        schema.const !== undefined ||
        (schema.properties && Object.keys(schema.properties).length > 0) ||
        schema.items ||
        schema.anyOf ||
        schema.oneOf
    );
}

function guessSchemaFromValue(value: unknown): JsonSchema {
    if (value === null || value === undefined) return { type: 'string' };
    if (Array.isArray(value)) {
        const first = value.find((entry) => entry !== null && entry !== undefined);
        return {
            type: 'array',
            items: first === undefined ? { type: 'string' } : guessSchemaFromValue(first)
        };
    }
    if (typeof value === 'boolean') return { type: 'boolean' };
    if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const properties: Record<string, JsonSchema> = {};
        for (const [key, entry] of Object.entries(obj)) {
            properties[key] = guessSchemaFromValue(entry);
        }
        return {
            type: 'object',
            properties,
            additionalProperties: true
        };
    }
    return { type: 'string' };
}

function unionOptions(schema: JsonSchema): Array<{ id: string; label: string; value: unknown }> | null {
    const variants = (schema.anyOf ?? schema.oneOf ?? []).filter((entry) => schemaType(entry) !== 'null');
    if (variants.length === 0) return null;

    const options: Array<{ id: string; label: string; value: unknown }> = [];
    const seen = new Set<string>();

    const pushOption = (value: unknown) => {
        const id = `${typeof value}:${JSON.stringify(value)}`;
        if (seen.has(id)) return;
        seen.add(id);
        options.push({ id, label: String(value), value });
    };

    for (const variant of variants) {
        if (variant.const !== undefined) {
            pushOption(variant.const);
            continue;
        }
        if (Array.isArray(variant.enum)) {
            for (const value of variant.enum) {
                pushOption(value);
            }
            continue;
        }
        const t = schemaType(variant);
        if (t === 'boolean') {
            pushOption(true);
            pushOption(false);
            continue;
        }
        return null;
    }

    return options.length > 0 ? options : null;
}

function valueForSchema(value: unknown, schema: JsonSchema): unknown {
    if (value !== undefined) return value;
    if (schema.default !== undefined) return schema.default;
    return defaultValue(schema);
}

function valueType(value: unknown): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'number') return 'number';
    return typeof value;
}

function unionVariantLabel(schema: JsonSchema, index: number): string {
    if (schema.title) return schema.title;
    const t = schemaType(schema);
    if (t === 'string') return 'Text';
    if (t === 'integer') return 'Integer';
    if (t === 'number') return 'Number';
    if (t === 'boolean') return 'Boolean';
    if (t === 'array') return 'Array';
    if (t === 'object' || schema.properties || schema.additionalProperties) return 'Object';
    if (Array.isArray(schema.enum) && schema.enum.length > 0) return 'Enum';
    return `Option ${index + 1}`;
}

function unionVariantMatches(schema: JsonSchema, value: unknown): boolean {
    const t = schemaType(schema);
    const current = valueType(value);
    if (!t) return false;
    if (t === 'integer') return current === 'number';
    if (t === 'number') return current === 'number';
    if (t === 'object') return current === 'object';
    return t === current;
}

function isSensitive(path: Array<string | number>, schema: JsonSchema): boolean {
    const tokens = [...path.map((segment) => String(segment).toLowerCase())];
    if (schema.title) tokens.push(schema.title.toLowerCase());
    return tokens.some((token) => SECRET_KEYWORDS.some((kw) => token.includes(kw)));
}

export default function SchemaSectionFields({ section, data, update }: SchemaSectionFieldsProps) {
    const [schema, setSchema] = useState<JsonSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSchema = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/config/schema/${section}`);
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json?.error || 'Failed to load schema');
                }
                if (!cancelled) {
                    setSchema(json?.schema ?? null);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setSchema(null);
                    setError(err?.message || 'Failed to load schema');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadSchema();
        return () => {
            cancelled = true;
        };
    }, [section]);

    const patch = useMemo(() => {
        return (path: Array<string | number>, value: unknown) => {
            const key = pathKey(path);
            update(key, value);
        };
    }, [update]);

    if (loading) {
        return (
            <div className="py-2 px-1 text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                Loading schema...
            </div>
        );
    }

    if (error || !schema) {
        return (
            <div className="py-2 px-1 text-sm text-red-400">
                {error || 'Schema unavailable for this section.'}
            </div>
        );
    }

    return <div className="space-y-1">{renderNode(schema, data, [], patch, false)}</div>;
}

function renderNode(
    schema: JsonSchema,
    value: unknown,
    path: Array<string | number>,
    patch: (path: Array<string | number>, value: unknown) => void,
    showLabel: boolean
): React.ReactNode {
    if (schema.allOf && schema.allOf.length > 0) {
        return renderNode(schema.allOf[0], value, path, patch, showLabel);
    }

    const label = schema.title || humanize(String(path[path.length - 1] ?? 'value'));
    const description = schema.description;

    const union = schema.anyOf || schema.oneOf;
    if (union && union.length > 0) {
        const options = unionOptions(schema);
        if (options) {
            const currentValue = valueForSchema(value, schema);
            const currentId = options.find((opt) => Object.is(opt.value, currentValue))?.id ?? '';
            return (
                <SelectField
                    label={showLabel ? label : 'Value'}
                    description={description}
                    value={currentId}
                    options={[
                        { value: '', label: 'Select...' },
                        ...options.map((opt) => ({ value: opt.id, label: opt.label }))
                    ]}
                    onChange={(selected) => {
                        const next = options.find((opt) => opt.id === selected);
                        if (next) patch(path, next.value);
                    }}
                />
            );
        }

        const nonNull = union.filter((entry) => schemaType(entry) !== 'null');
        if (nonNull.length === 1) {
            return renderNode(nonNull[0], value, path, patch, showLabel);
        }

        const selectedIndex = Math.max(
            0,
            nonNull.findIndex((entry) => unionVariantMatches(entry, value))
        );
        const selectedSchema = nonNull[selectedIndex] ?? nonNull[0];
        const branchType = String(selectedIndex);

        return (
            <GroupField label={showLabel ? label : 'Value'} description={description} defaultOpen>
                <SelectField
                    label="Type"
                    value={branchType}
                    options={nonNull.map((entry, index) => ({
                        value: String(index),
                        label: unionVariantLabel(entry, index)
                    }))}
                    onChange={(selected) => {
                        const idx = Number(selected);
                        const nextSchema = nonNull[idx];
                        if (!nextSchema) return;
                        patch(path, defaultValue(nextSchema));
                    }}
                />
                {renderNode(selectedSchema, value, path, patch, false)}
            </GroupField>
        );
    }

    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
        const resolved = valueForSchema(value, schema);
        const options = schema.enum.map((entry) => ({
            value: `${typeof entry}:${JSON.stringify(entry)}`,
            label: String(entry),
            raw: entry
        }));
        const current = options.find((entry) => Object.is(entry.raw, resolved));
        return (
            <SelectField
                label={showLabel ? label : 'Value'}
                description={description}
                value={current?.value ?? ''}
                options={[
                    { value: '', label: 'Select...' },
                    ...options.map((entry) => ({ value: entry.value, label: entry.label }))
                ]}
                onChange={(selected) => {
                    const next = options.find((entry) => entry.value === selected);
                    if (next) patch(path, next.raw);
                }}
            />
        );
    }

    const type = schemaType(schema);

    if (type === 'object' || schema.properties || schema.additionalProperties) {
        return renderObject(schema, value, path, patch, showLabel);
    }

    if (type === 'array') {
        return renderArray(schema, value, path, patch, showLabel);
    }

    if (type === 'boolean') {
        const resolved = Boolean(valueForSchema(value, schema));
        return (
            <ToggleField
                label={showLabel ? label : 'Enabled'}
                description={description}
                value={resolved}
                onChange={(next) => patch(path, next)}
            />
        );
    }

    if (type === 'number' || type === 'integer') {
        const resolved = valueForSchema(value, schema);
        const numeric = typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : 0;
        return (
            <NumberField
                label={showLabel ? label : 'Value'}
                description={description}
                value={numeric}
                onChange={(next) => patch(path, type === 'integer' ? Math.trunc(next) : next)}
            />
        );
    }

    if (type === 'string' || type === undefined) {
        const resolved = valueForSchema(value, schema);
        const stringValue = typeof resolved === 'string' ? resolved : String(resolved ?? '');
        if (isSensitive(path, schema)) {
            return (
                <MaskedField
                    label={showLabel ? label : 'Value'}
                    description={description}
                    value={stringValue}
                    onChange={(next) => patch(path, next)}
                />
            );
        }
        return (
            <TextField
                label={showLabel ? label : 'Value'}
                description={description}
                value={stringValue}
                multiline={stringValue.length > 120 || stringValue.includes('\n')}
                onChange={(next) => patch(path, next)}
            />
        );
    }

    const guessed = guessSchemaFromValue(value);
    return renderNode(guessed, value, path, patch, showLabel);
}

function renderObject(
    schema: JsonSchema,
    value: unknown,
    path: Array<string | number>,
    patch: (path: Array<string | number>, value: unknown) => void,
    showLabel: boolean
): React.ReactNode {
    const label = schema.title || humanize(String(path[path.length - 1] ?? 'object'));
    const description = schema.description;
    const properties = schema.properties || {};
    const knownKeys = Object.keys(properties);
    const objectValue: Record<string, unknown> =
        value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

    const additional = typeof schema.additionalProperties === 'object'
        ? schema.additionalProperties
        : schema.additionalProperties === true
            ? {}
            : null;

    const children = (
        <div className="space-y-1">
            {knownKeys
                .map((key) => {
                    const fieldSchema = properties[key];
                    const fieldValue = objectValue[key];
                    return (
                        <div key={key}>
                            {renderNode(fieldSchema, fieldValue, [...path, key], patch, true)}
                        </div>
                    );
                })}

            {additional && (
                <DynamicMap
                    value={objectValue}
                    path={path}
                    reservedKeys={new Set(knownKeys)}
                    schema={additional}
                    patch={patch}
                />
            )}
        </div>
    );

    if (path.length === 0) {
        return children;
    }

    return (
        <GroupField label={showLabel ? label : 'Object'} description={description} defaultOpen>
            {children}
        </GroupField>
    );
}

function renderArray(
    schema: JsonSchema,
    value: unknown,
    path: Array<string | number>,
    patch: (path: Array<string | number>, value: unknown) => void,
    showLabel: boolean
): React.ReactNode {
    const label = schema.title || humanize(String(path[path.length - 1] ?? 'array'));
    const description = schema.description;
    const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    const itemSchema = itemsSchema || { type: 'string' };
    const list = Array.isArray(value) ? value : [];

    const body = (
        <div className="space-y-2">
            {list.length === 0 && (
                <div className="px-1 py-2 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                    No items.
                </div>
            )}

            {list.map((entry, index) => (
                <div
                    key={index}
                    className="rounded-lg px-3 py-2"
                    style={{ background: 'var(--pd-surface-panel)', border: '1px solid var(--pd-border)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium" style={{ color: 'var(--pd-text-muted)' }}>
                            Item {index + 1}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const next = [...list];
                                next.splice(index, 1);
                                patch(path, next);
                            }}
                            className="px-2 py-1 rounded text-xs cursor-pointer"
                            style={{ background: 'var(--pd-surface-panel-2)', color: '#f87171' }}
                        >
                            Remove
                        </button>
                    </div>
                    <div>{renderNode(itemSchema, entry, [...path, index], patch, false)}</div>
                </div>
            ))}

            <div className="px-1 pt-1">
                <button
                    type="button"
                    onClick={() => patch(path, [...list, defaultValue(itemSchema)])}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                    style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)' }}
                >
                    Add Item
                </button>
            </div>
        </div>
    );

    if (path.length === 0) {
        return (
            <GroupField label={showLabel ? label : 'Items'} description={description} defaultOpen>
                {body}
            </GroupField>
        );
    }

    return (
        <GroupField label={showLabel ? label : 'Items'} description={description} defaultOpen>
            {body}
        </GroupField>
    );
}

function DynamicMap({
    value,
    path,
    reservedKeys,
    schema,
    patch
}: {
    value: Record<string, unknown>;
    path: Array<string | number>;
    reservedKeys: Set<string>;
    schema: JsonSchema;
    patch: (path: Array<string | number>, value: unknown) => void;
}) {
    const extraKeys = Object.keys(value).filter((key) => !reservedKeys.has(key));

    return (
        <GroupField label="Custom Entries" defaultOpen={extraKeys.length > 0}>
            <div className="space-y-2">
                {extraKeys.length === 0 && (
                    <div className="px-1 py-1 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                        No custom entries.
                    </div>
                )}

                {extraKeys.map((key) => {
                    const current = value[key];
                    const currentSchema = hasKnownShape(schema) ? schema : guessSchemaFromValue(current);
                    return (
                        <div
                            key={key}
                            className="rounded-lg p-3 space-y-2"
                            style={{ background: 'var(--pd-surface-panel)', border: '1px solid var(--pd-border)' }}
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                        const nextKey = e.target.value.trim();
                                        if (!nextKey || nextKey === key || reservedKeys.has(nextKey)) return;
                                        const next = { ...value, [nextKey]: value[key] };
                                        delete next[key];
                                        patch(path, next);
                                    }}
                                    className="flex-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={{
                                        background: 'var(--pd-surface-panel-2)',
                                        border: '1px solid var(--pd-border)',
                                        color: 'var(--pd-text-main)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = { ...value };
                                        delete next[key];
                                        patch(path, next);
                                    }}
                                    className="px-2 py-1 rounded text-xs cursor-pointer"
                                    style={{ background: 'var(--pd-surface-panel-2)', color: '#f87171' }}
                                >
                                    Remove
                                </button>
                            </div>
                            <div>{renderNode(currentSchema, current, [...path, key], patch, false)}</div>
                        </div>
                    );
                })}

                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => {
                            const next = { ...value };
                            let i = 1;
                            let key = `entry_${i}`;
                            while (next[key] !== undefined || reservedKeys.has(key)) {
                                i += 1;
                                key = `entry_${i}`;
                            }
                            next[key] = defaultValue(schema);
                            patch(path, next);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)' }}
                    >
                        Add Entry
                    </button>
                </div>
            </div>
        </GroupField>
    );
}
