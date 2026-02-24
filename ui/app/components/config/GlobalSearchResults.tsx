'use client';

import React from 'react';
import { useSettings } from '../../config/SettingsContext';
import { SECTION_GROUPS } from '../../config/definitions';
import ConfigSectionRenderer from './ConfigSectionRenderer';

export default function GlobalSearchResults() {
    const { searchQuery, fullSchema, config, updateConfig } = useSettings();

    if (!searchQuery) return null;

    const query = searchQuery.toLowerCase();
    const results: Array<{ section: string; sectionName: string; matches: React.ReactNode[] }> = [];

    // Helper to check if a schema node matches
    const matches = (key: string, schema: any) => {
        return (
            key.toLowerCase().includes(query) ||
            schema.title?.toLowerCase().includes(query) ||
            schema.description?.toLowerCase().includes(query)
        );
    };

    SECTION_GROUPS.forEach(group => {
        group.sections.forEach(section => {
            const schema = fullSchema[section.id];
            if (!schema || !schema.properties) return;

            const sectionMatches: React.ReactNode[] = [];
            const data = config?.[section.id] || {};

            // Check top-level properties
            Object.entries(schema.properties).forEach(([key, subSchema]: [string, any]) => {
                // If the key or title/description matches
                if (matches(key, subSchema)) {
                    // We render this field/subsection
                    // We can reuse ConfigSectionRenderer logic by creating a mini-schema
                    // Or just render a wrapper that uses ConfigSectionRenderer for this specific part?
                    // ConfigSectionRenderer expects a full section schema.
                    // Let's just use a modified version or render it manually.

                    // Actually, if it's a match, we probably want to link to it or show it.
                    // For now, let's just render it using a simplified renderNode (which we can import if we refactor, or duplicate).
                    // Since I didn't refactor, I'll just render a placeholder or simple field representation.
                    // Wait, the user wants to EDIT it.

                    // Better approach:
                    // If a specific field matches, render it.
                    // If a subsection matches, render the whole subsection (collapsed?).

                    sectionMatches.push(
                        <div key={`${section.id}-${key}`} className="border rounded-lg p-4 bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                {section.name} &gt; {subSchema.title || key}
                            </div>
                            {/* 
                                We don't have easy access to renderNode here without duplicating code.
                                Ideally we would import it. 
                                Let's just link to the section for now? 
                                No, requirements said "dynamically showing relevant fields".
                                
                                I can import ConfigSectionRenderer and pass a Filtered Schema?
                                Yes!
                             */}
                            <ConfigSectionRenderer
                                sectionId={section.id}
                                schema={{ ...schema, properties: { [key]: subSchema } }}
                                data={data}
                                onUpdate={(path, value) => updateConfig(`${section.id}.${key}`, value)}
                            />
                        </div>
                    );
                }
                // Deep search in nested objects?
                else if (subSchema.type === 'object' && subSchema.properties) {
                    // Check children
                    Object.entries(subSchema.properties).forEach(([childKey, childSchema]: [string, any]) => {
                        if (matches(childKey, childSchema)) {
                            // Render just this child
                            sectionMatches.push(
                                <div key={`${section.id}-${key}-${childKey}`} className="border rounded-lg p-4 bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                        {section.name} &gt; {subSchema.title || key} &gt; {childSchema.title || childKey}
                                    </div>
                                    {/* 
                                        To render just this child property properly, we need to pass the right path to updateConfig.
                                        path: section.id . key . childKey
                                     */}
                                    {/* 
                                         ConfigSectionRenderer expects a schema structure matching the data.
                                         If we pass a constructed schema { properties: { key: { properties: { childKey: ... } } } }
                                         ConfigSectionRenderer might render the parent structure (Tabs/Groups).
                                         That's acceptable.
                                      */}
                                    <ConfigSectionRenderer
                                        sectionId={section.id}
                                        schema={{
                                            ...schema,
                                            properties: {
                                                [key]: {
                                                    ...subSchema,
                                                    properties: { [childKey]: childSchema }
                                                }
                                            }
                                        }}
                                        data={data}
                                        onUpdate={(path, value) => {
                                            // The renderer will call update with path relative to what we passed.
                                            // But wait, ConfigSectionRenderer uses the keys from the schema we pass.
                                            // If we pass { properties: { agent: { properties: { name: ... } } } }
                                            // It sees "agent" as a Tab (object).
                                            // Inside "agent", it renders "name".
                                            // onUpdate will be called with path "agent.name".
                                            // So updateConfig(`${section.id}.${path}`, value) -> "agents.agent.name"
                                            // This looks correct!
                                            updateConfig(`${section.id}.${path}`, value);
                                        }}
                                    />
                                </div>
                            );
                        }
                    });
                }
            });

            if (sectionMatches.length > 0) {
                results.push({ section: section.id, sectionName: section.name, matches: sectionMatches });
            }
        });
    });

    if (results.length === 0) {
        return (
            <div className="text-center py-12 opacity-50">
                <div className="text-4xl mb-4">🔍</div>
                <p>No matching settings found for &quot;{searchQuery}&quot;</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32">
            <h2 className="text-xl font-bold px-1">Search Results for "{searchQuery}"</h2>
            {results.map(({ section, sectionName, matches }) => (
                <div key={section} className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400/80 px-1 border-b border-gray-200 dark:border-gray-800 pb-2">
                        {sectionName}
                    </h3>
                    <div className="grid gap-4">
                        {matches}
                    </div>
                </div>
            ))}
        </div>
    );
}
