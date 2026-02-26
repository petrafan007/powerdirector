// @ts-nocheck
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base.ts';

export class DiscordChannel implements Channel {
    public id = 'discord';
    public name = 'Discord';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'DiscordChannel';

    private client: Client | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private token?: string;

    constructor(token?: string) {
        this.token = token || process.env.DISCORD_TOKEN;
        if (this.token) {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.DirectMessages
                ],
                partials: [Partials.Channel] // Required for DMs
            });
        }
    }

    async start(): Promise<void> {
        if (!this.client) {
            console.log('Discord channel skipped (missing bot token).');
            return;
        }

        try {
            this.client.on('ready', () => {
                console.log(`Discord Channel logged in as ${this.client?.user?.tag}!`);
            });

            this.client.on('messageCreate', async (message) => {
                if (message.author.bot) return; // Ignore bots
                if (!this.messageHandler) return;

                const channelMsg: ChannelMessage = {
                    id: message.id,
                    channelId: this.id,
                    content: message.content,
                    senderId: message.author.id,
                    replyToId: message.channelId,
                    timestamp: message.createdTimestamp,
                    metadata: {
                        username: message.author.username,
                        discriminator: message.author.discriminator,
                        guildId: message.guildId,
                        attachments: message.attachments.map(a => ({
                            url: a.url,
                            name: a.name,
                            contentType: a.contentType
                        }))
                    }
                };

                this.messageHandler(channelMsg);
            });

            // Components v2: Handle interactions
            this.client.on('interactionCreate', async (interaction) => {
                if (!this.messageHandler) return;

                if (interaction.isButton() || interaction.isStringSelectMenu()) {
                    let content = '';
                    if (interaction.isButton()) {
                        content = `[Button Click] ${interaction.customId}`;
                    } else if (interaction.isStringSelectMenu()) {
                        content = `[Select Menu] ${interaction.customId}: ${interaction.values.join(', ')}`;
                    }

                    // Acknowledge to prevent "This interaction failed"
                    try {
                        await interaction.deferUpdate();
                    } catch (e) {
                        // Ignore if already replied
                    }

                    const channelMsg: ChannelMessage = {
                        id: interaction.id,
                        channelId: this.id,
                        content: content,
                        senderId: interaction.user.id,
                        replyToId: interaction.channelId || undefined,
                        timestamp: interaction.createdTimestamp,
                        metadata: {
                            username: interaction.user.username,
                            discriminator: interaction.user.discriminator,
                            guildId: interaction.guildId,
                            interaction: {
                                type: interaction.type,
                                customId: interaction.customId,
                                values: interaction.isStringSelectMenu() ? interaction.values : undefined
                            }
                        }
                    };
                    this.messageHandler(channelMsg);
                }
            });

            await this.client.login(this.token);
        } catch (error) {
            console.error('Failed to start Discord Client:', error);
        }
    }

    async stop(): Promise<void> {
        if (this.client) {
            console.log('Stopping Discord Channel...');
            await this.client.destroy();
        }
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.client) return;

        try {
            const channel = await this.client.channels.fetch(recipientId);
            if (channel && channel.isTextBased() && 'send' in channel) {
                if (typeof content === 'string') {
                    await (channel as any).send(content);
                } else if (typeof content === 'object') {
                    // Support for rich messages (embeds, components)
                    // Content structure expected: { content?: string, embeds?: [], components?: [] }
                    // Or raw Discord message options
                    await (channel as any).send(content);
                }
            } else {
                console.error(`Discord channel ${recipientId} not found or not text-based.`);
            }
        } catch (error) {
            console.error(`Failed to send Discord message to ${recipientId}:`, error);
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.client?.isReady() || false,
            running: !!this.client
        };
    }

    async probe() {
        if (!this.client) return { ok: false, error: 'Client not initialized' };
        try {
            if (!this.client.isReady()) await this.client.login(this.token);
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
