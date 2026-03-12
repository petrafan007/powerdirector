'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    validateAttachments,
    isImageFile,
    classifyFile,
    MAX_FILE_SIZE_BYTES,
    MAX_TOTAL_SIZE_BYTES,
    type AttachmentCategory,
} from '../../lib/model-capabilities';
import {
    createQueuedMessage,
    removeQueuedMessageById,
    type QueuedMessage,
} from '../../lib/chat-queue';
import { isRunProgressMessage, shouldClearThinkingIndicator } from '../../lib/chat-loading';
import {
    Bot, User, Paperclip, Send, X, FileText, Image as ImageIcon, Smile, Settings,
    Search, Trash2, ChevronDown, CheckCircle2, AlertCircle, Info, MoreHorizontal,
    Square, Layers, Brain, Terminal, ShieldAlert
} from 'lucide-react';
import { Message } from '../../../src/context/types';

interface ChatInterfaceProps {
    sessionId: string;
    agentId?: string;
    sidebarCollapsed?: boolean;
    onToggleFullscreen?: () => void;
}

interface UiRuntimeSettings {
    showTimestamps: boolean;
    showToolCalls: boolean;
    codeHighlighting: boolean;
    markdownRendering: boolean;
}

interface AttachedFile {
    id: string;
    file: File;
    name: string;
    size: number;
    category: AttachmentCategory;
    previewUrl?: string;       // data URL for image thumbnails
}

interface ProviderInfo {
    id: string;
    name: string;
    icon: string;
    models: string[];
    defaultModel: string;
    authed: boolean;
}

type ReasoningLevel = 'low' | 'medium' | 'high' | 'xhigh';

const DEFAULT_UI_SETTINGS: UiRuntimeSettings = {
    showTimestamps: true,
    showToolCalls: true,
    codeHighlighting: true,
    markdownRendering: true,
};
const DEFAULT_REASONING_LEVEL: ReasoningLevel = 'high';
const SESSION_REASONING_STORAGE_KEY = 'pd_session_reasoning_levels';

let _attachId = 0;
function nextAttachId(): string {
    return `attach-${Date.now()}-${++_attachId}`;
}

function normalizedText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function normalizeProviderId(value: unknown): string {
    const normalized = normalizedText(value).toLowerCase();
    if (!normalized) return '';
    if (normalized === 'codex-cli') return 'openai-codex';
    if (normalized === 'gemini-cli') return 'google-gemini-cli';
    return normalized;
}

function normalizeReasoningLevel(value: unknown): ReasoningLevel | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
        return normalized;
    }
    if (normalized === 'extra high' || normalized === 'extra-high' || normalized === 'extra_high') {
        return 'xhigh';
    }
    return undefined;
}

function parseProviderModel(value: unknown): { provider: string; model: string } {
    const normalized = normalizedText(value);
    if (!normalized) return { provider: '', model: '' };
    const slash = normalized.indexOf('/');
    if (slash === -1) {
        return { provider: '', model: normalized };
    }
    return {
        provider: normalizeProviderId(normalized.slice(0, slash)),
        model: normalized.slice(slash + 1).trim(),
    };
}

function normalizeTranscriptMessage(message: Message): Message {
    const metadata = message?.metadata && typeof message.metadata === 'object'
        ? { ...message.metadata }
        : message?.metadata;
    if (metadata?.aborted === true && message.role === 'assistant') {
        return {
            ...message,
            content: 'Execution stopped by user',
            metadata: {
                ...metadata,
                type: 'notification',
                status: 'aborted'
            }
        };
    }
    return message;
}

function getConfiguredCodexDefaultReasoning(config: any): ReasoningLevel | undefined {
    const providers = config?.models?.providers;
    if (!providers || typeof providers !== 'object') return undefined;
    for (const [providerId, providerConfig] of Object.entries(providers)) {
        if (normalizeProviderId(providerId) !== 'openai-codex') continue;
        return normalizeReasoningLevel((providerConfig as any)?.defaultReasoningEffort);
    }
    return undefined;
}

function getConfiguredCodexModelReasoning(config: any, provider: string, model: string): ReasoningLevel | undefined {
    if (provider !== 'openai-codex' || !model) return undefined;
    const entries = config?.agents?.defaults?.models;
    if (!entries || typeof entries !== 'object') return undefined;

    const target = `${provider}/${model}`.toLowerCase();
    for (const [rawKey, entry] of Object.entries(entries)) {
        const parsed = parseProviderModel(rawKey);
        if (!parsed.provider || !parsed.model) continue;
        if (`${parsed.provider}/${parsed.model}`.toLowerCase() !== target) continue;
        return normalizeReasoningLevel((entry as any)?.reasoningEffort);
    }
    return undefined;
}

function formatProviderModel(provider: unknown, model: unknown): string {
    const providerId = normalizeProviderId(provider);
    const modelName = normalizedText(model);
    if (providerId && modelName) return `${providerId}/${modelName}`;
    return modelName || providerId;
}

function isStructuredToolCallText(content: unknown): boolean {
    if (typeof content !== 'string') return false;
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
    try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
        const tool = (parsed as Record<string, unknown>).tool;
        return typeof tool === 'string' && tool.trim().length > 0;
    } catch {
        return false;
    }
}

import { useSidebar } from './SidebarContext';
import { useSettings } from '../config/SettingsContext';

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    sessionId,
    agentId,
    sidebarCollapsed,
    onToggleFullscreen
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [providerFailures, setProviderFailures] = useState<Array<{ provider?: string; code?: string; message: string }> | null>(null);
    const [ui, setUi] = useState<UiRuntimeSettings>(DEFAULT_UI_SETTINGS);
    const [agentName, setAgentName] = useState('System Agent');
    const endRef = useRef<HTMLDivElement>(null);

    // ── Attachments ──
    const [attachments, setAttachments] = useState<AttachedFile[]>([]);
    const [attachError, setAttachError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Provider / Model selection ──
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [selectedProvider, setSelectedProvider] = useState('default');
    const [selectedModel, setSelectedModel] = useState('default');
    const [providerModelMap, setProviderModelMap] = useState<Record<string, string>>({});
    const [selectedReasoning, setSelectedReasoning] = useState<ReasoningLevel>(DEFAULT_REASONING_LEVEL);
    const [sessionReasoningMap, setSessionReasoningMap] = useState<Record<string, ReasoningLevel>>({});
    const [selectedToolOutput, setSelectedToolOutput] = useState<{ title: string, content: string, plainText?: boolean } | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const isResizing = useRef(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 250 && newWidth < window.innerWidth * 0.8) {
            setSidebarWidth(newWidth);
        }
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }, [handleMouseMove]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    }, [handleMouseMove, stopResizing]);

    // ─── Queue & Abort ───
    const [queue, setQueue] = useState<QueuedMessage[]>([]);

    const activeRunIdRef = useRef<string | null>(null);
    const pausedRunIdRef = useRef<string | null>(null);
    const activeToolCallsRef = useRef<Map<string, Set<string>>>(new Map());
    const [paused, setPaused] = useState(false);

    // ─── Drag state ───
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    // ─── Queue Processing ───
    useEffect(() => {
        if (!loading && !paused && queue.length > 0) {
            const nextMessage = queue[0];
            setQueue(prev => prev.slice(1));
            sendMessage(nextMessage.text);
        }
    }, [loading, paused, queue]);

    // ─── Fetch history ───
    useEffect(() => {
        fetchHistory();
    }, [sessionId]);

    const { gatewayClient, config } = useSettings();

    // ─── Initial Load & Persistence ───
    useEffect(() => {
        fetchUiSettings();

        // Load saved state immediately
        const savedModels = JSON.parse(localStorage.getItem('pd_provider_models') || '{}');
        setProviderModelMap(savedModels);
        const savedReasoningBySession = JSON.parse(localStorage.getItem(SESSION_REASONING_STORAGE_KEY) || '{}');
        setSessionReasoningMap(savedReasoningBySession);

        fetchProviders().then((data) => {
            if (!data?.providers?.length) return;

            // Restore selection logic moved here to run after providers exist
            const savedProvider = localStorage.getItem('pd_selected_provider') || 'default';
            let initialProvider = 'default';

            if (data.providers.find((p: any) => p.id === savedProvider)) {
                initialProvider = savedProvider;
            }

            setSelectedProvider(initialProvider);

            if (initialProvider === 'default') {
                setSelectedModel('default');
            } else {
                const p = data.providers.find((prov: any) => prov.id === initialProvider);
                const savedModel = savedModels[initialProvider];

                // Strict check: model must exist in provider's list
                const initialModel = (savedModel && p?.models.includes(savedModel))
                    ? savedModel
                    : (p?.defaultModel || p?.models[0] || '');

                setSelectedModel(initialModel);
            }
        });
    }, []);

    const resolvedSelection = useMemo(() => {
        if (selectedProvider === 'default' || selectedModel === 'default') {
            return parseProviderModel(config?.agents?.defaults?.model?.primary);
        }
        return {
            provider: normalizeProviderId(selectedProvider),
            model: normalizedText(selectedModel),
        };
    }, [config, selectedModel, selectedProvider]);

    const configuredReasoningDefault = useMemo(() => {
        const byModel = getConfiguredCodexModelReasoning(
            config,
            resolvedSelection.provider,
            resolvedSelection.model,
        );
        return byModel || getConfiguredCodexDefaultReasoning(config) || DEFAULT_REASONING_LEVEL;
    }, [config, resolvedSelection.model, resolvedSelection.provider]);

    useEffect(() => {
        const savedForSession = sessionReasoningMap[sessionId];
        setSelectedReasoning(savedForSession || configuredReasoningDefault);
    }, [configuredReasoningDefault, sessionId, sessionReasoningMap]);

    // ─── Fetch Agent Identity ───
    useEffect(() => {
        const targetAgentId = agentId || 'main';
        const fetchUrl = agentId
            ? `/api/agent/identity?agentId=${encodeURIComponent(agentId)}`
            : `/api/agent/identity`;

        fetch(fetchUrl)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (data && typeof data.name === 'string') {
                    setAgentName(data.name);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch agent identity:', err);
                setAgentName('System Agent'); // Fallback on error
            });
    }, [agentId]);

    const fetchHistory = async () => {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (data.messages) {
            const normalizedDbMessages = (data.messages as Message[]).map((message) => normalizeTranscriptMessage(message));
            setMessages(prev => {
                if (activeRunIdRef.current) {
                    const dbMessages = normalizedDbMessages as any[];
                    const activeRunId = activeRunIdRef.current;

                    const merged = dbMessages.map(dbm => {
                        // If the DB says it's running/thinking for our active run,
                        // prefer the local UI state which is updated via fast SSE,
                        // otherwise we'll strip uncommitted chunks and cause flickering.
                        if (dbm.metadata?.runId === activeRunId && (dbm.metadata?.status === 'thinking' || dbm.metadata?.status === 'running')) {
                            const uiActive = prev.find(m =>
                                m.metadata?.turn === dbm.metadata?.turn &&
                                m.metadata?.runId === dbm.metadata?.runId &&
                                m.role === dbm.role &&
                                (m.metadata?.callId ? dbm.metadata?.callId === m.metadata?.callId : !dbm.metadata?.callId)
                            );
                            if (uiActive) return uiActive;
                        }
                        return dbm;
                    });

                    // Add purely local streaming chunks that haven't hit DB yet
                    // ALSO preserve completed tool outputs that haven't synced to DB yet
                    const purelyLocalMessages = prev.filter(m => {
                        if (m.metadata?.runId !== activeRunId) return false;

                        // Always keep tool outputs (callId set) that aren't in DB yet
                        if (m.metadata?.callId) {
                            const dbHasCall = dbMessages.some(dbm =>
                                dbm.metadata?.callId === m.metadata?.callId &&
                                dbm.metadata?.runId === m.metadata?.runId
                            );
                            // Keep if DB doesn't have this tool call yet
                            return !dbHasCall;
                        }

                        // For non-tool messages (thinking/running states)
                        if (m.metadata?.status === 'thinking' || m.metadata?.status === 'running') {
                            // Drop the local thinking message if the DB has ANY assistant message for this turn yet.
                            const dbHasTurn = dbMessages.some(dbm =>
                                dbm.metadata?.turn === m.metadata?.turn &&
                                dbm.metadata?.runId === m.metadata?.runId &&
                                dbm.role === m.role
                            );
                            return !dbHasTurn;
                        }

                        // Keep completed assistant messages that aren't in DB yet
                        if (m.role === 'assistant') {
                            const dbHasMessage = dbMessages.some(dbm =>
                                dbm.role === 'assistant' &&
                                dbm.metadata?.turn === m.metadata?.turn &&
                                dbm.metadata?.runId === m.metadata?.runId &&
                                !dbm.metadata?.callId
                            );
                            return !dbHasMessage;
                        }

                        return false;
                    });
                    return [...merged, ...purelyLocalMessages];
                }
                return normalizedDbMessages;
            });
            scrollToBottom('instant' as any);
        }
    };

    const fetchUiSettings = async () => {
        try {
            const res = await fetch('/api/config/ui');
            const data = await res.json();
            const section = data?.data || {};
            setUi({
                showTimestamps: section.showTimestamps !== false,
                showToolCalls: section.showToolCalls !== false,
                codeHighlighting: section.codeHighlighting !== false,
                markdownRendering: section.markdownRendering !== false
            });
        } catch {
            // Keep defaults
        }
    };

    const fetchProviders = async () => {
        try {
            const res = await fetch('/api/providers', { cache: 'no-store' });
            const data = await res.json();
            if (data.providers?.length > 0) {
                const providersWithDefault = [
                    { id: 'default', name: 'Default', icon: '⚙️', models: ['default'], defaultModel: 'default', authed: true },
                    ...data.providers
                ];
                setProviders(providersWithDefault);
                return { ...data, providers: providersWithDefault };
            } else {
                const onlyDefault = [
                    { id: 'default', name: 'Default', icon: '⚙️', models: ['default'], defaultModel: 'default', authed: true }
                ];
                setProviders(onlyDefault);
                return { providers: onlyDefault };
            }
        } catch {
            // Fallback to only default
            const onlyDefault = [
                { id: 'default', name: 'Default', icon: '⚙️', models: ['default'], defaultModel: 'default', authed: true }
            ];
            setProviders(onlyDefault);
            return { providers: onlyDefault };
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleConfigSaved = () => {
            void fetchProviders().then((data) => {
                const latestProviders = data?.providers ?? [];
                if (selectedProvider === 'default') {
                    setSelectedModel('default');
                    return;
                }

                const provider = latestProviders.find((entry) => entry.id === selectedProvider);
                if (!provider) {
                    setSelectedProvider('default');
                    setSelectedModel('default');
                    localStorage.setItem('pd_selected_provider', 'default');
                    return;
                }

                const nextModel = provider.models.includes(selectedModel)
                    ? selectedModel
                    : (providerModelMap[selectedProvider] && provider.models.includes(providerModelMap[selectedProvider])
                        ? providerModelMap[selectedProvider]
                        : (provider.defaultModel || provider.models[0] || 'default'));

                setSelectedModel(nextModel);
            });
        };

        window.addEventListener('pd:config-saved', handleConfigSaved as EventListener);
        return () => {
            window.removeEventListener('pd:config-saved', handleConfigSaved as EventListener);
        };
    }, [fetchProviders, providerModelMap, selectedModel, selectedProvider]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => endRef.current?.scrollIntoView({ behavior }), 100);
    };

    const copyTextToClipboard = useCallback(async (text: string) => {
        if (!text) return;

        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch {
                // Fall through to legacy fallback.
            }
        }

        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }, []);

    // ─── Attachment helpers ───

    const addFiles = useCallback((files: FileList | File[]) => {
        setAttachError('');
        const newAttachments: AttachedFile[] = [];
        const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
        let runningTotal = currentTotal;

        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setAttachError(`${file.name} exceeds the 20MB file size limit.`);
                continue;
            }
            runningTotal += file.size;
            if (runningTotal > MAX_TOTAL_SIZE_BYTES) {
                setAttachError('Total attachments exceed the 50MB limit.');
                break;
            }

            const category = classifyFile(file.name);
            const attached: AttachedFile = {
                id: nextAttachId(),
                file,
                name: file.name,
                size: file.size,
                category,
            };

            // Generate thumbnail for images
            if (category === 'image') {
                const url = URL.createObjectURL(file);
                attached.previewUrl = url;
            }

            newAttachments.push(attached);
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    }, [attachments]);

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => {
            const removed = prev.find(a => a.id === id);
            if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
            return prev.filter(a => a.id !== id);
        });
        setAttachError('');
    }, []);

    // ─── Drag & Drop ───

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles]);

    // ─── Clipboard paste ───

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // Give pasted images a readable name
                    const ext = item.type.split('/')[1] || 'png';
                    const named = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
                    imageFiles.push(named);
                }
            }
        }
        if (imageFiles.length > 0) {
            e.preventDefault(); // prevent pasting binary data into textarea
            addFiles(imageFiles);
        }
    }, [addFiles]);

    // ─── Send message ───

    // ─── Gateway Integration ───
    const [toolInput, setToolInput] = useState<Record<string, string>>({});

    const [showToolPasswords, setShowToolPasswords] = useState<Record<string, boolean>>({});

    const [sendingInput, setSendingInput] = useState<Record<string, boolean>>({});

    const trackToolCallState = useCallback((msg: any) => {
        const runId = normalizedText(msg?.metadata?.runId);
        const callId = normalizedText(msg?.metadata?.callId);
        if (!runId || !callId) return;

        const status = normalizedText(msg?.metadata?.status).toLowerCase();
        const nextMap = activeToolCallsRef.current;
        const calls = nextMap.get(runId) ?? new Set<string>();

        if (status === 'completed' || status === 'error') {
            calls.delete(callId);
        } else {
            calls.add(callId);
        }

        if (calls.size > 0) {
            nextMap.set(runId, calls);
        } else {
            nextMap.delete(runId);
        }
    }, []);

    const activeToolCallCount = useCallback((runId: string): number => {
        const calls = activeToolCallsRef.current.get(runId);
        return calls ? calls.size : 0;
    }, []);



    const sendToolInput = async (callId: string) => {

        const input = toolInput[callId];

        if (!input) return;



        setSendingInput(prev => ({ ...prev, [callId]: true }));

        try {

            await fetch('/api/chat/input', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ callId, input: input + '\n' })

            });

            setToolInput(prev => ({ ...prev, [callId]: '' }));

        } catch (err) {

            console.error('Failed to send tool input:', err);

        } finally {

            setSendingInput(prev => ({ ...prev, [callId]: false }));

        }

    };



    // Listen for incoming messages from the gateway (Local or Remote)
    useEffect(() => {
        if (!gatewayClient) return;

        const handleMessage = (rawMsg: any) => {
            const msg = normalizeTranscriptMessage(rawMsg);
            const isOurRun = msg.metadata?.runId && msg.metadata.runId === activeRunIdRef.current;
            const messageRunId = normalizedText(msg?.metadata?.runId);
            const pausedRunId = pausedRunIdRef.current;

            // Hard-stop paused runs in the UI; late chunks can still arrive from SSE.
            if (pausedRunId && messageRunId && pausedRunId === messageRunId) {
                return;
            }

            if (isOurRun && msg.sessionId && msg.sessionId !== sessionId) {
                console.log(`[ChatInterface] Session pivot detected: ${sessionId} -> ${msg.sessionId}`);
                // Use router.push to update the URL; the Home component will pass the new prop
                router.push(`/?session=${msg.sessionId}`, { scroll: false });
                // We also keep processing this message for the current view until the prop update hits
            }

            // UNLESS it's the run we just started.
            if (msg.sessionId && msg.sessionId !== sessionId && !isOurRun) {
                return;
            }

            if (msg.error) {
                console.error('[ChatInterface] Received error from gateway:', msg.error);
                if (Array.isArray(msg.failures) && msg.failures.length > 0) {
                    // Multi-provider failure — show detailed modal
                    setProviderFailures(msg.failures);
                } else {
                    setGlobalError(msg.details || msg.error);
                }
                setLoading(false);
                setPaused(false);
                pausedRunIdRef.current = null;
                activeRunIdRef.current = null;
                return;
            }

            trackToolCallState(msg);

            if (messageRunId && activeRunIdRef.current && messageRunId === activeRunIdRef.current && isRunProgressMessage(msg)) {
                setLoading(true);
            }

            console.log('[ChatInterface] Received message:', msg.role, msg.metadata?.type || msg.metadata?.status || 'final');

            setMessages(prev => {
                const callId = msg.metadata?.callId;
                const turn = msg.metadata?.turn;
                const isFinal = msg.metadata?.final === true;

                // 1. Tool Call / Output Logic (Incremental Appending)
                if (callId) {
                    const existingIndex = prev.findIndex(m => m.metadata?.callId === callId && m.metadata?.runId === msg.metadata?.runId);

                    if (existingIndex !== -1) {
                        const newMessages = [...prev];
                        const existing = newMessages[existingIndex];

                        if (msg.metadata?.type === 'output') {
                            newMessages[existingIndex] = {
                                ...existing,
                                content: (typeof existing.content === 'string' ? existing.content : '') + msg.content,
                                metadata: { ...existing.metadata, ...msg.metadata, status: 'running' }
                            };
                            return newMessages;
                        }

                        if (msg.metadata?.status === 'completed' || msg.metadata?.waitingForInput !== undefined) {
                            newMessages[existingIndex] = {
                                ...existing,
                                metadata: { ...existing.metadata, ...msg.metadata }
                            };
                            return newMessages;
                        }
                    } else {
                        // to prevent plain text bubbles from accumulating alongside the execution block.
                        // BUT do NOT replace messages that are already final responses
                        const ghostIndex = prev.findIndex(m =>
                            m.role === 'assistant' &&
                            m.metadata?.turn === turn &&
                            m.metadata?.runId === msg.metadata?.runId &&
                            !m.metadata?.callId &&
                            // Only consider it a ghost if it's still in thinking/running state
                            (m.metadata?.status === 'thinking' || m.metadata?.status === 'running')
                        );

                        if (ghostIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[ghostIndex] = msg;
                            return newMessages;
                        }
                        return [...prev, msg];
                    }
                }

                // 2. Regular Assistant Logic (Cumulative Updates & Chunk Append Prevention)
                if (msg.role === 'assistant' && turn !== undefined) {
                    const lastMsgIndex = [...prev].reverse().findIndex(m =>
                        m.role === 'assistant' &&
                        m.metadata?.turn === turn &&
                        m.metadata?.runId === msg.metadata?.runId &&
                        !m.metadata?.callId
                    );

                    if (lastMsgIndex !== -1) {
                        const actualIdx = prev.length - 1 - lastMsgIndex;
                        const existing = prev[actualIdx];
                        const mergedMetadata = { ...existing.metadata, ...msg.metadata } as Record<string, unknown>;
                        const mergedStatus = normalizedText(mergedMetadata.status).toLowerCase();
                        const mergedType = normalizedText(mergedMetadata.type).toLowerCase();
                        const looksLikeToolCall = isStructuredToolCallText(msg.content);
                        if (msg.metadata?.final === true) {
                            delete mergedMetadata.type;
                            delete mergedMetadata.callId;
                            delete mergedMetadata.tool;
                            if (mergedStatus === 'thinking' || mergedStatus === 'running') {
                                mergedMetadata.status = 'completed';
                            }
                        } else if (
                            !msg.metadata?.callId
                            && !looksLikeToolCall
                            && mergedType !== 'output'
                            && mergedStatus !== 'running'
                        ) {
                            // Guard against stale tool metadata leaking into plain assistant replies.
                            delete mergedMetadata.callId;
                            delete mergedMetadata.tool;
                            if (mergedType === 'status' && mergedStatus === 'completed') {
                                delete mergedMetadata.type;
                            }
                        }

                        // This prevents geometric text growth when agent emits full buffer
                        const newMessages = [...prev];
                        newMessages[actualIdx] = {
                            ...existing,
                            content: msg.content, // REPLACE, don't append
                            metadata: mergedMetadata
                        };
                        return newMessages;
                    }
                }

                // 3. Final Result Decoupling (Ignore redundant content if turn already displayed)
                if (isFinal && msg.role === 'assistant') {
                    const alreadyExists = prev.some(m =>
                        m.role === 'assistant' &&
                        m.metadata?.turn === turn &&
                        m.metadata?.runId === msg.metadata?.runId &&
                        m.content === msg.content
                    );
                    if (alreadyExists) return prev;
                }

                // Default: append new message
                const newMsg = { ...msg };
                if (!newMsg.timestamp) {
                    newMsg.timestamp = Date.now();
                }
                return [...prev, newMsg];
            });

            const isActiveRunMessage = Boolean(messageRunId && activeRunIdRef.current && messageRunId === activeRunIdRef.current);
            const shouldEvaluateClear = isActiveRunMessage
                || (loading && msg?.metadata?.final === true)
                || msg?.error
                || Boolean(msg?.metadata?.limitReached)
                || msg?.metadata?.aborted === true;

            const shouldClear = shouldEvaluateClear && shouldClearThinkingIndicator(msg, {
                activeToolCallCount: messageRunId ? activeToolCallCount(messageRunId) : 0
            });
            if (shouldClear) {
                setLoading(false);
                setPaused(false);
                pausedRunIdRef.current = null;
                if (!messageRunId || !activeRunIdRef.current || messageRunId === activeRunIdRef.current) {
                    activeRunIdRef.current = null;
                }
                if (messageRunId) {
                    activeToolCallsRef.current.delete(messageRunId);
                }
            }

            scrollToBottom();
        };

        const handleError = (err: any) => {
            console.error('Gateway Error:', err);
            setGlobalError(err.message || 'Gateway connection error');
            setLoading(false);
            setPaused(false);
            pausedRunIdRef.current = null;
            activeRunIdRef.current = null;

            // to show whatever the agent managed to finish.
            void fetchHistory();
        };

        const handleRunId = (rid: string, sid?: string) => {
            if (sid && sid !== sessionId) return;
            if (paused) return;
            console.log('[ChatInterface] runid received:', rid, 'for session:', sid);
            activeRunIdRef.current = rid;
        };

        gatewayClient.on('message', handleMessage);
        gatewayClient.on('error', handleError);
        gatewayClient.on('runid', handleRunId);

        return () => {
            gatewayClient.off('message', handleMessage);
            gatewayClient.off('error', handleError);
            gatewayClient.off('runid', handleRunId);
        };
    }, [gatewayClient, providers, sessionId, selectedProvider, selectedModel, trackToolCallState, activeToolCallCount, router, paused, loading]);

    useEffect(() => {
        if (!loading || !gatewayClient || !providers || !sessionId) return; // guard
        const interval = setInterval(() => {
            console.log('[ChatInterface] Active run polling for session:', sessionId);
            void fetchHistory();
        }, 10000);

        return () => clearInterval(interval);
    }, [loading, sessionId]);

    const stopGeneration = async () => {
        const runId = activeRunIdRef.current;
        if (!loading && !runId) {
            return;
        }

        pausedRunIdRef.current = runId;
        setPaused(true);
        setLoading(false);
        activeRunIdRef.current = null;

        try {
            if (gatewayClient) {
                const aborted = await gatewayClient.abort(sessionId, runId);
                if (!aborted) {
                    setGlobalError('Pause request failed. The active run may still be in progress.');
                    // Resume listening so we don't drop output from the still-running job.
                    pausedRunIdRef.current = null;
                    setPaused(false);
                    if (runId) {
                        activeRunIdRef.current = runId;
                        setLoading(true);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to pause run:', err);
            setGlobalError('Failed to pause the active run.');
            pausedRunIdRef.current = null;
            setPaused(false);
            if (runId) {
                activeRunIdRef.current = runId;
                setLoading(true);
            }
        }
    };

    const addToQueue = () => {
        const queued = createQueuedMessage(input);
        if (!queued) return;
        setQueue(prev => [...prev, queued]);
        setInput('');
    };

    const removeQueuedMessage = (id: string) => {
        setQueue(prev => removeQueuedMessageById(prev, id));
    };

    const sendMessage = async (overrideContent?: string) => {
        const textToSend = overrideContent !== undefined ? overrideContent : input;
        const isContinue = overrideContent === '';
        const effectiveAttachmentsForSend = isContinue ? [] : attachments;

        // If loading and this is a user trigger (no override), queue it
        if (loading && overrideContent === undefined) {
            addToQueue();
            return;
        }

        if ((!textToSend.trim() && effectiveAttachmentsForSend.length === 0) && !isContinue) return;

        if (!gatewayClient) {
            setGlobalError('Gateway not initialized');
            return;
        }

        const effectiveProvider = selectedProvider;
        const effectiveModel = selectedModel;
        const useDefaultModelChain = effectiveProvider === 'default' && effectiveModel === 'default';
        const providerOverride = effectiveProvider && effectiveProvider !== 'default'
            ? effectiveProvider
            : undefined;
        const modelOverride = effectiveModel && effectiveModel !== 'default'
            ? effectiveModel
            : undefined;

        // Validate attachments against model capabilities (skip when using Default chain)
        const skipAttachmentValidation =
            effectiveProvider === 'default' || effectiveModel === 'default';
        if (!skipAttachmentValidation && effectiveAttachmentsForSend.length > 0 && effectiveModel && effectiveProvider) {
            const validation = validateAttachments(
                effectiveModel,
                effectiveProvider,
                effectiveAttachmentsForSend.map(a => a.name)
            );
            if (!validation.valid) {
                setAttachError(validation.error || 'Attachments are not supported by this model.');
                return;
            }
        }

        // Build attachment payloads (base64)
        const attachmentPayloads = await Promise.all(
            effectiveAttachmentsForSend.map(async (a) => {
                const buffer = await a.file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                return {
                    name: a.name,
                    type: a.file.type,
                    size: a.size,
                    category: a.category,
                    data: base64,
                };
            })
        );

        // Optimistic update
        const attachmentDisplay = await Promise.all(
            effectiveAttachmentsForSend.map(async (a) => {
                if (a.previewUrl && a.category === 'image') {
                    // Convert to base64 for persistent display in this session view
                    const buffer = await a.file.arrayBuffer();
                    const base64 = btoa(
                        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                    return {
                        ...a,
                        previewUrl: `data:${a.file.type};base64,${base64}`
                    };
                }
                return a;
            })
        );

        let userContent: any = textToSend;
        if (!isContinue && attachmentDisplay.length > 0) {
            userContent = [
                { type: 'text', text: textToSend || '' },
                ...attachmentDisplay.map(a => ({
                    type: a.category === 'image' ? 'image' : 'file',
                    previewUrl: a.previewUrl,
                    image_url: a.previewUrl ? { url: a.previewUrl } : undefined,
                    name: a.name
                }))
            ];
        }

        const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        activeRunIdRef.current = runId;
        activeToolCallsRef.current.delete(runId);
        pausedRunIdRef.current = null;
        setPaused(false);
        if (!isContinue) {
            const userMsg: Message = { role: 'user', content: userContent, timestamp: Date.now(), metadata: { sequence: Date.now() * 1000, runId } };
            setMessages(prev => [...prev, userMsg]);
            if (overrideContent === undefined) setInput('');
        }

        if (!isContinue) {
            // Clean up original blob URLs now that we have base64
            effectiveAttachmentsForSend.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
            setAttachments([]);
            setAttachError('');
        }
        setLoading(true);
        setGlobalError(null);
        setProviderFailures(null);
        scrollToBottom();

        try {
            const serverRunId = await gatewayClient.sendMessage(sessionId, textToSend || '', {
                provider: providerOverride,
                model: modelOverride,
                useDefaultModelChain,
                reasoning: isCodexReasoningModel ? selectedReasoning : undefined,
                attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
                agentId: agentId || undefined,
                continue: isContinue,
                runId
            });

            if (typeof serverRunId === 'string' && serverRunId.trim().length > 0) {
                activeRunIdRef.current = serverRunId.trim();
            }
            // Note: We do NOT handle the response here. 
            // The response will come via the 'message' event listener above.
        } catch (err: any) {
            console.error('Chat error:', err);
            setGlobalError(err.message || 'An unexpected error occurred.');
            setLoading(false);
            activeRunIdRef.current = null;
        }
    };

    // ─── Rendering helpers ───

    const renderInlineCode = (text: string, keyPrefix: string) => {
        // Split by inline code first
        const chunks = text.split(/`([^`]+)`/g);
        return (
            <span key={keyPrefix} className="whitespace-pre-wrap">
                {chunks.map((chunk, i) => {
                    if (i % 2 === 1) {
                        return (
                            <code
                                key={`${keyPrefix}-code-${i}`}
                                className="px-1 py-0.5 rounded text-xs"
                                style={{
                                    background: ui.codeHighlighting ? 'rgba(37, 99, 235, 0.18)' : 'var(--pd-surface-panel-2)',
                                    color: 'var(--pd-text-main)'
                                }}
                            >
                                {chunk}
                            </code>
                        );
                    }

                    // Handle bold and italic in non-code chunks
                    const subChunks = chunk.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                    return (
                        <span key={`${keyPrefix}-text-${i}`}>
                            {subChunks.map((sc, j) => {
                                if (sc.startsWith('**') && sc.endsWith('**')) {
                                    return <strong key={j} className="font-bold">{sc.slice(2, -2)}</strong>;
                                }
                                if (sc.startsWith('*') && sc.endsWith('*')) {
                                    return <em key={j} className="italic">{sc.slice(1, -1)}</em>;
                                }
                                return sc;
                            })}
                        </span>
                    );
                })}
            </span>
        );
    };
    const renderMarkdownText = (text: string) => {
        const blocks: React.ReactNode[] = [];
        const fenceRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
        let cursor = 0;
        let match: RegExpExecArray | null = null;
        let index = 0;

        while ((match = fenceRegex.exec(text)) !== null) {
            if (match.index > cursor) {
                blocks.push(<div key={`text-${index}`} className="mb-2 leading-relaxed">{renderInlineMarkdown(text.slice(cursor, match.index))}</div>);
            }

            const language = match[1] || 'text';
            const code = match[2] || '';
            blocks.push(
                <pre
                    key={`fence-${index}`}
                    className="mt-3 mb-3 p-4 rounded-xl overflow-x-auto text-[11px] font-mono shadow-inner border border-slate-700/30"
                    style={{
                        background: 'var(--pd-surface-panel-2)',
                        color: 'var(--pd-text-main)'
                    }}
                >
                    <div className="mb-2 flex items-center justify-between opacity-50 uppercase tracking-tighter text-[9px] font-bold">
                        <span>{language}</span>
                        <button
                            type="button"
                            className="cursor-pointer transition-opacity hover:opacity-100"
                            onClick={() => {
                                void copyTextToClipboard(code);
                            }}
                            aria-label="Copy code block"
                            title="Copy code block"
                        >
                            copy
                        </button>
                    </div>
                    <code>{code}</code>
                </pre>
            );
            cursor = fenceRegex.lastIndex;
            index += 1;
        }

        if (cursor < text.length) {
            blocks.push(<div key={`tail-${index}`} className="leading-relaxed">{renderInlineMarkdown(text.slice(cursor))}</div>);
        }

        return <div className="space-y-1">{blocks}</div>;
    };

    const renderInlineMarkdown = (text: string) => {
        // Split by code `...`
        const codeChunks = text.split(/`([^`]+)`/g);
        return codeChunks.map((chunk, i) => {
            if (i % 2 === 1) {
                return (
                    <code key={i} className="px-1.5 py-0.5 rounded-md font-mono text-[13px] border" style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-accent)', borderColor: 'var(--pd-border)' }}>
                        {renderFormatting(chunk)}
                    </code>
                );
            }

            // Handle Bold (**...**), Italic (*...*), and Line Breaks
            const lines = chunk.split('\n');
            return lines.map((line, li) => {
                // Bullet points
                if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                    const content = line.trim().slice(2);
                    return (
                        <div key={`${li}-bp`} className="flex gap-2 ml-2 my-1">
                            <span className="text-blue-500">•</span>
                            <span>{renderFormatting(content)}</span>
                        </div>
                    );
                }

                return (
                    <span key={li}>
                        {renderFormatting(line)}
                        {li < lines.length - 1 && <br />}
                    </span>
                );
            });
        });
    };

    const renderToolOutput = (content: any, toolName: string) => {
        let text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        // Pretty-print loose JSON strings if they look like JSON
        if (typeof content === 'string' && content.trim().startsWith('{') && content.trim().endsWith('}')) {
            try {
                const parsed = JSON.parse(content);
                text = JSON.stringify(parsed, null, 2);
            } catch (e) { /* ignore */ }
        }

        const isSelected = selectedToolOutput?.content === text;
        const lines = text.split('\n');
        const isLong = lines.length > 15 || text.length > 1200;

        let displayContent = text;
        if (isLong) {
            displayContent = lines.slice(0, 15).join('\n');
            if (displayContent.length > 1200) displayContent = displayContent.slice(0, 1200);
            displayContent += '\n... (truncated)';
        }

        return (
            <div
                className={`cursor-pointer group relative overflow-hidden transition-all duration-200 hover:opacity-90 rounded-lg ${isLong ? 'max-h-[400px]' : ''} ${isSelected ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => setSelectedToolOutput({ title: `Tool Output: ${toolName}`, content: text, plainText: true })}
            >
                <div className="pointer-events-none p-1">
                    <div className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ color: 'var(--pd-text-main)' }}>
                        {renderFormatting(displayContent)}
                    </div>
                </div>
                {isLong && (
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--pd-surface-panel-2)] to-transparent pointer-events-none opacity-80" />
                )}
            </div>
        );
    };

    const renderFormatting = (text: string) => {
        // IMPORTANT: Image/video paths must be detected BEFORE bold/italic patterns
        // The order matters: media paths first (including bold-wrapped), then markdown links, then URLs, then bold/italic
        const parts = text.split(/(\!\[[^\]]*\]\([^)]+\)|\*\*\/home\/[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)\*\*|\*\*\/tmp\/[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)\*\*|media\/[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)|\/home\/[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)|\/tmp\/[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)|(?:Image|Saved|Generated|Video)[^:\n\r]*:\s*[a-zA-Z0-9._\-\/]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)|\[.*?\]\(.*?\)|\bhttps?:\/\/[^\s<]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov)|\bhttps?:\/\/[^\s<]+|\*\*.*?\*\*|\*.*?\*)/g);
        return parts.map((part, pi) => {
            if (!part) return null;

            const mdImageMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (mdImageMatch) {
                const mediaTarget = mdImageMatch[2] || '';
                const mediaSrc = mediaTarget.startsWith('http')
                    ? mediaTarget
                    : `/api/media?path=${encodeURIComponent(mediaTarget)}`;
                const isVideoTarget = /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(mediaTarget);
                if (isVideoTarget) {
                    return (
                        <div key={pi} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                            <video
                                src={mediaSrc}
                                controls
                                className="w-full h-auto max-h-[400px]"
                                onError={(e) => {
                                    (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                                }}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    );
                }
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={mediaSrc}
                            alt={mdImageMatch[1] || ''}
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            if (part.startsWith('media/') && /\.(png|jpe?g|webp|gif|svg)$/i.test(part)) {
                const cleanPath = part;
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={`/api/media?path=${encodeURIComponent(cleanPath)}`}
                            alt="Generated Asset"
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            // Handle bold-wrapped image paths like **/home/.../image.png**
            if (part.startsWith('**/') && part.endsWith('**') && /\.(png|jpe?g|webp|gif|svg)\*\*$/i.test(part)) {
                const imagePath = part.slice(2, -2); // Remove surrounding **
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={`/api/media?path=${encodeURIComponent(imagePath)}`}
                            alt="Generated Asset"
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            // Handle absolute paths like /home/.../image.png or /tmp/.../image.png
            if ((part.startsWith('/home/') || part.startsWith('/tmp/')) && /\.(png|jpe?g|webp|gif|svg)$/i.test(part)) {
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={`/api/media?path=${encodeURIComponent(part)}`}
                            alt="Generated Asset"
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            // Handle video files (.mp4, .webm, .mov)
            if ((part.startsWith('media/') || part.startsWith('/home/') || part.startsWith('/tmp/')) && /\.(mp4|webm|mov)$/i.test(part)) {
                const videoPath = part.startsWith('media/') ? part : part;
                return (
                    <div key={pi} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                        <video
                            src={`/api/media?path=${encodeURIComponent(videoPath)}`}
                            controls
                            className="w-full h-auto max-h-[400px]"
                            onError={(e) => {
                                (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                            }}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            }

            // Handle "Video clip saved:" patterns
            const videoSavedMatch = part.match(/^(?:Video|Clip)[^:\n\r]*:\s*(.+\.(?:mp4|webm|mov))$/i);
            if (videoSavedMatch && videoSavedMatch[1]) {
                const videoPath = videoSavedMatch[1].trim();
                return (
                    <div key={pi} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                        <video
                            src={`/api/media?path=${encodeURIComponent(videoPath)}`}
                            controls
                            className="w-full h-auto max-h-[400px]"
                            onError={(e) => {
                                (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                            }}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            }

            // Handle standalone video URLs
            if (part.match(/^https?:\/\/.+\.(?:mp4|webm|mov)$/i)) {
                return (
                    <div key={pi} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                        <video
                            src={part}
                            controls
                            className="w-full h-auto max-h-[400px]"
                            onError={(e) => {
                                (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                            }}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            }

            // Handle "Image saved:" or "Generated image:" patterns
            const imageSavedMatch = part.match(/^(?:Image|Saved|Generated)[^:\n\r]*:\s*(.+\.(?:png|jpe?g|webp|gif|svg))(?:\s+\(.*?\))?$/i);
            if (imageSavedMatch && imageSavedMatch[1]) {
                const imagePath = imageSavedMatch[1].trim();
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={`/api/media?path=${encodeURIComponent(imagePath)}`}
                            alt="Generated Asset"
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            // Handle standalone image URLs (http(s)://...png/jpg/etc)
            if (part.match(/^https?:\/\/.+\.(?:png|jpe?g|webp|gif|svg)$/i)) {
                return (
                    <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                        <img
                            src={part}
                            alt="Image"
                            className="w-full h-auto max-h-[400px] object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                );
            }

            const mdLinkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (mdLinkMatch) {
                const label = mdLinkMatch[1] || '';
                const target = mdLinkMatch[2] || '';
                const normalizedTarget = target.trim();
                const mediaLikeTarget = normalizedTarget;
                const isVideoTarget = /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(mediaLikeTarget);
                const isImageTarget = /\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(mediaLikeTarget);
                const mediaSrc = mediaLikeTarget.startsWith('http')
                    ? mediaLikeTarget
                    : `/api/media?path=${encodeURIComponent(mediaLikeTarget)}`;

                if (isVideoTarget) {
                    return (
                        <div key={pi} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                            <video
                                src={mediaSrc}
                                controls
                                className="w-full h-auto max-h-[400px]"
                                onError={(e) => {
                                    (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                                }}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    );
                }

                if (isImageTarget) {
                    return (
                        <div key={pi} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                            <img
                                src={mediaSrc}
                                alt={label}
                                className="w-full h-auto max-h-[400px] object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                }}
                            />
                        </div>
                    );
                }

                return (
                    <a key={pi} href={target || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors break-all">
                        {label}
                    </a>
                );
            }

            if (part.startsWith('http://') || part.startsWith('https://')) {
                let url = part;
                let trailing = '';
                if (/[.,;!?)]$/.test(url)) {
                    trailing = url.slice(-1);
                    url = url.slice(0, -1);
                }
                return (
                    <span key={pi}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors break-all">
                            {url}
                        </a>
                        {trailing}
                    </span>
                );
            }

            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="font-bold" style={{ color: 'var(--pd-text-main)' }}>{renderFormatting(part.slice(2, -2))}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={pi} className="italic" style={{ color: 'var(--pd-text-muted)' }}>{renderFormatting(part.slice(1, -1))}</em>;
            }
            return part;
        });
    };

    const normalizeMediaPath = (value: string): string => value.trim();

    const toMediaSrc = (raw: string): string => {
        const value = normalizeMediaPath(raw);
        if (value.startsWith('http://') || value.startsWith('https://')) return value;
        return `/api/media?path=${encodeURIComponent(value)}`;
    };

    const renderMetadataMedia = (url: string, key: string) => {
        const value = normalizeMediaPath(url);
        const src = toMediaSrc(value);
        const isVideo = /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(value);
        const isImage = /\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(value);

        if (isVideo) {
            return (
                <div key={key} className="my-3 relative w-full max-w-lg rounded-xl border shadow-inner overflow-hidden" style={{ borderColor: 'var(--pd-border)' }}>
                    <video
                        src={src}
                        controls
                        className="w-full h-auto max-h-[400px]"
                        onError={(e) => {
                            (e.target as HTMLVideoElement).parentElement!.style.display = 'none';
                        }}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        if (isImage) {
            return (
                <div key={key} className="my-3 relative w-full max-w-sm rounded-xl border shadow-inner overflow-hidden flex justify-center items-center" style={{ borderColor: 'var(--pd-border)' }}>
                    <img
                        src={src}
                        alt="Attached media"
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                    />
                </div>
            );
        }

        return (
            <a
                key={key}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors break-all"
            >
                {value}
            </a>
        );
    };

    const attachMetadataMedia = (base: React.ReactNode, contentText: string, metadata?: Record<string, any>) => {
        const rawUrls = Array.isArray(metadata?.mediaUrls)
            ? metadata.mediaUrls
            : (typeof metadata?.mediaUrl === 'string' && metadata.mediaUrl.trim().length > 0 ? [metadata.mediaUrl] : []);

        const deduped = Array.from(
            new Set(
                rawUrls
                    .filter((entry: any): entry is string => typeof entry === 'string')
                    .map((entry) => entry.trim())
                    .filter(Boolean)
            )
        );

        const missingFromText = deduped.filter((url) => !contentText.includes(url));
        if (missingFromText.length === 0) {
            return base;
        }

        return (
            <div className="space-y-1">
                {base}
                <div className="pt-1">
                    {missingFromText.map((url, idx) => renderMetadataMedia(url, `meta-media-${idx}-${url}`))}
                </div>
            </div>
        );
    };

    const renderContent = (content: any, metadata?: Record<string, any>) => {
        let textContent = '';

        if (typeof content === 'string') {
            textContent = content;
        } else if (Array.isArray(content)) {
            // Concatenate text parts for filtering (simplified for view)
            // But we ideally want to preserve structure. 
            // For now, let's handle the string case which is most common for thinking blocks.
        }

        if (typeof content === 'string') {
            // Filter or style <thinking> blocks
            if (!showThinking) {
                // Remove thinking blocks
                content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
                if (!content) return <span className="opacity-50 italic">Key thought hidden...</span>;
            } else {
                // If showing, we might want to style them?
                // For now, just render them as is, or we could replace them with a styled div?
                // Let's replace <thinking> content with a styled block
                const parts = content.split(/(<thinking>[\s\S]*?<\/thinking>)/g);
                if (parts.length > 1) {
                    return (
                        <div className="space-y-2">
                            {parts.map((part, i) => {
                                if (part.startsWith('<thinking>') && part.endsWith('</thinking>')) {
                                    const inner = part.slice(10, -11).trim();
                                    return (
                                        <div key={i} className="text-xs p-3 rounded-lg border italic opacity-80" style={{ background: 'var(--pd-surface-panel-2)', borderColor: 'var(--pd-border)', color: 'var(--pd-text-muted)' }}>
                                            <div className="flex items-center gap-2 mb-1 font-bold not-italic opacity-70">
                                                <Brain size={12} />
                                                <span>Thinking Process</span>
                                            </div>
                                            {inner}
                                        </div>
                                    );
                                }
                                if (!part.trim()) return null;
                                return <div key={i}>{renderMarkdownText(part)}</div>;
                            })}
                        </div>
                    );
                }
            }

            if (!ui.markdownRendering) {
                return attachMetadataMedia(
                    <span className="whitespace-pre-wrap">{content}</span>,
                    String(content),
                    metadata
                );
            }
            // Prettify loose JSON
            if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                try {
                    const obj = JSON.parse(content);
                    return attachMetadataMedia(
                        <pre className="p-3 my-2 rounded-lg border font-mono text-[11px] overflow-x-auto shadow-inner" style={{ background: 'var(--pd-surface-panel)', borderColor: 'var(--pd-border)', color: 'var(--pd-text-main)' }}>
                            {JSON.stringify(obj, null, 2)}
                        </pre>
                        ,
                        String(content),
                        metadata
                    );
                } catch { /* not json */ }
            }
            return attachMetadataMedia(renderMarkdownText(content), String(content), metadata);
        }
        if (Array.isArray(content)) {
            return attachMetadataMedia((
                <div className="space-y-4">
                    {content.map((c, i) => {
                        if (c.type === 'text') return <div key={i} className="whitespace-pre-wrap leading-relaxed">{c.text}</div>;
                        if (c.type === 'image') {
                            const url = c.image_url?.url || c.previewUrl;
                            return (
                                <div key={i} className="rounded-xl overflow-hidden border border-slate-700 max-w-xl shadow-2xl bg-black/20">
                                    <img src={url} alt="Attached" className="w-full h-auto object-contain max-h-[500px]" />
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            ), '', metadata);
        }
        return attachMetadataMedia(
            <pre className="p-2 opacity-50 text-[10px] bg-black/20 rounded">{JSON.stringify(content, null, 2)}</pre>,
            '',
            metadata
        );
    };

    const isToolCallMessage = (msg: Message): boolean => {
        if (msg.metadata?.final === true) return false;
        if (msg.metadata?.callId || msg.metadata?.tool) return true;
        const type = normalizedText(msg.metadata?.type).toLowerCase();
        const status = normalizedText(msg.metadata?.status).toLowerCase();
        if (type === 'status') {
            return true;
        }
        if (type === 'output') {
            return Boolean(msg.metadata?.callId || msg.metadata?.tool);
        }
        const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        if (!text) return false;
        const looksTool = isStructuredToolCallText(text) || text.includes('[Tool Output for ') || text.startsWith('[Tool Output for ');
        if (looksTool) return true;
        if (status === 'thinking' || status === 'running') {
            // Treat "thinking/running" as tool-related only when content/metadata
            // also indicates tool execution, otherwise keep assistant replies as chat bubbles.
            return Boolean(msg.metadata?.callId || msg.metadata?.tool) || looksTool;
        }
        return false;
    };

    const sortedMessages = [...messages].sort((a, b) => {
        const timeA = a.timestamp || Number.MAX_SAFE_INTEGER;
        const timeB = b.timestamp || Number.MAX_SAFE_INTEGER;

        // Message timestamps are already millisecond-resolution; only use the
        // sequence counter to break exact ties so adjacent turns stay stable.
        if (timeA !== timeB) {
            return timeA - timeB;
        }

        // Break ties with role: user always comes first for exact same timestamp.
        // This prevents "jumping" where the prompt appears below the execution block.
        if (a.role === 'user' && b.role !== 'user') return -1;
        if (b.role === 'user' && a.role !== 'user') return 1;

        const seqA = (a.metadata?.sequence as number) || 0;
        const seqB = (b.metadata?.sequence as number) || 0;
        if (seqA !== seqB) return seqA - seqB;

        // Tertiary: If sequence is same or missing, use original message order (id)
        const idA = typeof a.id === 'number' ? a.id : 0;
        const idB = typeof b.id === 'number' ? b.id : 0;
        return idA - idB;
    });

    const visibleMessages = ui.showToolCalls
        ? sortedMessages
        : sortedMessages.filter((msg) => !isToolCallMessage(msg));

    const executionTurnKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const msg of sortedMessages) {
            const runId = normalizedText(msg.metadata?.runId);
            const turn = typeof msg.metadata?.turn === 'number' ? msg.metadata.turn : null;
            if (!runId || turn === null) continue;

            const hasToolEvent = Boolean(msg.metadata?.callId)
                || normalizedText(msg.metadata?.type).toLowerCase() === 'output'
                || (typeof msg.content === 'string' && msg.content.includes('[Tool Output for '));

            if (hasToolEvent) {
                keys.add(`${runId}:${turn}`);
            }
        }
        return keys;
    }, [sortedMessages]);



    // ─── Get models for selected provider ───
    const currentProvider = providers.find(p => p.id === selectedProvider);
    const currentModels = currentProvider?.models ?? [];
    const isCodexReasoningModel = resolvedSelection.provider === 'openai-codex' || /codex/i.test(resolvedSelection.model);

    // When provider changes, restore last used model or default
    const handleProviderChange = (newProviderId: string) => {
        setSelectedProvider(newProviderId);
        const p = providers.find(prov => prov.id === newProviderId);

        // Check if we have a saved model for this provider
        const savedModel = providerModelMap[newProviderId];
        const newModel = savedModel && p?.models.includes(savedModel)
            ? savedModel
            : (p?.defaultModel || p?.models[0] || '');

        setSelectedModel(newModel);
        setAttachError('');
        localStorage.setItem('pd_selected_provider', newProviderId);
    };

    const handleModelChange = (newModel: string) => {
        setSelectedModel(newModel);
        // Persist
        if (selectedProvider) {
            const newMap = { ...providerModelMap, [selectedProvider]: newModel };
            setProviderModelMap(newMap);
            localStorage.setItem('pd_provider_models', JSON.stringify(newMap));
        }
    };

    const handleReasoningChange = (newLevel: ReasoningLevel) => {
        setSelectedReasoning(newLevel);
        const newMap = { ...sessionReasoningMap, [sessionId]: newLevel };
        setSessionReasoningMap(newMap);
        localStorage.setItem(SESSION_REASONING_STORAGE_KEY, JSON.stringify(newMap));
    };

    // ─── Format file size ───
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const [showThinking, setShowThinking] = useState(true);

    // ... (inside component body)

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ background: 'var(--pd-surface-main)', color: 'var(--pd-text-main)' }}>
            {/* ── All-models-failed modal ── */}
            {providerFailures && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setProviderFailures(null)}
                >
                    <div
                        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl border-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            background: 'var(--pd-surface-panel)',
                            borderColor: '#ef4444',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <AlertCircle className="text-red-500 shrink-0" size={24} />
                            <div className="flex-1">
                                <p className="font-bold text-base text-red-400">All Models Failed</p>
                                <p className="text-xs text-red-300 opacity-80 mt-0.5">Every model in the chain was attempted and returned an error.</p>
                            </div>
                            <button
                                onClick={() => setProviderFailures(null)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ background: 'transparent' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--pd-surface-panel-2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                aria-label="Dismiss"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Failure list */}
                        <div className="px-5 py-3 space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
                            {providerFailures.map((f, i) => (
                                <div
                                    key={i}
                                    className="flex flex-col gap-1 px-3 py-2.5 rounded-xl text-xs border"
                                    style={{ background: 'var(--pd-surface-panel-2)', borderColor: 'var(--pd-border)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold" style={{ color: 'var(--pd-text-main)' }}>
                                            {f.provider || 'Unknown provider'}
                                        </span>
                                        {f.code && (
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide"
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                                            >
                                                {f.code}
                                            </span>
                                        )}
                                    </div>
                                    <p className="opacity-70 leading-snug" style={{ color: 'var(--pd-text-muted)' }}>{f.message}</p>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: 'var(--pd-border)' }}>
                            <button
                                onClick={() => setProviderFailures(null)}
                                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)' }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: selectedToolOutput ? 'var(--pd-border)' : 'transparent' }}>
                {/* Chat Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--pd-border)' }}>
                    <div>
                        <h2 className="text-base font-bold">Chat</h2>
                        <p className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Direct gateway chat session</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowThinking(!showThinking)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer hover:opacity-100 ${showThinking ? 'opacity-100 text-[var(--pd-accent)]' : 'opacity-50 text-[var(--pd-text-muted)]'}`}
                            title="Toggle assistant thinking/working output"
                        >
                            <Brain size={18} />
                        </button>
                        {onToggleFullscreen && (
                            <button
                                onClick={onToggleFullscreen}
                                className="p-2 rounded-lg transition-colors cursor-pointer hover:opacity-80"
                                style={{ color: 'var(--pd-text-muted)' }}
                                title={sidebarCollapsed ? 'Exit fullscreen' : 'Fullscreen'}
                            >
                                {sidebarCollapsed ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="4 14 10 14 10 20" />
                                        <polyline points="20 10 14 10 14 4" />
                                        <line x1="14" y1="10" x2="21" y2="3" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 3 21 3 21 9" />
                                        <polyline points="9 21 3 21 3 15" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                    {globalError && (
                        <div className="flex items-center gap-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-2xl text-red-100 text-sm shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 ring-4 ring-red-500/10">
                            <div className="bg-red-500 p-2 rounded-xl text-white shadow-lg">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-base mb-0.5 text-red-200">Chat Error</p>
                                <p className="opacity-90 leading-relaxed">{globalError}</p>
                            </div>
                            <button
                                onClick={() => setGlobalError(null)}
                                className="p-2 hover:bg-white/20 rounded-xl transition-all hover:scale-110 active:scale-95"
                                title="Dismiss"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                    {visibleMessages.map((msg, idx) => {
                        const messageRunId = normalizedText(msg.metadata?.runId);
                        const messageTurn = typeof msg.metadata?.turn === 'number' ? msg.metadata.turn : null;
                        const messageType = normalizedText(msg.metadata?.type).toLowerCase();
                        const messageStatus = normalizedText(msg.metadata?.status).toLowerCase();
                        const isAssistantFinal = msg.role === 'assistant' && msg.metadata?.final === true;
                        const isToolOutput = typeof msg.content === 'string' && msg.content.includes('[Tool Output for ');
                        const contentLooksLikeToolCall = isStructuredToolCallText(msg.content);
                        const hasCallId = Boolean(msg.metadata?.callId);
                        const hasToolName = Boolean(msg.metadata?.tool);
                        const toolMetadataImpliesExecution =
                            messageType === 'output'
                            || messageStatus === 'running'
                            || messageStatus === 'thinking'
                            || isToolOutput
                            || contentLooksLikeToolCall;
                        const hasToolMetadata = !isAssistantFinal && (
                            hasCallId
                            || (hasToolName && toolMetadataImpliesExecution)
                        );
                        const isExecutionTurn = Boolean(
                            messageRunId &&
                            messageTurn !== null &&
                            executionTurnKeys.has(`${messageRunId}:${messageTurn}`)
                        );
                        const isToolCall = !isAssistantFinal && !isToolOutput && (hasToolMetadata || contentLooksLikeToolCall);
                        const isStatusStep = !isAssistantFinal && (
                            messageType === 'status'
                            || ((messageStatus === 'thinking' || messageStatus === 'running')
                                && (hasToolMetadata || isToolOutput || contentLooksLikeToolCall))
                        );
                        const isPlainAssistantMessage = msg.role === 'assistant'
                            && !isToolOutput
                            && !hasToolMetadata
                            && !contentLooksLikeToolCall;
                        // Strict requirement for an execution bubble: must explicitly have a running/pending tool state
                        // or be the actual tool output itself. Mere proximity to a tool call shouldn't inherit the bubble formatting.
                        const isExecutionOnlyMessage = isExecutionTurn
                            && !isAssistantFinal
                            && !isPlainAssistantMessage
                            && (hasToolMetadata || isToolOutput || contentLooksLikeToolCall)
                            && (messageStatus === 'running' || isToolOutput || messageType === 'tool' || contentLooksLikeToolCall);
                        const isToolRelated = isToolCall || isToolOutput || isStatusStep || isExecutionOnlyMessage;

                        const isUser = msg.role === 'user' && !isToolRelated;
                        const isNotification = msg.metadata?.type === 'notification' || msg.metadata?.status === 'fallback';
                        const isExecBlock = !isUser && !isNotification && isToolRelated;
                        const assistantModel = !isUser ? normalizedText(msg.metadata?.model) : '';
                        const fallbackUsed = !isUser && msg.metadata?.fallbackUsed === true;
                        const fallbackTarget = formatProviderModel(msg.metadata?.provider, msg.metadata?.model);
                        const fallbackSource = formatProviderModel(msg.metadata?.fallbackFromProvider, msg.metadata?.fallbackFromModel);
                        const fallbackNotice = fallbackUsed
                            ? (fallbackSource
                                ? `Fallback applied: ${fallbackSource} -> ${fallbackTarget || 'active model'}`
                                : `Fallback applied${fallbackTarget ? `: ${fallbackTarget}` : ''}`)
                            : '';

                        return (
                            <div key={msg.id || `${msg.timestamp}-${idx}`} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isNotification ? 'justify-center' : ''} gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {/* System / Error Message Handling */}
                                {msg.role === 'system' && (
                                    <div className="w-full my-2">
                                        {(() => {
                                            const isSummary = msg.metadata?.type === 'summary' || (typeof msg.content === 'string' && msg.content.includes('[Conversation Summary]'));
                                            const bgColor = isSummary ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                            const borderColor = isSummary ? 'rgba(59, 130, 246, 0.4)' : 'var(--pd-danger)';
                                            const iconColor = isSummary ? '#3b82f6' : 'var(--pd-danger)';
                                            const label = isSummary ? 'Context Baseline' : 'System Error';
                                            const Icon = isSummary ? Info : AlertCircle;

                                            return (
                                                <div className="w-full rounded-2xl border px-4 py-4 shadow-sm" style={{ background: bgColor, borderColor: borderColor }}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Icon size={18} className="shrink-0" style={{ color: iconColor }} />
                                                        <div className="font-bold text-xs uppercase tracking-wider opacity-70" style={{ color: iconColor }}>{label}</div>
                                                    </div>
                                                    <div className="text-sm leading-relaxed" style={{ color: 'var(--pd-text-main)' }}>
                                                        {renderContent(msg.content, msg.metadata)}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Fallback Notification */}
                                {isNotification && (
                                    <div className="w-full flex justify-center my-2">
                                        <div className="flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-bold tracking-tight backdrop-blur-md shadow-lg" style={{ background: 'var(--pd-warning-bg)', borderColor: 'var(--pd-border)', color: 'var(--pd-warning-text)' }}>
                                            <ShieldAlert size={14} className="animate-pulse" />
                                            <span>{typeof msg.content === 'string' ? msg.content : 'Provider Fallback Active'}</span>
                                        </div>
                                    </div>
                                )}

                                {msg.role !== 'system' && !isNotification && !isUser && (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shrink-0 mt-1 ring-2 ring-slate-800">
                                        <Bot size={18} />
                                    </div>
                                )}

                                {msg.role !== 'system' && !isNotification && (
                                    <div className={`max-w-[85%] rounded-2xl overflow-hidden group relative transition-all duration-200 ${isExecBlock ? 'w-full' : ''} ${isUser
                                        ? 'bg-blue-600 text-white shadow-blue-900/20 shadow-xl border border-blue-500/50'
                                        : isExecBlock
                                            ? 'shadow-sm border backdrop-blur-sm'
                                            : 'shadow-xl border backdrop-blur-sm'
                                        }`}
                                        style={!isUser ? { background: isExecBlock ? 'var(--pd-surface-panel-2)' : 'var(--pd-surface-panel)', borderColor: 'var(--pd-border)', color: 'var(--pd-text-main)' } : {}}
                                    >
                                        {isExecBlock ? (
                                            <div className="p-4 text-xs font-mono">
                                                <div className="flex items-center justify-between mb-3 font-bold uppercase tracking-wider" style={{ color: isToolOutput ? 'var(--pd-text-muted)' : 'var(--pd-accent)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${msg.metadata?.status === 'running' ? 'bg-yellow-500 animate-pulse' : (isToolOutput ? 'bg-slate-500' : 'bg-blue-500')}`} />
                                                        <span>{isToolOutput ? 'tool output' : 'execution step'}</span>
                                                    </div>
                                                    {msg.metadata?.tool && <span className="opacity-50">{msg.metadata.tool}</span>}
                                                </div>
                                                <div className="opacity-90 leading-relaxed font-mono overflow-x-auto break-words" style={{ color: 'var(--pd-text-main)', wordBreak: 'break-word' }}>
                                                    {renderToolOutput(msg.content, msg.metadata?.tool || 'tool')}
                                                </div>

                                                {msg.metadata?.status === 'running' && msg.metadata?.callId && msg.metadata?.tool === 'shell' && msg.metadata?.waitingForInput && (<div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--pd-border)' }}>
                                                    <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-[0.2em] text-[9px]" style={{ color: 'var(--pd-accent)' }}>
                                                        <Terminal size={10} />
                                                        <span>Terminal Input Required</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type={showToolPasswords[msg.metadata.callId as string] ? 'password' : 'text'}
                                                                name={`pd-term-in-${msg.metadata.callId}`}
                                                                id={`pd-term-in-${msg.metadata.callId}`}
                                                                autoComplete="one-time-code"
                                                                autoCorrect="off"
                                                                autoCapitalize="off"
                                                                spellCheck="false"
                                                                data-lpignore="true"
                                                                data-form-type="other"
                                                                data-bwignore="true"
                                                                data-1pignore="true"
                                                                data-proton-ignore="true"
                                                                disabled={sendingInput[msg.metadata.callId as string]}
                                                                value={toolInput[msg.metadata.callId as string] || ''}
                                                                onChange={(e) => {
                                                                    const cid = msg.metadata?.callId;
                                                                    if (cid) setToolInput(prev => ({ ...prev, [cid]: e.target.value }));
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    e.stopPropagation();
                                                                    const cid = msg.metadata?.callId;
                                                                    if (e.key === 'Enter' && cid) {
                                                                        e.preventDefault();
                                                                        sendToolInput(cid);
                                                                    }
                                                                }}
                                                                placeholder={sendingInput[msg.metadata.callId as string] ? "Sending..." : "Type password or input..."}
                                                                className="w-full rounded px-2 py-1.5 pr-8 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                style={{
                                                                    background: 'var(--pd-surface-main)',
                                                                    border: '1px solid var(--pd-border)',
                                                                    color: 'var(--pd-text-main)'
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const cid = msg.metadata?.callId as string;
                                                                    setShowToolPasswords(prev => ({ ...prev, [cid]: !prev[cid] }));
                                                                }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                                                                title="Toggle visibility"
                                                                style={{ color: 'var(--pd-text-muted)' }}
                                                            >
                                                                {showToolPasswords[msg.metadata.callId as string] ? (
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                ) : (
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.47 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                msg.metadata?.callId && sendToolInput(msg.metadata.callId);
                                                            }}
                                                            disabled={sendingInput[msg.metadata.callId as string]}
                                                            className="px-3 py-1 text-white rounded font-bold transition-all hover:opacity-90 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            style={{ background: 'var(--pd-accent)' }}
                                                        >
                                                            {sendingInput[msg.metadata.callId as string] ? "..." : "Send"}
                                                        </button>
                                                    </div>
                                                </div>
                                                )}

                                                <div className="mt-3 pt-2 border-t text-[10px] flex items-center gap-1" style={{ borderColor: 'var(--pd-border)', color: 'var(--pd-text-muted)' }}>
                                                    {msg.metadata?.status === 'running' ? (
                                                        <span className="text-yellow-500 italic">running...</span>
                                                    ) : (
                                                        <>
                                                            <span>completed</span>
                                                            <span className="text-green-500">✓</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`p-4 ${isUser ? '' : 'leading-relaxed'}`}>
                                                <div className={`flex items-center gap-2 mb-1 text-[10px] opacity-50 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                    {!isUser && <span>{agentName}</span>}
                                                    {ui.showTimestamps && <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                    {!isUser && assistantModel && <span>{assistantModel}</span>}
                                                </div>
                                                {!isUser && fallbackNotice && (
                                                    <div
                                                        className="mb-3 rounded-md border px-2 py-1 text-[11px]"
                                                        style={{
                                                            borderColor: 'var(--pd-border)',
                                                            background: 'var(--pd-surface-panel-2)',
                                                            color: 'var(--pd-text-muted)'
                                                        }}
                                                    >
                                                        {fallbackNotice}
                                                    </div>
                                                )}
                                                <div className="text-sm leading-relaxed">
                                                    {isToolRelated && !isUser && !isExecBlock
                                                        ? renderToolOutput(msg.content, msg.metadata?.tool || 'tool')
                                                        : renderContent(msg.content, msg.metadata)
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isUser && (
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-slate-200 shadow-lg shrink-0 mt-1" style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)' }}>
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {loading && (
                        <div className="flex w-full justify-start gap-4">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 ring-2 ring-transparent animate-pulse" style={{ background: 'var(--pd-surface-panel-2)' }}>
                                <Bot size={18} className="text-blue-500" />
                            </div>
                            <div className="self-center flex items-center gap-2 text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                                <span className="animate-pulse">Thinking...</span>
                            </div>
                        </div>
                    )}

                    {!loading && messages[messages.length - 1]?.metadata?.limitReached === 'turns' && (
                        <div className="flex w-full justify-start gap-4 mb-4">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: 'var(--pd-surface-panel-2)' }}>
                                <Brain size={18} className="text-amber-500" />
                            </div>
                            <div className="self-center flex items-center gap-2 text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                                <span>Agent has gone 50 turns, continue?</span>
                            </div>
                        </div>
                    )}

                    {!loading && messages[messages.length - 1]?.metadata?.limitReached === 'timeout' && (
                        <div className="flex w-full justify-start gap-4 mb-4">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: 'var(--pd-surface-panel-2)' }}>
                                <AlertCircle size={18} className="text-red-500" />
                            </div>
                            <div className="self-center flex items-center gap-2 text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                                <span>Sorry, the agent has time out. Continue?</span>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* ═══ Input Area ═══ */}
                <div
                    className="p-4"
                    style={{ background: 'var(--pd-surface-main)' }}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* Drag overlay */}
                    {isDragging && (
                        <div
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        >
                            <div className="p-8 rounded-xl bg-slate-900 border-2 border-dashed border-blue-500 text-blue-400 font-bold">
                                Drop files to attach
                            </div>
                        </div>
                    )}

                    {queue.length > 0 && (
                        <div
                            className="mb-3 rounded-xl border p-3"
                            style={{
                                borderColor: 'var(--pd-border)',
                                background: 'var(--pd-surface-sidebar)'
                            }}
                        >
                            <div className="mb-2 text-xs font-semibold" style={{ color: 'var(--pd-text-muted)' }}>
                                Queued ({queue.length})
                            </div>
                            <div className="space-y-2">
                                {queue.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                                        style={{
                                            borderColor: 'var(--pd-border)',
                                            background: 'var(--pd-surface-main)'
                                        }}
                                    >
                                        <div
                                            className="flex-1 whitespace-pre-wrap break-words text-sm"
                                            style={{ color: 'var(--pd-text-main)' }}
                                        >
                                            {item.text}
                                        </div>
                                        <button
                                            onClick={() => removeQueuedMessage(item.id)}
                                            className="h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition-colors hover:bg-black/5"
                                            style={{
                                                borderColor: 'var(--pd-border)',
                                                color: 'var(--pd-text-muted)'
                                            }}
                                            aria-label="Remove queued message"
                                            title="Remove queued message"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div
                        className="relative border rounded-xl overflow-hidden shadow-lg transition-colors flex flex-col"
                        style={{
                            borderColor: 'var(--pd-border)',
                            background: 'var(--pd-surface-sidebar)'
                        }}
                    >
                        {/* Attachments Preview */}
                        {attachments.length > 0 && (
                            <div className="p-2 flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--pd-border)' }}>
                                {attachments.map(att => (
                                    <div key={att.id} className="relative group rounded overflow-hidden border flex items-center" style={{ background: 'var(--pd-surface-panel-2)', borderColor: 'var(--pd-border)' }}>
                                        {att.category === 'image' && att.previewUrl ? (
                                            <div className="relative w-12 h-12">
                                                <img
                                                    src={att.previewUrl}
                                                    alt={att.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 flex items-center justify-center text-xl" style={{ background: 'var(--pd-surface-panel)' }}>
                                                <FileText size={20} style={{ color: 'var(--pd-text-muted)' }} />
                                            </div>
                                        )}
                                        <div className="px-2 py-1 text-xs max-w-[120px]">
                                            <div className="truncate font-medium" style={{ color: 'var(--pd-text-main)' }}>{att.name}</div>
                                            <div className="text-[10px]" style={{ color: 'var(--pd-text-muted)' }}>{formatSize(att.size)}</div>
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(att.id)}
                                            className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {attachError && (
                            <div className="bg-red-900/20 text-red-500 text-xs px-3 py-1 font-medium">
                                {attachError}
                            </div>
                        )}

                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            onPaste={handlePaste}
                            placeholder={loading
                                ? "Add to queue..."
                                : paused
                                    ? "Run paused. Continue or type a new message..."
                                    : "Message (Enter to send, Shift+Enter for line breaks)"}
                            rows={1}
                            className="w-full p-4 bg-transparent outline-none resize-none text-sm placeholder-slate-500"
                            style={{ minHeight: '56px', maxHeight: '200px', color: 'var(--pd-text-main)' }}
                        />

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--pd-surface-panel)' }}>
                            <div className="flex items-center gap-2">
                                {/* Attach Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded-lg transition-colors hover:bg-black/5"
                                    style={{ color: 'var(--pd-text-muted)' }}
                                    title="Attach file"
                                >
                                    <Paperclip size={18} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                        if (e.target.files) addFiles(e.target.files);
                                        e.target.value = '';
                                    }}
                                />

                                {/* Separator */}
                                <div className="w-px h-5 mx-1" style={{ background: 'var(--pd-border)' }} />

                                {/* Model Selector Pill */}
                                <div className="flex items-center gap-0 rounded-lg overflow-hidden border transition-shadow hover:shadow-md"
                                    style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-input-bg)' }}>
                                    <div className="relative">
                                        <select
                                            className="appearance-none bg-transparent pl-3 pr-2 py-1.5 text-xs font-semibold cursor-pointer outline-none transition-colors hover:opacity-80"
                                            style={{ color: 'var(--pd-text-muted)' }}
                                            value={selectedProvider}
                                            onChange={e => handleProviderChange(e.target.value)}
                                            title="Select Provider"
                                        >
                                            {providers.map(p => (
                                                <option key={p.id} value={p.id} style={{ background: 'var(--pd-surface-panel)' }}>
                                                    {p.id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-px h-4" style={{ background: 'var(--pd-border)' }} />
                                    <div className="relative">
                                        <select
                                            className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-xs font-bold cursor-pointer outline-none transition-colors hover:opacity-80"
                                            style={{ color: 'var(--pd-accent)' }}
                                            value={selectedModel}
                                            onChange={e => handleModelChange(e.target.value)}
                                            title="Select Model"
                                        >
                                            {currentModels.map(m => (
                                                <option key={m} value={m} style={{ background: 'var(--pd-surface-panel)' }}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={12} style={{ color: 'var(--pd-text-main)' }} />
                                    </div>
                                </div>
                                {isCodexReasoningModel && (
                                    <div
                                        className="flex items-center gap-0 rounded-lg overflow-hidden border transition-shadow hover:shadow-md"
                                        style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-input-bg)' }}
                                        title="Reasoning level for Codex models"
                                    >
                                        <div className="px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--pd-text-muted)' }}>
                                            Reasoning
                                        </div>
                                        <div className="w-px h-4" style={{ background: 'var(--pd-border)' }} />
                                        <div className="relative">
                                            <select
                                                className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-xs font-bold cursor-pointer outline-none transition-colors hover:opacity-80"
                                                style={{ color: 'var(--pd-accent)' }}
                                                value={selectedReasoning}
                                                onChange={(e) => handleReasoningChange(e.target.value as ReasoningLevel)}
                                                title="Select Reasoning Level"
                                            >
                                                <option value="low" style={{ background: 'var(--pd-surface-panel)' }}>Low</option>
                                                <option value="medium" style={{ background: 'var(--pd-surface-panel)' }}>Medium</option>
                                                <option value="high" style={{ background: 'var(--pd-surface-panel)' }}>High</option>
                                                <option value="xhigh" style={{ background: 'var(--pd-surface-panel)' }}>Extra High</option>
                                            </select>
                                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={12} style={{ color: 'var(--pd-text-main)' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Stats or other info could go here */}

                                {/* Action Buttons */}
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { void stopGeneration(); }}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
                                            style={{ background: 'var(--pd-danger)', color: 'white' }}
                                        >
                                            <Square size={12} fill="currentColor" />
                                            Pause
                                        </button>
                                        <button
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim()}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)', border: '1px solid var(--pd-border)' }}
                                        >
                                            <Layers size={14} />
                                            Queue
                                        </button>
                                    </div>
                                ) : paused ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => sendMessage('')}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
                                            style={{ background: 'var(--pd-accent)', color: 'white' }}
                                        >
                                            <Layers size={14} />
                                            Continue
                                        </button>
                                        <button
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim() && attachments.length === 0}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--pd-surface-panel-2)', color: 'var(--pd-text-main)', border: '1px solid var(--pd-border)' }}
                                        >
                                            <Send size={14} />
                                            Send
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {(messages[messages.length - 1]?.metadata?.limitReached) && (
                                            <button
                                                onClick={() => sendMessage('')}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
                                                style={{ background: 'var(--pd-accent)', color: 'white' }}
                                            >
                                                <Layers size={14} />
                                                Continue
                                            </button>
                                        )}
                                        <button
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim() && attachments.length === 0}
                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'var(--pd-accent)', color: 'white' }}
                                        >
                                            <Send size={14} />
                                            Send
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tool Output Sidebar */}
            {selectedToolOutput && (
                <div
                    className="relative flex shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl"
                    style={{
                        width: `${sidebarWidth}px`,
                        background: 'var(--pd-surface-sidebar)',
                        borderLeft: '1px solid var(--pd-border)'
                    }}
                >
                    {/* Resize Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-[var(--pd-accent)] transition-colors"
                        onMouseDown={startResizing}
                    />

                    <div className="flex flex-col w-full h-full">
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--pd-border)' }}>
                            <h3 className="text-sm font-bold truncate pr-4">{selectedToolOutput.title}</h3>
                            <button
                                onClick={() => setSelectedToolOutput(null)}
                                className="p-1 hover:bg-black/10 rounded-md transition-colors cursor-pointer"
                                title="Close sidebar"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 font-sans text-sm leading-relaxed select-text scrollbar-thin">
                            {selectedToolOutput.plainText ? (
                                <pre
                                    className="m-0 whitespace-pre-wrap break-words text-[12px] leading-relaxed font-mono"
                                    style={{ color: 'var(--pd-text-main)' }}
                                >
                                    {selectedToolOutput.content}
                                </pre>
                            ) : (
                                renderContent(selectedToolOutput.content)
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
