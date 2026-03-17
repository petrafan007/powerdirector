// @ts-nocheck
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base';
import imap, { ImapSimple } from 'imap-simple';
import nodemailer from 'nodemailer';

interface EmailChannelOptions {
    user?: string;
    pass?: string;
    imapHost?: string;
    imapPort?: number;
    smtpHost?: string;
    smtpPort?: number;
}

export class EmailChannel implements Channel {
    public id = 'email';
    public name = 'Email';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'EmailChannel';

    private connection: ImapSimple | null = null;
    private transporter: nodemailer.Transporter | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private pollInterval: NodeJS.Timeout | null = null;
    private options: EmailChannelOptions;
    private lastError?: string;

    constructor(options: EmailChannelOptions = {}) {
        this.options = options;
        const user = this.options.user || process.env.EMAIL_USER || process.env.GMAIL_USER;
        const pass = this.options.pass || process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
        const smtpHost = this.options.smtpHost || process.env.SMTP_HOST;
        const smtpPort = this.options.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined);

        if (user && pass) {
            if (smtpHost && smtpPort) {
                this.transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpPort === 465,
                    auth: { user, pass }
                });
            } else {
                this.transporter = nodemailer.createTransport({
                    service: 'gmail', // Default to gmail for now, or use host/port from config
                    auth: { user, pass }
                });
            }
        }
    }

    async start(): Promise<void> {
        const user = this.options.user || process.env.EMAIL_USER || process.env.GMAIL_USER;
        const pass = this.options.pass || process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
        const host = this.options.imapHost || process.env.IMAP_HOST || 'imap.gmail.com';
        const port = this.options.imapPort || parseInt(process.env.IMAP_PORT || '993', 10);

        if (!user || !pass) {
            console.log('Email channel skipped (missing credentials).');
            return;
        }

        const config = {
            imap: {
                user,
                password: pass,
                host,
                port,
                tls: true,
                authTimeout: 3000
            }
        };

        try {
            this.connection = await imap.connect(config);
            await this.connection.openBox('INBOX');
            this.lastError = undefined;
            console.log('Email Channel connected (IMAP).');

            // Start polling
            this.pollInterval = setInterval(() => this.pollEmails(), 60000); // Check every minute
            this.pollEmails(); // Check immediately on start
        } catch (error: any) {
            this.lastError = error.message;
            console.error('Failed to start Email Channel:', error);
        }
    }

    private async pollEmails() {
        if (!this.connection || !this.messageHandler) return;

        try {
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT'],
                markSeen: true
            };

            const messages = await this.connection.search(searchCriteria, fetchOptions);

            for (const item of messages) {
                const header = item.parts.find((part: any) => part.which === 'HEADER');
                const textPart = item.parts.find((part: any) => part.which === 'TEXT');

                const subject = header?.body?.subject?.[0] || '(No Subject)';
                const from = header?.body?.from?.[0] || 'Unknown';
                const body = textPart?.body || '';
                const id = item.attributes.uid.toString();

                const channelMsg: ChannelMessage = {
                    id: id,
                    channelId: 'email', // effectively global for this account
                    content: `Subject: ${subject}\n\n${body}`,
                    senderId: from,
                    replyToId: from,
                    timestamp: Date.now(),
                    metadata: { subject, from, uid: id }
                };

                this.messageHandler(channelMsg);
            }
        } catch (error) {
            console.error('Error polling emails:', error);
        }
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.connection) {
            this.connection.end();
            console.log('Stopping Email Channel...');
        }
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.transporter) return;

        try {
            const info = await this.transporter.sendMail({
                from: this.options.user || process.env.EMAIL_USER || process.env.GMAIL_USER,
                to: recipientId,
                subject: 'Message from PowerDirector Agent',
                text: typeof content === 'string' ? content : JSON.stringify(content)
            });
            console.log(`Email sent to ${recipientId}: ${info.messageId}`);
        } catch (error) {
            console.error(`Failed to send email to ${recipientId}:`, error);
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: !!this.connection,
            running: !!this.pollInterval,
            error: this.lastError
        };
    }

    async probe() {
        if (this.connection) return { ok: true };
        // Try a quick connection test
        try {
            const user = this.options.user || process.env.EMAIL_USER || process.env.GMAIL_USER;
            const pass = this.options.pass || process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
            if (!user || !pass) return { ok: false, error: 'Missing credentials' };
            return { ok: true }; // Assume OK if we have creds, or do a full connect? 
            // Better to just return current state.
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
