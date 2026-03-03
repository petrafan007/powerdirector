'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalInterfaceProps {
    port?: number;
    sessionId?: string;
}

export default function TerminalInterface({ port = 4008, sessionId }: TerminalInterfaceProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const resizeFrameRef = useRef<number | null>(null);
    const mountedRef = useRef(false);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const container = terminalRef.current;
        if (!container) return;
        mountedRef.current = true;
        let term: Terminal | null = null;
        let fitAddon: FitAddon | null = null;
        let ws: WebSocket | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let termDataDisposable: { dispose: () => void } | null = null;
        let handleResize: (() => void) | null = null;
        let handleClick: (() => void) | null = null;

        const canFit = () => {
            if (!mountedRef.current) return false;
            if (!container.isConnected || !term || !fitAddon) return false;
            if (container.clientWidth < 20 || container.clientHeight < 20) return false;
            const core = (term as any)?._core;
            return Boolean(core?._renderService?.dimensions);
        };

        const fitAndSync = () => {
            if (!canFit()) return;
            try {
                fitAddon!.fit();
            } catch (error) {
                // Avoid crashing on transient xterm refresh races during tab/layout changes.
                console.warn('Resize skipped:', error);
                return;
            }

            if (ws && ws.readyState === WebSocket.OPEN && term!.cols > 0 && term!.rows > 0) {
                ws.send(`resize:${term!.cols},${term!.rows}`);
            }
        };

        const scheduleFit = () => {
            if (resizeFrameRef.current !== null) {
                cancelAnimationFrame(resizeFrameRef.current);
            }
            resizeFrameRef.current = requestAnimationFrame(() => {
                resizeFrameRef.current = null;
                fitAndSync();
            });
        };

        const initialize = () => {
            if (!mountedRef.current || !container.isConnected) return;

            term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#1e1e1e',
                    foreground: '#ffffff',
                },
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 14,
                allowProposedApi: true,
            });

            fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.open(container);

            termRef.current = term;
            fitAddonRef.current = fitAddon;

            // Safety: wait a tick for DOM to settle before initial fit.
            scheduleFit();
            term.focus(); // Auto-focus

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const hostname = window.location.hostname;
            const isStandardPort = window.location.port === '' || window.location.port === '80' || window.location.port === '443';
            const query = new URLSearchParams();
            if (sessionId) {
                query.set('sessionId', sessionId);
            }
            const querySuffix = query.toString().length > 0 ? `?${query.toString()}` : '';
            const wsUrl = isStandardPort
                ? `${protocol}//${hostname}/terminal-ws${querySuffix}`
                : `${protocol}//${hostname}:${port}${querySuffix}`;

            console.log('Terminal connecting to:', wsUrl);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                term?.write('\r\n\x1b[32mConnected to terminal.\x1b[0m\r\n');
                // Resize after connection to ensure backend sync.
                scheduleFit();
            };

            ws.onclose = () => {
                setConnected(false);
                term?.write('\r\n\x1b[31mDisconnected from terminal.\x1b[0m\r\n');
            };

            ws.onmessage = (event) => {
                term?.write(event.data);
            };

            termDataDisposable = term.onData((data) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            handleClick = () => term?.focus();

            term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
                if (event.type !== 'keydown') return true;

                const key = event.key.toLowerCase();
                const mod = event.ctrlKey || event.metaKey;

                const fallbackCopy = (text: string): boolean => {
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.setAttribute('readonly', '');
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        const copied = document.execCommand('copy');
                        document.body.removeChild(ta);
                        return copied;
                    } catch {
                        return false;
                    }
                };

                // Cockpit parity: only Ctrl/Cmd+Shift+C copies from terminal selection.
                if (mod && event.shiftKey && key === 'c') {
                    if (event.repeat) return false;
                    event.preventDefault();
                    event.stopPropagation();
                    const selected = term?.getSelection();
                    if (selected) {
                        if (navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(selected).catch(() => {
                                fallbackCopy(selected);
                            });
                        } else {
                            fallbackCopy(selected);
                        }
                    }
                    return false;
                }

                // Cockpit parity: only Ctrl/Cmd+Shift+V pastes into terminal.
                if (mod && event.shiftKey && key === 'v') {
                    if (event.repeat) return false;
                    event.preventDefault();
                    event.stopPropagation();
                    if (navigator.clipboard?.readText) {
                        navigator.clipboard.readText()
                            .then((text) => {
                                if (text) term?.paste(text);
                            })
                            .catch(() => { });
                        return false;
                    }
                    return false;
                }

                return true;
            });

            container.addEventListener('click', handleClick);

            // Handle resize with safety checks
            handleResize = () => {
                scheduleFit();
            };
            window.addEventListener('resize', handleResize);

            // ResizeObserver for container changes
            resizeObserver = new ResizeObserver(() => {
                // Defer to animation frame to avoid ResizeObserver loops.
                scheduleFit();
            });
            resizeObserver.observe(container);
        };

        // Delay init to avoid strict-mode mount/unmount race conditions with xterm.
        const initTimer = window.setTimeout(initialize, 0);

        return () => {
            mountedRef.current = false;
            window.clearTimeout(initTimer);
            if (handleResize) window.removeEventListener('resize', handleResize);
            if (resizeFrameRef.current !== null) {
                cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = null;
            }
            resizeObserver?.disconnect();
            termDataDisposable?.dispose();
            if (handleClick) container.removeEventListener('click', handleClick);
            ws?.close();
            term?.dispose();
            setConnected(false);
            wsRef.current = null;
            termRef.current = null;
            fitAddonRef.current = null;
        };
    }, [port, sessionId]);

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e] overflow-hidden">
            <div className="flex-1 p-2 relative" ref={terminalRef} style={{ minHeight: 0 }} />
            {!connected && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-50">
                    Disconnected
                </div>
            )}
        </div>
    );
}
