'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import searchIndexData from './search-index.json';

interface SearchIndexEntry {
    title: string;
    section: string;
    path: string;
    rawPath: string;
    snippet: string;
}

export default function DocsSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchIndexEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const index = searchIndexData as SearchIndexEntry[];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const lowerQuery = query.toLowerCase();

        // Very basic scoring heuristic:
        // 1. Exact match in title gets highest priority
        // 2. Contains in title gets next priority
        // 3. Contains in raw path or snippet gets lowest priority

        const filtered = index.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.rawPath.toLowerCase().includes(lowerQuery) ||
            item.section.toLowerCase().includes(lowerQuery) ||
            item.snippet.toLowerCase().includes(lowerQuery)
        ).sort((a, b) => {
            const aTitleExact = a.title.toLowerCase() === lowerQuery ? 1 : 0;
            const bTitleExact = b.title.toLowerCase() === lowerQuery ? 1 : 0;
            if (aTitleExact !== bTitleExact) return bTitleExact - aTitleExact;

            const aTitleContains = a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
            const bTitleContains = b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
            if (aTitleContains !== bTitleContains) return bTitleContains - aTitleContains;

            return 0;
        }).slice(0, 10); // Limit to top 10 results for performance

        setResults(filtered);
        setIsOpen(true);
        setSelectedIndex(0);
    }, [query, index]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = results[selectedIndex];
            if (selected) {
                handleSelect(selected);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (item: SearchIndexEntry) => {
        setIsOpen(false);
        setQuery('');

        // Soft navigation with next/router and anchor jump
        router.push(item.path);

        // Give the page a tiny moment to render the newly routed component if it wasn't mounted, then scroll
        setTimeout(() => {
            const element = document.getElementById(item.rawPath);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add a temporary highlight effect
                element.classList.add('ring-2', 'ring-[var(--pd-blue-500)]', 'bg-[var(--pd-surface-hover)]');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-[var(--pd-blue-500)]', 'bg-[var(--pd-surface-hover)]');
                }, 2000);
            }
        }, 100);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-2xl mb-8 z-50">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-[var(--pd-text-muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-[var(--pd-border)] rounded-xl leading-5 bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)] placeholder-[var(--pd-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--pd-blue-500)] focus:border-[var(--pd-blue-500)] sm:text-sm transition-colors"
                    placeholder="Search documentation for settings, features, or paths... (e.g. 'discord token' or 'browser.enabled')"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute mt-1 w-full bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-xl shadow-lg max-h-96 overflow-y-auto">
                    <ul className="py-1">
                        {results.map((result, idx) => (
                            <li
                                key={result.rawPath}
                                className={`px-4 py-3 cursor-pointer ${idx === selectedIndex ? 'bg-[var(--pd-surface-hover)]' : 'hover:bg-[var(--pd-surface-hover)]'}`}
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-[var(--pd-text-main)]">{result.title}</span>
                                        <span className="text-xs text-[var(--pd-text-muted)] mt-0.5 truncate max-w-[400px]">
                                            {result.snippet.includes('MANUAL') ? 'View configuration details...' : result.snippet}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-mono bg-[var(--pd-surface-app)] border border-[var(--pd-border)] px-1.5 py-0.5 rounded text-[var(--pd-text-muted)]">
                                            {result.section}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isOpen && query.trim() !== '' && results.length === 0 && (
                <div className="absolute mt-1 w-full bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-xl shadow-lg p-4 text-center">
                    <p className="text-sm text-[var(--pd-text-muted)]">No documentation found for "{query}".</p>
                </div>
            )}
        </div>
    );
}
