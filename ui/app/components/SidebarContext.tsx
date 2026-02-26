'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Session {
    id: string;
    name: string;
    updatedAt: number;
    customInstructions?: string;
}

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggle: () => void;
    sessions: Session[];
    setSessions: (sessions: Session[]) => void;

    /**
     * Fired when a session is deleted from the sidebar.
     * Used by the chat tab system to close any open tab referencing the deleted session.
     */
    deletedSessionId: string | null;
    notifySessionDeleted: (sessionId: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);

    // Ephemeral "event" state.
    const [deletedSessionId, setDeletedSessionId] = useState<string | null>(null);

    const toggle = useCallback(() => {
        setCollapsed(prev => !prev);
    }, []);

    const notifySessionDeleted = useCallback((sessionId: string) => {
        const id = typeof sessionId === 'string' ? sessionId.trim() : '';
        if (!id) return;
        // Force change even if same id is deleted twice.
        setDeletedSessionId(`${id}:${Date.now()}`);
    }, []);

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle, sessions, setSessions, deletedSessionId, notifySessionDeleted }}>
            {children}
        </SidebarContext.Provider>
    );
}

export type { Session };

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
