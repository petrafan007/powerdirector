// AUTOMATICALLY GENERATED Documentation Component for ui
import React from 'react';

const UI_CONFIGS = [
    {
        path: 'ui.seamColor',
        label: 'Seam Color',
        type: 'string',
        description: 'Hardcoded HEX or RGB string (e.g. `#1A1A1A`) overriding the CSS structural borders globally across the Web Interface.'
    },
    {
        path: 'ui.assistant',
        label: 'Assistant',
        type: 'object',
        description: 'Frontend persona branding mappings. Changes how the AI visually presents itself across the chat dashboard.'
    },
    {
        path: 'ui.assistant.name',
        label: 'Name',
        type: 'string',
        description: 'The physical text string (e.g. `PowerDirector Bot` or `Alice`) rendered above every message the LLM generates in the UI.'
    },
    {
        path: 'ui.assistant.avatar',
        label: 'Avatar',
        type: 'string',
        description: 'Absolute URL or local relative path (e.g. `/assets/bot.png`) pointing to the circular profile picture representing the Agent.'
    },
    {
        path: 'ui.theme',
        label: 'Theme',
        type: 'string',
        description: 'Forces light mode, dark mode, or dynamic CSS media queries based on the end-user\'s OS settings.'
    },
    {
        path: 'ui.fontSize',
        label: 'Font Size',
        type: 'number',
        description: 'Base REM scale integer governing the typography hierarchy across the entire console.'
    },
    {
        path: 'ui.fontFamily',
        label: 'Font Family',
        type: 'string',
        description: 'Injects specific CSS font families (e.g. `Inter, Roboto, sans-serif`) natively into the React container.'
    },
    {
        path: 'ui.sidebarWidth',
        label: 'Sidebar Width',
        type: 'number',
        description: 'Hard mathematical pixel boundary width for the left-hand navigation and thread history panel.'
    },
    {
        path: 'ui.showTimestamps',
        label: 'Show Timestamps',
        type: 'boolean',
        description: 'Toggles rendering the grey `HH:MM AM/PM` badges adjacent to individual chat bubbles.'
    },
    {
        path: 'ui.showToolCalls',
        label: 'Show Tool Calls',
        type: 'boolean',
        description: 'If `true`, users visually see collapsible accordion boxes explicitly detailing what background tools (like `web_search` constraints) the LLM is using. If `false`, tools operate completely invisibly like magic.'
    },
    {
        path: 'ui.codeHighlighting',
        label: 'Code Highlighting',
        type: 'boolean',
        description: 'Activates the heavy `prism.js` or `highlight.js` client-side parsing libraries to syntactically color Python, JS, or Bash blocks natively output by the bot.'
    },
    {
        path: 'ui.markdownRendering',
        label: 'Markdown Rendering',
        type: 'boolean',
        description: 'Toggles parsing asterisks into **Bold** tags. Disabling this converts the chat window into raw unformatted text blocks.'
    },
    {
        path: 'ui.maxSidebarChats',
        label: 'Max Sidebar Chats',
        type: 'number',
        description: 'Limits the quantity of historical conversation threads fetched and rendered into the DOM, preventing massive infinite-scroll memory leaks.'
    },
    {
        path: 'ui.chatTabs',
        label: 'Chat Tabs',
        type: 'boolean',
        description: 'Enables power-user split-screen capabilities by permitting multiple conversation threads to open concurrently in internal browser tabs.'
    },
    {
        path: 'ui.maxChatTabs',
        label: 'Max Chat Tabs',
        type: 'number',
        description: 'Memory ceiling bounding how many active tabs a user can spawn simultaneously.'
    }
];

export default function UiConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Frontend Theming & Controls Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Visual parameters dictating exactly how the built-in React / Next.js web application renders the Agent dashboard natively. Adjust typography, branding, layouts, and DOM memory bounds.</p>
            </div>
            <div className="space-y-6">
                {UI_CONFIGS.map((config) => (
                    <div key={config.path} id={config.path} className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                        <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{config.label}</h3>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Path: <span className="text-[var(--pd-text-main)] font-semibold">{config.path}</span>
                            </span>
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Type: <span className="text-[var(--pd-text-main)] font-semibold">{config.type}</span>
                            </span>
                        </div>
                        <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                            <p>{config.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
