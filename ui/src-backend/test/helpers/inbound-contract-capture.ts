import type { MsgContext } from '../../src/auto-reply/templating';
import { buildDispatchInboundCaptureMock } from './dispatch-inbound-capture';

export type InboundContextCapture = {
  ctx: MsgContext | undefined;
};

export function createInboundContextCapture(): InboundContextCapture {
  return { ctx: undefined };
}

export async function buildDispatchInboundContextCapture(
  importOriginal: <T extends Record<string, unknown>>() => Promise<T>,
  capture: InboundContextCapture,
) {
  const actual = await importOriginal<typeof import('../../src/auto-reply/dispatch')>();
  return buildDispatchInboundCaptureMock(actual, (ctx) => {
    capture.ctx = ctx as MsgContext;
  });
}
