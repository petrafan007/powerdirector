import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Dialog from './Dialog';
import ChatSessionDialog from './ChatSessionDialog';
import { useSidebar, Session } from './SidebarContext';

interface SidebarProps {
    currentSessionId?: string;
    onSelectSession: (id: string, name?: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    maxChats?: number;
}

export default function Sidebar({ currentSessionId, onSelectSession, collapsed, onToggleCollapse, maxChats = 5 }: SidebarProps) {
    const { sessions, setSessions, notifySessionDeleted } = useSidebar();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
    const [showAllChats, setShowAllChats] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    // Collapse expanded session list when clicking outside the sidebar
    useEffect(() => {
        if (!showAllChats) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                setShowAllChats(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAllChats]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            const data = await res.json();
            setSessions(data);
        } catch {
            // Silently handle fetch errors
        }
    };

    const handleCreateSession = async (payload?: { name: string; customInstructions: string }) => {
        const name = payload?.name?.trim() || '';
        if (!name) return;
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    customInstructions: payload?.customInstructions || ''
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || `Failed to create session (${res.status})`);
            }
            const newSession = data;
            setIsPromptOpen(false);
            if (newSession && typeof newSession.id === 'string' && newSession.id) {
                setSessions([newSession as Session, ...sessions]);
                onSelectSession(newSession.id, newSession.name);
            } else {
                console.error('[Sidebar] Created session is malformed:', newSession);
            }
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    const handleRenameSession = async (payload?: { name: string; customInstructions: string }) => {
        const name = payload?.name?.trim() || '';
        if (!sessionToEdit || !name) {
            setIsRenameOpen(false);
            return;
        }

        try {
            const res = await fetch(`/api/sessions/${sessionToEdit.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    customInstructions: payload?.customInstructions || ''
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || `Failed to update session (${res.status})`);
            }
            setIsRenameOpen(false);
            fetchSessions();
        } catch (err) {
            console.error('Failed to update session:', err);
        }
    };

    const handleOpenTerminal = () => {
        const fallbackId = `terminal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        let terminalId = fallbackId;
        const isActiveTerminal = typeof currentSessionId === 'string' && currentSessionId.startsWith('terminal-');
        try {
            const saved = window.localStorage.getItem('pd:last-terminal-session-id');
            const hasSaved = typeof saved === 'string' && saved.startsWith('terminal-');
            // Resume last terminal by default (including after leaving / returning to chat).
            // If user is already on a terminal, clicking "Terminal" opens a fresh one.
            terminalId = isActiveTerminal ? fallbackId : (hasSaved ? saved : fallbackId);
            window.localStorage.setItem('pd:last-terminal-session-id', terminalId);
        } catch {
            terminalId = fallbackId;
        }

        onSelectSession(terminalId, 'Terminal');
    };

    const handleDeleteSession = async () => {
        if (!sessionToEdit) {
            setIsDeleteOpen(false);
            return;
        }

        try {
            await fetch(`/api/sessions/${sessionToEdit.id}`, {
                method: 'DELETE'
            });
            setIsDeleteOpen(false);
            setSessions(sessions.filter(s => s.id !== sessionToEdit.id));
            notifySessionDeleted(sessionToEdit.id);
            if (currentSessionId === sessionToEdit.id) {
                onSelectSession(''); // Clear current
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const visibleSessions = showAllChats ? sessions : sessions.slice(0, maxChats);
    const hasMore = sessions.length > maxChats;

    const isSkillsActive = pathname?.startsWith('/skills') || (pathname?.startsWith('/agents') && searchParams.get('tab') === 'skills');

    // Icons
    const HamburgerIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );

    const EditIcon = () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );

    const TrashIcon = () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );

    const AgentIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
    );

    const SettingsIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );

    const ChatIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );

    return (
        <>
            <ChatSessionDialog
                isOpen={isPromptOpen}
                title="New Chat"
                message="Create a chat session and optionally add session-specific custom instructions."
                namePlaceholder="Chat name..."
                confirmLabel="Create"
                onConfirm={handleCreateSession}
                onCancel={() => setIsPromptOpen(false)}
            />

            <ChatSessionDialog
                isOpen={isRenameOpen}
                title="Edit Chat"
                message="Update the chat name and optional custom instructions for this session."
                defaultName={sessionToEdit?.name}
                defaultCustomInstructions={sessionToEdit?.customInstructions || ''}
                confirmLabel="Save"
                onConfirm={handleRenameSession}
                onCancel={() => setIsRenameOpen(false)}
            />

            <Dialog
                isOpen={isDeleteOpen}
                type="confirm"
                title="Delete Chat"
                message={`Are you sure you want to delete "${sessionToEdit?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteSession}
                onCancel={() => setIsDeleteOpen(false)}
            />

            <div
                ref={sidebarRef}
                className="flex flex-col h-full border-r shrink-0 overflow-hidden"
                style={{
                    width: collapsed ? '48px' : 'var(--pd-sidebar-width)',
                    minWidth: collapsed ? '48px' : 'var(--pd-sidebar-width)',
                    background: 'var(--pd-surface-sidebar)',
                    borderColor: 'var(--pd-border)',
                    color: 'var(--pd-text-main)',
                    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Header removed — moved to Topbar */}

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col gap-1 scrollbar-thin">

                    {/* Chat Section */}
                    {!collapsed ? (
                        <>
                            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--pd-text-muted)' }}>Chat</span>
                                <button onClick={() => setIsPromptOpen(true)} className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold cursor-pointer transition-colors hover:opacity-80" style={{ background: 'var(--pd-accent)', color: '#fff' }} title="New chat">+</button>
                            </div>
                            <div className="mt-1 mx-2">
                                {visibleSessions.map((session: Session, index: number) => (
                                    <div key={session.id || `fallback-key-${index}`} className="group relative flex items-center">
                                        <button onClick={() => onSelectSession(session.id, session.name)} className={`flex-1 text-left px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer truncate mr-1 ${currentSessionId === session.id ? 'font-medium' : ''}`} style={{ background: currentSessionId === session.id ? 'var(--pd-surface-panel)' : 'transparent', color: currentSessionId === session.id ? 'var(--pd-text-main)' : 'var(--pd-text-muted)' }} title={session.name}>
                                            {session.name}
                                        </button>
                                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setSessionToEdit(session); setIsRenameOpen(true); }} className="p-1 rounded hover:bg-[var(--pd-button-hover)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)] transition-colors cursor-pointer" title="Rename chat"><EditIcon /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setSessionToEdit(session); setIsDeleteOpen(true); }} className="p-1 rounded hover:bg-[var(--pd-danger)]/20 text-[var(--pd-text-muted)] hover:text-[var(--pd-danger)] transition-colors cursor-pointer" title="Delete chat"><TrashIcon /></button>
                                        </div>
                                    </div>
                                ))}
                                {hasMore && (
                                    <button onClick={() => setShowAllChats(!showAllChats)} className="w-full text-left px-3 py-1 text-xs cursor-pointer transition-colors hover:opacity-80" style={{ color: 'var(--pd-accent)' }}>
                                        {showAllChats ? '▲ Show less' : `▼ Show more (${sessions.length - maxChats} more)`}
                                    </button>
                                )}
                                {sessions.length === 0 && (
                                    <div className="px-3 py-2 text-xs" style={{ color: 'var(--pd-text-muted)' }}>No chats yet — click + to start</div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 mt-2">
                            <button onClick={() => setIsPromptOpen(true)} className="p-2 rounded-lg transition-colors hover:bg-[var(--pd-surface-panel)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]" title="New Chat"><ChatIcon /></button>
                        </div>
                    )}

                    <div className="mx-3 my-2 border-t" style={{ borderColor: 'var(--pd-border)' }}></div>

                    {/* CONTROL GROUP */}
                    {!collapsed && <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--pd-text-muted)' }}>Control</div>}
                    <Link href="/overview" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname === '/overview' ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Overview">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        {!collapsed && <span className="text-sm">Overview</span>}
                    </Link>
                    <Link href="/instances" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/instances') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Instances">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        {!collapsed && <span className="text-sm">Instances</span>}
                    </Link>
                    <Link href="/channels" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/channels') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Channels">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
                        {!collapsed && <span className="text-sm">Channels</span>}
                    </Link>
                    <Link href="/sessions" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/sessions') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Sessions">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        {!collapsed && <span className="text-sm">Sessions</span>}
                    </Link>
                    <Link href="/cron" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/cron') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Cron Jobs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {!collapsed && <span className="text-sm">Cron Jobs</span>}
                    </Link>
                    <Link href="/usage" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/usage') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Usage">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"></path></svg>
                        {!collapsed && <span className="text-sm">Usage</span>}
                    </Link>
                    <button onClick={handleOpenTerminal} className={`flex items-center gap-3 w-full text-left mx-2 px-2 py-1.5 rounded-lg transition-colors ${currentSessionId?.startsWith('terminal') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Terminal">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        {!collapsed && <span className="text-sm">Terminal</span>}
                    </button>

                    {/* AGENT GROUP */}
                    {!collapsed && <div className="px-4 py-1 mt-2 text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--pd-text-muted)' }}>Agent</div>}
                    <Link href="/agents/main" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/agents') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Agents">
                        <AgentIcon />
                        {!collapsed && <span className="text-sm">Agents</span>}
                    </Link>
                    <Link href="/skills" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${isSkillsActive ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Skills">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        {!collapsed && <span className="text-sm">Skills</span>}
                    </Link>
                    <Link href="/nodes" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/nodes') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Nodes">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        {!collapsed && <span className="text-sm">Nodes</span>}
                    </Link>

                    {/* CONFIG GROUP */}
                    {!collapsed && <div className="px-4 py-1 mt-2 text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--pd-text-muted)' }}>Config</div>}
                    <Link href="/config" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/config') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Config">
                        <SettingsIcon />
                        {!collapsed && <span className="text-sm">Config</span>}
                    </Link>
                    <Link href="/debug" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/debug') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Debug">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"></path></svg>
                        {!collapsed && <span className="text-sm">Debug</span>}
                    </Link>
                    <Link href="/logs" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/logs') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Logs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        {!collapsed && <span className="text-sm">Logs</span>}
                    </Link>

                    {/* RESOURCES GROUP */}
                    {!collapsed && <div className="px-4 py-1 mt-2 text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--pd-text-muted)' }}>Resources</div>}
                    <Link href="/docs" className={`flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg transition-colors ${pathname?.startsWith('/docs') ? 'bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)]' : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'}`} title="Docs">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                        {!collapsed && <span className="text-sm">Docs</span>}
                    </Link>


                </div>

                {/* Footer — hidden when collapsed */}
                {!collapsed && (
                    <div className="p-3 border-t text-[10px] text-center shrink-0" style={{ borderColor: 'var(--pd-border)', color: 'var(--pd-text-muted)' }}>
                        PowerDirector v1.0.0-beta.2
                    </div>
                )}
            </div>
        </>
    );
}
