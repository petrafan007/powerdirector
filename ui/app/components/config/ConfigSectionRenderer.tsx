import React, { useState, useMemo, useEffect } from 'react';
import { ToggleField, MaskedField, NumberField, TextField, ListField, JsonField, GroupField, SelectField } from './fields';
import { getHint } from '../../config/config-hints';

// Types
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

type ConfigSectionRendererProps = {
    sectionId: string;
    schema: JsonSchema;
    data: any;
    onUpdate: (path: string, value: any) => void;
};

const SECRET_KEYWORDS = [
    'apikey', 'api_key', 'token', 'password', 'secret', 'auth', 'privatekey', 'signingsecret',
    'webhooktoken', 'accesstoken', 'authtoken', 'imappass', 'smtppass', 'apppassword'
];

// Helper functions
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

function valueForSchema(value: unknown, schema: JsonSchema): unknown {
    if (value !== undefined) return value;
    if (schema.default !== undefined) return schema.default;
    return defaultValue(schema);
}

function isSensitive(path: Array<string | number>, schema: JsonSchema): boolean {
    const tokens = [...path.map((segment) => String(segment).toLowerCase())];
    if (schema.title) tokens.push(schema.title.toLowerCase());
    return tokens.some((token) => SECRET_KEYWORDS.some((kw) => token.includes(kw)));
}

function pathKey(path: Array<string | number>): string {
    return path.map((segment) => String(segment)).join('.');
}

// Main Component
export default function ConfigSectionRenderer({ sectionId, schema, data, onUpdate }: ConfigSectionRendererProps) {
    const [activeTab, setActiveTab] = useState('All');

    // PowerDirector promotes all top-level properties to tabs in the sub-navigation.
    const { tabs } = useMemo(() => {
        const props = schema.properties || {};
        const tabs: string[] = ['All'];

        // PowerDirector sorts tabs alphabetically by property KEY
        const sortedKeys = Object.keys(props).sort();

        sortedKeys.forEach((key) => {
            tabs.push(key);
        });

        return { tabs };
    }, [schema]);

    // Ensure active tab exists
    useEffect(() => {
        if (!tabs.includes(activeTab)) {
            setActiveTab('All');
        }
    }, [tabs, activeTab]);

    const renderTabContent = () => {
        // Special Case: Top-level Array (e.g. Bindings)
        if (schemaType(schema) === 'array' && schema.items) {
            const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
            return (
                <div className="py-4">
                    <ComplexArrayField
                        itemsSchema={itemsSchema}
                        value={(data as any[]) || []}
                        path={[sectionId]} // Root path with sectionId
                        onUpdate={onUpdate}
                    />
                </div>
            );
        }

        if (activeTab === 'All') {
            const allKeys = Object.keys(schema.properties || {});
            if (allKeys.length === 0) {
                return (
                    <div className="py-8 text-center opacity-50 italic">
                        No settings in this section.
                    </div>
                );
            }
            return (
                <div className="space-y-6">
                    {allKeys.map(key => {
                        const fieldSchema = schema.properties![key];
                        return (
                            <React.Fragment key={key}>
                                {renderNode(fieldSchema, data?.[key], [sectionId, key], onUpdate, true, true)}
                            </React.Fragment>
                        );
                    })}
                </div>
            );
        }

        // Render Subsection Tab
        const subSchema = schema.properties![activeTab];
        const type = schemaType(subSchema);
        const subData = data?.[activeTab] ?? (type === 'array' ? [] : type === 'object' ? {} : undefined);

        // Unwrap properties for cleaner tab view if it's a standard object
        if (schemaType(subSchema) === 'object' && subSchema.properties) {
            // Handle additionalProperties (Mix of defined props + custom map)
            const hasAdditional = !!subSchema.additionalProperties;

            return (
                <div className="space-y-4">
                    {/* Standard Properties */}
                    <div className="space-y-1">
                        {Object.keys(subSchema.properties).map(key => {
                            const fieldSchema = subSchema.properties![key];
                            return (
                                <React.Fragment key={key}>
                                    {renderNode(fieldSchema, subData?.[key], [sectionId, activeTab, key], onUpdate, true, true)}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Additional Properties (Map) */}
                    {hasAdditional && (
                        <div className="mt-4 pt-4 border-t border-gray-700/30">
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--pd-text-muted)' }}>Additional Entries</h4>
                            <ComplexMapField
                                schema={subSchema.additionalProperties as JsonSchema}
                                value={subData}
                                path={[sectionId, activeTab]}
                                reservedKeys={new Set(Object.keys(subSchema.properties))}
                                onUpdate={onUpdate}
                            />
                        </div>
                    )}
                </div>
            );
        }

        return renderNode(subSchema, subData, [sectionId, activeTab], onUpdate, true);
    };

    return (
        <div className="flex flex-col bg-transparent relative">
            {/* Tabs Header - Only show if we have multiple tabs */}
            {tabs.length > 1 && (
                <div
                    className="flex items-center gap-1 mb-6 border-b overflow-x-auto flex-nowrap whitespace-nowrap pb-1 scrollbar-thin sticky top-0 z-10 pt-2"
                    style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-main)' }}
                >
                    {tabs.map(tab => {
                        const hint = tab === 'All' ? undefined : getHint([sectionId, tab], 'label');
                        const label = hint || schema.properties?.[tab]?.title || humanize(tab);
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent hover:border-gray-700'
                                    }`}
                                style={{ color: isActive ? 'var(--pd-accent)' : 'var(--pd-text-muted)' }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Tab Content */}
            <div className="pb-20">
                {renderTabContent()}
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────
// Render Node Logic (Recursive)
// ─────────────────────────────────────────────────────────────

function renderNode(
    schema: JsonSchema,
    value: unknown,
    path: Array<string | number>,
    update: (path: string, value: any) => void,
    showLabel: boolean,
    defaultOpen: boolean = false
): React.ReactNode {
    if (!schema) return null;

    const patch = (p: Array<string | number>, v: any) => {
        // Strip the sectionId (p[0]) before calling update
        const relativePath = p.slice(1).map(String).join('.');
        update(relativePath, v);
    };
    const type = schemaType(schema);

    // Resolve Hints
    const hintLabel = getHint(path.map(String), 'label');
    const hintHelp = getHint(path.map(String), 'help');

    const label = hintLabel || schema.title || humanize(String(path[path.length - 1]));
    const description = hintHelp || schema.description;

    // Union / Enum logic
    if (schema.enum && schema.enum.length > 0) {
        const options = schema.enum.map(v => ({ value: String(v), label: String(v) }));
        return <SelectField label={label} description={description} value={String(value ?? schema.default ?? '')} options={options} onChange={(v) => patch(path, v)} />;
    }

    // OneOf / AnyOf (Simplified)
    if (schema.oneOf || schema.anyOf) {
        const variants = schema.oneOf || schema.anyOf || [];
        const nonNull = variants.filter(v => schemaType(v) !== 'null');

        if (nonNull.length === 1) {
            return renderNode(nonNull[0], value, path, update, showLabel);
        }

        // 1. Check for Boolean + Enum pattern (e.g. commands.native: boolean | 'auto')
        const hasBoolean = nonNull.some(v => schemaType(v) === 'boolean');
        const enumVariants = nonNull.flatMap(v => v.const !== undefined ? [v.const] : (v.enum || []));

        if (hasBoolean && enumVariants.length > 0) {
            // Filter out 'true'/'false' from enumVariants to avoid duplicates
            const filteredEnumVariants = enumVariants.filter(v =>
                String(v) !== 'true' && String(v) !== 'false'
            );

            // Merge into a single Select
            const options = [
                { value: 'true', label: 'True' },
                { value: 'false', label: 'False' },
                ...filteredEnumVariants.map(v => ({ value: String(v), label: humanize(String(v)) }))
            ];
            return <SelectField label={label} description={description} value={String(value ?? schema.default ?? '')} options={options} onChange={(v) => {
                if (v === 'true') patch(path, true);
                else if (v === 'false') patch(path, false);
                else patch(path, v);
            }} />;
        }

        // 2. Check for Literals only
        const literals = nonNull.map(v => v.const ?? (v.enum && v.enum[0]));
        if (literals.every(v => v !== undefined)) {
            const options = literals.map(v => ({ value: String(v), label: String(v) }));
            return <SelectField label={label} description={description} value={String(value ?? schema.default ?? '')} options={options} onChange={(v) => patch(path, v)} />;
        }

        // 3. Check for Object vs Array (Prefer Object for configuration)
        // e.g. capabilities: string[] | { inlineButtons: ... }
        const objectVariant = nonNull.find(v => schemaType(v) === 'object' && v.properties);
        const arrayVariant = nonNull.find(v => schemaType(v) === 'array');

        // If current value is an array, we might want to stay in array mode, OR migrate?
        // If value is null/undefined, prefer object if available as it provides more settings.
        if (objectVariant) {
            // TODO: Add a UI switcher if both are valid?
            // For now, if value is NOT an array, render the object form.
            if (!Array.isArray(value)) {
                return renderNode(objectVariant, value, path, update, showLabel, defaultOpen);
            }
        }

        // 4. Catch-all: If it's a union of simple types (e.g. string | number), render as Text Field
        // This is common for "100" vs "100mb" or IDs.
        const allSimple = nonNull.every(v => ['string', 'number', 'integer'].includes(schemaType(v) || ''));
        if (allSimple) {
            const resolved = String(value ?? schema.default ?? '');
            if (isSensitive(path, schema)) {
                return <MaskedField label={label} description={description} value={resolved} onChange={(v) => patch(path, v)} />;
            }
            return <TextField label={label} description={description} value={resolved} onChange={(v) => patch(path, v)} />;
        }
    }

    // Simple types
    if (type === 'boolean') {
        const resolved = Boolean(valueForSchema(value, schema));
        return <ToggleField label={label} description={description} value={resolved} onChange={(v) => patch(path, v)} />;
    }

    if (type === 'string') {
        const resolved = String(valueForSchema(value, schema));
        if (isSensitive(path, schema)) {
            return <MaskedField label={label} description={description} value={resolved} onChange={(v) => patch(path, v)} />;
        }
        return <TextField label={label} description={description} value={resolved} multiline={resolved.length > 60} onChange={(v) => patch(path, v)} />;
    }

    if (type === 'number' || type === 'integer') {
        const rawValue =
            value !== undefined
                ? value
                : schema.default !== undefined
                    ? schema.default
                    : undefined;
        const resolved =
            typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : undefined;
        return <NumberField label={label} description={description} value={resolved} onChange={(v) => patch(path, v)} />;
    }

    if (type === 'array') {
        const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
        if (itemsSchema && schemaType(itemsSchema) === 'string') {
            const list = Array.isArray(value) ? value : [];
            return <ListField label={label} description={description} value={list} onChange={(v) => patch(path, v)} />;
        }

        // Check for Union of simple types (e.g. string | number) -> Render as ListField
        if (itemsSchema && (itemsSchema.oneOf || itemsSchema.anyOf)) {
            const variants = itemsSchema.oneOf || itemsSchema.anyOf || [];
            const nonNull = variants.filter(v => schemaType(v) !== 'null');
            const allSimple = nonNull.every(v => ['string', 'number', 'integer', 'boolean'].includes(schemaType(v) || ''));

            if (allSimple) {
                // Map all values to strings for the ListField
                const list = Array.isArray(value) ? value.map(String) : [];
                return <ListField label={label} description={description} value={list} onChange={(v) => patch(path, v)} />;
            }
        }

        // Complex array (Objects, etc) - Render as List of Cards
        if (itemsSchema && schemaType(itemsSchema) === 'object') {
            return (
                <div className="py-2">
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</div>
                    {description && <div className="text-xs mb-2 opacity-70" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
                    <ComplexArrayField
                        itemsSchema={itemsSchema}
                        value={(value as any[]) || []}
                        path={path}
                        onUpdate={update}
                    />
                </div>
            );
        }

        return <JsonField label={label} description={description} value={value} onChange={(v) => patch(path, v)} />;
    }

    // Object Handling
    if (type === 'object') {
        const hasAdditional = !!schema.additionalProperties;
        const hasProperties = !!schema.properties && Object.keys(schema.properties).length > 0;

        // PURELY a Map
        if (!hasProperties && hasAdditional) {
            return (
                <div className="py-2">
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</div>
                    {description && <div className="text-xs mb-2 opacity-70" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
                    <ComplexMapField
                        schema={schema.additionalProperties as JsonSchema}
                        value={(value as Record<string, any>) || {}}
                        path={path}
                        reservedKeys={new Set()}
                        onUpdate={update}
                    />
                </div>
            );
        }

        // Standard properties (Wrapped in Group)
        if (hasProperties) {
            const isPluginEntry = path.length === 3 && path[0] === 'plugins' && path[1] === 'entries';
            const shouldBeOpen = defaultOpen || isPluginEntry;

            return (
                <GroupField label={label} description={description} defaultOpen={shouldBeOpen}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            {Object.keys(schema.properties!).map(k => {
                                if (k === 'models' && (value as any)?.retrieveLocalModels) {
                                    return (
                                        <div key={k} className="py-2 px-3 mb-2 rounded border border-dashed opacity-50 bg-[var(--pd-surface-panel)]" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-xs font-semibold" style={{ color: 'var(--pd-text-muted)' }}>Models List</div>
                                            <div className="text-[10px] italic mt-1">Automatically managed by "Retrieve Local Models"</div>
                                        </div>
                                    );
                                }
                                return (
                                    <React.Fragment key={k}>
                                        {renderNode(schema.properties![k], (value as any)?.[k], [...path, k], update, true, false)}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        {hasAdditional && (
                            <div className="pt-2 border-t border-gray-700/30">
                                <div className="text-xs font-semibold mb-2 opacity-70" style={{ color: 'var(--pd-text-muted)' }}>Additional Entries</div>
                                <ComplexMapField
                                    schema={schema.additionalProperties as JsonSchema}
                                    value={(value as Record<string, any>) || {}}
                                    path={path}
                                    reservedKeys={new Set(Object.keys(schema.properties!))}
                                    onUpdate={update}
                                />
                            </div>
                        )}
                    </div>
                </GroupField>
            );
        }

        if (!hasProperties && !hasAdditional) {
            return null;
        }
    }

    return <JsonField label={label} description={description} value={value} onChange={(v) => patch(path, v)} />;
}

// ─────────────────────────────────────────────────────────────
// Array Component
// ─────────────────────────────────────────────────────────────

function ComplexArrayField({ itemsSchema, value, path, onUpdate }: {
    itemsSchema: JsonSchema;
    value: any[];
    path: Array<string | number>;
    onUpdate: (path: string, value: any) => void;
}) {
    // No local state needed for new item creation if it's just "Add Default"
    // But we might want to ensure we add a valid default object.

    const addItem = () => {
        const next = Array.isArray(value) ? [...value] : [];
        next.push(defaultValue(itemsSchema));
        const relativePath = path.slice(1).map(String).join('.');
        onUpdate(relativePath, next);
    };

    const removeItem = (index: number) => {
        const next = Array.isArray(value) ? [...value] : [];
        next.splice(index, 1);
        const relativePath = path.slice(1).map(String).join('.');
        onUpdate(relativePath, next);
    };

    const items = Array.isArray(value) ? value : [];

    return (
        <div className="space-y-3">
            {/* Header / Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{items.length} items</span>
            </div>

            {/* Existing Items */}
            {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 group relative" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700/30">
                        <div className="font-mono text-sm font-bold opacity-60">#{index + 1}</div>
                        <button
                            onClick={() => removeItem(index)}
                            className="text-red-400 opacity-60 hover:opacity-100 transition-opacity text-xs uppercase font-bold px-2"
                        >
                            Remove
                        </button>
                    </div>
                    {/* Recursively render the item! */}
                    <div className="pl-0">
                        {renderNode(itemsSchema, item, [...path, index], onUpdate, false)}
                    </div>
                </div>
            ))}

            {/* Add Button */}
            <button
                onClick={addItem}
                className="w-full py-2 border-2 border-dashed border-gray-700/50 rounded-lg text-gray-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
                <span className="text-lg leading-none">+</span> Add Item
            </button>
        </div>
    );
}

function ComplexMapField({ schema, value, path, reservedKeys, onUpdate }: {
    schema: JsonSchema;
    value: Record<string, any>;
    path: Array<string | number>;
    reservedKeys: Set<string>;
    onUpdate: (path: string, value: any) => void;
}) {
    // We maintain local state for new key input
    const [newKey, setNewKey] = useState('');

    // Sort keys: reserved ones are hidden, only show custom ones that aren't reserved? 
    // Actually, reservedKeys are strictly for top-level props, so anything in `value` that isn't in reservedKeys is a Map entry.
    const entries = Object.entries(value || {}).filter(([k]) => !reservedKeys.has(k));

    const addEntry = () => {
        const k = newKey.trim();
        if (!k) return;
        if (reservedKeys.has(k) || (value && k in value)) return;

        const next = { ...value };
        next[k] = defaultValue(schema);
        const relativePath = path.slice(1).map(String).join('.');
        onUpdate(relativePath, next);
        setNewKey('');
    };

    const removeEntry = (key: string) => {
        const next = { ...value };
        delete next[key];
        const relativePath = path.slice(1).map(String).join('.');
        onUpdate(relativePath, next);
    };

    // If the schema for the value is simple (string/number), use a compact row.
    // However, for consistency and robustness, let's use a card-like style for everything.
    // It handles complex objects (like Auth Profiles) perfectly.

    return (
        <div className="space-y-3">
            {/* Existing Entries */}
            {entries.map(([key, itemValue]) => (
                <div key={key} className="rounded-lg border p-3 group relative" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-sm font-bold truncate pr-8" style={{ color: 'var(--pd-accent)' }}>{key}</div>
                        <button
                            onClick={() => removeEntry(key)}
                            className="absolute top-2 right-2 text-red-400 opacity-60 hover:opacity-100 transition-opacity text-xs uppercase font-bold px-2 py-1"
                        >
                            Remove
                        </button>
                    </div>
                    {/* Recursively render the value! We pass showLabel=false typically for array/map items if they are simple, 
                        but here they might be objects. Passing false for showLabel to avoid redundancy. */}
                    <div className="pl-0">
                        {renderNode(schema, itemValue, [...path, key], onUpdate, false)}
                    </div>
                </div>
            ))}

            {/* Add New Entry Row */}
            <div className="flex gap-2 items-center mt-2 p-2 rounded-lg border border-dashed border-gray-700/50">
                <div className="text-xs text-gray-500 font-mono">New:</div>
                <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Key..."
                    className="rounded px-2 py-1 text-sm flex-1 bg-transparent border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                    style={{ color: 'var(--pd-text-main)' }}
                    onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                />
                <button
                    onClick={addEntry}
                    disabled={!newKey.trim()}
                    className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm rounded transition-colors font-medium"
                >
                    Add
                </button>
            </div>
        </div>
    );
}
