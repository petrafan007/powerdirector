import React from 'react';
import DocsSearch from './DocsSearch';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--pd-background)] text-[var(--pd-text-main)] overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto p-8 pt-12 pb-24">
                <DocsSearch />
                <main className="prose prose-invert prose-blue max-w-none mt-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
