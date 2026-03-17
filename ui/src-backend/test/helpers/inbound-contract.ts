import { expect } from "vitest";
import type { MsgContext } from '../../src/auto-reply/templating';
import { normalizeChatType } from '../../src/channels/chat-type';
import { resolveConversationLabel } from '../../src/channels/conversation-label';
import { validateSenderIdentity } from '../../src/channels/sender-identity';

export function expectInboundContextContract(ctx: MsgContext) {
  expect(validateSenderIdentity(ctx)).toEqual([]);

  expect(ctx.Body).toBeTypeOf("string");
  expect(ctx.BodyForAgent).toBeTypeOf("string");
  expect(ctx.BodyForCommands).toBeTypeOf("string");

  const chatType = normalizeChatType(ctx.ChatType);
  if (chatType && chatType !== "direct") {
    const label = ctx.ConversationLabel?.trim() || resolveConversationLabel(ctx);
    expect(label).toBeTruthy();
  }
}
