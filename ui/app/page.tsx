'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatInterface from './components/ChatInterface';
// Dynamically import TerminalInterface to avoid SSR issues with xterm.js
const TerminalInterface = dynamic(() => import('./components/TerminalInterface'), {
  ssr: false,
});
import Dialog from './components/Dialog';

interface UiSettings {
  maxSidebarChats: number;
  chatTabs: boolean;
  maxChatTabs: number;
}

interface ChatTab {
  id: string;
  name: string;
}

import { useSidebar } from './components/SidebarContext';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSessionId = searchParams.get('session') || undefined;
  const { sessions, deletedSessionId } = useSidebar();

  const [openTabs, setOpenTabs] = useState<ChatTab[]>([]);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState<UiSettings>({
    maxSidebarChats: 5,
    chatTabs: false,
    maxChatTabs: 5,
  });

  // Fetch UI settings and check if setup is needed on mount
  useEffect(() => {
    fetch('/api/config/ui')
      .then(r => r.json())
      .then(resp => {
        const d = resp?.data;
        if (d && !resp.error) {
          setUiSettings({
            maxSidebarChats: d.maxSidebarChats ?? 5,
            chatTabs: d.chatTabs ?? false,
            maxChatTabs: d.maxChatTabs ?? 5,
          });
        }
      })
      .catch(() => { });

    // Check if wizard needs to run
    fetch('/api/config/wizard')
      .then(r => r.json())
      .then(resp => {
        const lastRunAt = resp?.data?.lastRunAt;
        if (!lastRunAt) {
          // If the skip flag is set in localStorage, don't force redirect
          if (typeof window !== 'undefined' && !window.localStorage.getItem('pd:setup-skipped')) {
            router.push('/setup');
          }
        }
      })
      .catch(() => { });
  }, [router]);

  // Sync open tabs with active session and context sessions
  useEffect(() => {
    if (activeSessionId && uiSettings.chatTabs) {

      // Strict Check for Terminal Limits BEFORE state update
      // Note: We access openTabs state via the setter callback to avoid dependency loop

      setOpenTabs(prev => {
        // Check terminal limit inside the setter to get fresh state safely
        if (activeSessionId.startsWith('terminal-')) {
          const isExisting = prev.some(t => t.id === activeSessionId);
          const currentTerminals = prev.filter(t => t.id.startsWith('terminal-')).length;

          if (!isExisting && currentTerminals >= 5) {
            // We can't cancel the state update easily here, but we can return prev
            // And trigger the dialog via a separate effect or direct set?
            // Actually, calling setIsLimitDialogOpen inside setState callback is "safe" enough usually,
            // but strictly speaking side-effects should be outside.
            // However, to fix the loop, we MUST NOT depend on openTabs.

            // Let's postpone the dialog open to a separate useEffect?
            // Or just cheat and schedule it.
            setTimeout(() => setIsLimitDialogOpen(true), 0);
            return prev;
          }
        }

        // 1. Check if we already have this tab
        const existingIndex = prev.findIndex(t => t.id === activeSessionId);

        // 2. Resolve name
        let resolvedName = 'Chat';
        let contextSession: { name: string } | undefined;

        if (activeSessionId.startsWith('terminal-')) {
          resolvedName = 'Terminal';
        } else {
          contextSession = sessions.find(s => s.id === activeSessionId);
          resolvedName = contextSession?.name
            || (existingIndex !== -1 ? prev[existingIndex].name : 'Chat');
        }

        // 3. Construct new tabs array
        let newTabs = [...prev];

        if (existingIndex !== -1) {
          // Update existing tab name if it changed in context
          if (!activeSessionId.startsWith('terminal-') && contextSession && newTabs[existingIndex].name !== contextSession.name) {
            newTabs[existingIndex] = { ...newTabs[existingIndex], name: contextSession.name };
          } else {
            // If nothing changed, return prev to avoid re-render
            // But we need to be careful. React strict mode runs twice.
            // If array content is identical, return prev.
            if (newTabs.length === prev.length && newTabs[existingIndex].name === prev[existingIndex].name) {
              return prev;
            }
          }
        } else {
          // Add new tab
          newTabs.push({ id: activeSessionId, name: resolvedName });
        }

        // 4. Enforce Limits (Total Tabs only, Terminal limit is strict check above)
        if (newTabs.length > uiSettings.maxChatTabs) {
          newTabs = newTabs.slice(-uiSettings.maxChatTabs);
        }

        // Deep comparison to avoid unnecessary updates if possible? 
        // For now, length check + reference check above helps.
        return newTabs;
      });

      // Fallback: Fetch session name if not in context
      const inContext = sessions.some(s => s.id === activeSessionId);
      if (!inContext && !activeSessionId.startsWith('terminal-')) {
        fetch(`/api/sessions/${activeSessionId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.name) {
              setOpenTabs(current =>
                current.map(t => t.id === activeSessionId ? { ...t, name: data.name } : t)
              );
            }
          })
          .catch(() => { });
      }
    }
  }, [activeSessionId, uiSettings.chatTabs, uiSettings.maxChatTabs, sessions]); // openTabs removed!

  useEffect(() => {
    if (!activeSessionId || !activeSessionId.startsWith('terminal-')) return;
    try {
      window.localStorage.setItem('pd:last-terminal-session-id', activeSessionId);
    } catch {
      // Ignore storage failures.
    }
  }, [activeSessionId]);

  // If the user deletes a chat session from the sidebar, ensure any open tab for it is closed.
  useEffect(() => {
    if (!uiSettings.chatTabs) return;
    if (!deletedSessionId) return;

    const deletedId = String(deletedSessionId).split(':')[0];
    if (!deletedId) return;

    setOpenTabs(prev => {
      if (!prev.some(t => t.id === deletedId)) return prev;

      const next = prev.filter(t => t.id !== deletedId);

      if (activeSessionId === deletedId) {
        setTimeout(() => {
          if (next.length > 0) router.push(`/?session=${next[next.length - 1].id}`);
          else router.push('/');
        }, 0);
      }

      return next;
    });
  }, [deletedSessionId, uiSettings.chatTabs, activeSessionId, router]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabId.startsWith('terminal-')) {
      try {
        const last = window.localStorage.getItem('pd:last-terminal-session-id');
        if (last === tabId) {
          window.localStorage.removeItem('pd:last-terminal-session-id');
        }
      } catch {
        // Ignore storage failures.
      }

      void fetch(`/api/terminal/sessions/${encodeURIComponent(tabId)}`, {
        method: 'DELETE'
      }).catch(() => { });
    }

    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      // If we closed the active tab, switch to the last one
      if (tabId === activeSessionId) {
        // Defer navigation to next tick to avoid "setState during render" error
        setTimeout(() => {
          if (next.length > 0) {
            router.push(`/?session=${next[next.length - 1].id}`);
          } else {
            router.push('/');
          }
        }, 0);
      }
      return next;
    });
  }, [activeSessionId, router]);

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: "var(--pd-surface-main)", color: "var(--pd-text-main)" }}
    >
      <main className="flex-1 h-full min-w-0 flex flex-col">
        {/* Tab Bar */}
        {uiSettings.chatTabs && openTabs.length > 0 && (
          <div
            className="flex items-center border-b shrink-0 overflow-x-auto"
            style={{
              background: 'var(--pd-surface-sidebar)',
              borderColor: 'var(--pd-border)',
            }}
          >
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer border-r shrink-0 transition-colors ${tab.id === activeSessionId ? 'font-semibold' : ''
                  }`}
                style={{
                  background: tab.id === activeSessionId ? 'var(--pd-surface-main)' : 'transparent',
                  borderColor: 'var(--pd-border)',
                  color: tab.id === activeSessionId ? 'var(--pd-text-main)' : 'var(--pd-text-muted)',
                  borderBottom: tab.id === activeSessionId ? '2px solid var(--pd-accent)' : '2px solid transparent'
                }}
                onClick={() => router.push(`/?session=${tab.id}`)}
              >
                <span className="truncate max-w-[120px]">{tab.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                  className="ml-1 text-xs opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Close tab"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative">

          {/* 1. Terminal Instances */}
          {uiSettings.chatTabs ? openTabs.filter(t => t.id.startsWith('terminal-')).map(t => (
            <div
              key={t.id}
              className="absolute inset-0 bg-[#1e1e1e]"
              style={{
                visibility: t.id === activeSessionId ? 'visible' : 'hidden',
                zIndex: t.id === activeSessionId ? 10 : 0
              }}
            >
              <TerminalInterface sessionId={t.id} />
            </div>
          )) : (activeSessionId && activeSessionId.startsWith('terminal-') && (
            <div className="absolute inset-0 bg-[#1e1e1e]" style={{ zIndex: 10 }}>
              <TerminalInterface sessionId={activeSessionId} />
            </div>
          ))}

          {/* 2. Chat Instances */}
          {uiSettings.chatTabs ? openTabs.filter(t => !t.id.startsWith('terminal-')).map(t => (
            <div
              key={t.id}
              className="absolute inset-0"
              style={{
                visibility: t.id === activeSessionId ? 'visible' : 'hidden',
                zIndex: t.id === activeSessionId ? 10 : 0
              }}
            >
              <ChatInterface
                sessionId={t.id}
                sidebarCollapsed={false}
                onToggleFullscreen={() => { }}
              />
            </div>
          )) : (activeSessionId && !activeSessionId.startsWith('terminal-') && (
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
              <ChatInterface
                sessionId={activeSessionId}
                sidebarCollapsed={false}
                onToggleFullscreen={() => { }}
              />
            </div>
          ))}

          {/* 3. Empty State */}
          {!activeSessionId && (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--pd-text-muted)" }}>
              Select or create a chat to start.
            </div>
          )}
        </div>
      </main>

      <Dialog
        isOpen={isLimitDialogOpen}
        type="alert"
        title="Limit Reached"
        message="A maximum of 5 Terminals can be open concurrently."
        onConfirm={() => {
          setIsLimitDialogOpen(false);
          // Navigate back to last safe tab or home
          const lastTab = openTabs[openTabs.length - 1];
          if (lastTab) router.push(`/?session=${lastTab.id}`);
          else router.push('/');
        }}
        onCancel={() => {
          setIsLimitDialogOpen(false);
          const lastTab = openTabs[openTabs.length - 1];
          if (lastTab) router.push(`/?session=${lastTab.id}`);
          else router.push('/');
        }}
      />
    </div>
  );
}
