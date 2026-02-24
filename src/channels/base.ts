// @ts-nocheck
export interface ChannelConfig {
    id: string;
    type: 'telegram' | 'whatsapp' | 'slack' | 'discord';
    enabled: boolean;
    credentials: Record<string, any>; // API keys, tokens
}

export interface ChannelMessage {
    id: string;
    channelId: string;
    content: string;
    senderId: string;
    // Conversation target to reply to (room/channel/chat/thread/etc.).
    replyToId?: string;
    timestamp: number;
    metadata?: any;
}


export type ChannelType = 'messaging' | 'voice' | 'video' | 'web' | 'other';
export type ChannelClassName = 'TelegramChannel' | 'WhatsAppChannel' | 'SlackChannel' | 'DiscordChannel' | string;

export interface Channel {
    id: string;
    name: string;
    type: ChannelType;
    className?: ChannelClassName;

    start(): Promise<void>;
    stop(): Promise<void>;

    send(recipientId: string, content: string | any): Promise<void>;

    onMessage(handler: (msg: ChannelMessage) => void): void;

    getStatus(): { connected: boolean; running: boolean; error?: string };
    probe(): Promise<{ ok: boolean; error?: string }>;
    logout?(): Promise<void>;
}
