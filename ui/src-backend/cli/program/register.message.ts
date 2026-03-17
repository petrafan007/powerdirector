import type { Command } from "commander";
import { formatDocsLink } from '../../terminal/links';
import { theme } from '../../terminal/theme';
import { formatHelpExamples } from '../help-format';
import type { ProgramContext } from './context';
import { createMessageCliHelpers } from './message/helpers';
import { registerMessageBroadcastCommand } from './message/register.broadcast';
import { registerMessageDiscordAdminCommands } from './message/register.discord-admin';
import {
  registerMessageEmojiCommands,
  registerMessageStickerCommands,
} from './message/register.emoji-sticker';
import {
  registerMessagePermissionsCommand,
  registerMessageSearchCommand,
} from './message/register.permissions-search';
import { registerMessagePinCommands } from './message/register.pins';
import { registerMessagePollCommand } from './message/register.poll';
import { registerMessageReactionsCommands } from './message/register.reactions';
import { registerMessageReadEditDeleteCommands } from './message/register.read-edit-delete';
import { registerMessageSendCommand } from './message/register.send';
import { registerMessageThreadCommands } from './message/register.thread';

export function registerMessageCommands(program: Command, ctx: ProgramContext) {
  const message = program
    .command("message")
    .description("Send, read, and manage messages and channel actions")
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  ['powerdirector message send --target +15555550123 --message "Hi"', "Send a text message."],
  [
    'powerdirector message send --target +15555550123 --message "Hi" --media photo.jpg',
    "Send a message with media.",
  ],
  [
    'powerdirector message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi',
    "Create a Discord poll.",
  ],
  [
    'powerdirector message react --channel discord --target 123 --message-id 456 --emoji "✅"',
    "React to a message.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/message", "docs.powerdirector.ai/cli/message")}`,
    )
    .action(() => {
      message.help({ error: true });
    });

  const helpers = createMessageCliHelpers(message, ctx.messageChannelOptions);
  registerMessageSendCommand(message, helpers);
  registerMessageBroadcastCommand(message, helpers);
  registerMessagePollCommand(message, helpers);
  registerMessageReactionsCommands(message, helpers);
  registerMessageReadEditDeleteCommands(message, helpers);
  registerMessagePinCommands(message, helpers);
  registerMessagePermissionsCommand(message, helpers);
  registerMessageSearchCommand(message, helpers);
  registerMessageThreadCommands(message, helpers);
  registerMessageEmojiCommands(message, helpers);
  registerMessageStickerCommands(message, helpers);
  registerMessageDiscordAdminCommands(message, helpers);
}
