'use client';

import { useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { useSettings } from './config/SettingsContext';
import { SidebarProvider, useSidebar } from './components/SidebarContext';

interface SidebarLayoutProps {
    children: React.ReactNode;
}

interface UiSettings {
    maxSidebarChats: number;
    chatTabs: boolean;
    maxChatTabs: number;
}

function SidebarLayoutContent({ children }: SidebarLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { config } = useSettings();
    const { collapsed, setCollapsed, toggle } = useSidebar();

    // Sync active session with URL
    const activeSessionId = searchParams.get('session') || undefined;

    // Sync theme with document root
    useEffect(() => {
        if (config?.ui?.theme) {
            document.documentElement.setAttribute('data-pd-theme', config.ui.theme);
        }
    }, [config?.ui?.theme]);

    const uiSettings = {
        maxSidebarChats: config?.ui?.maxSidebarChats ?? 5,
        chatTabs: config?.ui?.chatTabs ?? false,
        maxChatTabs: config?.ui?.maxChatTabs ?? 5,
    };

    const handleSelectSession = useCallback((id: string, name?: string) => {
        // Always push to URL, let layout re-render with new param
        router.push(`/?session=${id}`);
    }, [router]);

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden"
            style={{ background: "var(--pd-surface-main)", color: "var(--pd-text-main)" }}
        >
            <Topbar
                collapsed={collapsed}
                onToggleCollapse={toggle}
            />

            <div className="flex flex-1 overflow-hidden min-h-0">
                <Sidebar
                    currentSessionId={activeSessionId}
                    onSelectSession={handleSelectSession}
                    collapsed={collapsed}
                    onToggleCollapse={toggle}
                    maxChats={uiSettings.maxSidebarChats}
                />
                <main className="flex-1 h-full min-w-0 flex flex-col relative overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function SidebarLayoutWrapper({ children }: SidebarLayoutProps) {
    return (
        <SidebarProvider>
            <SidebarLayoutContent>{children}</SidebarLayoutContent>
        </SidebarProvider>
    );
}
