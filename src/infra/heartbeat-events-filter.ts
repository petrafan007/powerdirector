import { HEARTBEAT_TOKEN } from "../auto-reply/tokens.js";

/**
 * Build a prompt for exec-completion events.
 * When `deliverToUser` is true, instructs the model to relay the result to the user.
 * When false (no delivery channel), instructs the model to process silently.
 */
export function buildExecEventPrompt(opts: { deliverToUser: boolean }): string {
  if (opts.deliverToUser) {
    return (
      "An async command you ran earlier has completed. The result is shown in the system messages above. " +
      "Please relay the command output to the user in a helpful way. If the command succeeded, share the relevant output. " +
      "If it failed, explain what went wrong."
    );
  }
  return (
    "An async command you ran earlier has completed. The result is shown in the system messages above. " +
    "Process the result silently — there is no active delivery channel to relay to. " +
    "Update your internal state if needed and reply HEARTBEAT_OK."
  );
}

// Build a dynamic prompt for cron events by embedding the actual event content.
// This ensures the model sees the reminder text directly instead of relying on
// "shown in the system messages above" which may not be visible in context.
export function buildCronEventPrompt(
  pendingEvents: string[],
  opts?: { deliverToUser?: boolean },
): string {
  const eventText = pendingEvents.join("\n").trim();
  if (!eventText) {
    return (
      "A scheduled cron event was triggered, but no event content was found. " +
      "Reply HEARTBEAT_OK."
    );
  }
  if (opts?.deliverToUser === false) {
    return (
      "A scheduled reminder has been triggered. The reminder content is:\n\n" +
      eventText +
      "\n\nThere is no active delivery channel — process this reminder silently and reply HEARTBEAT_OK."
    );
  }
  return (
    "A scheduled reminder has been triggered. The reminder content is:\n\n" +
    eventText +
    "\n\nPlease relay this reminder to the user in a helpful and friendly way."
  );
}


const HEARTBEAT_OK_PREFIX = HEARTBEAT_TOKEN.toLowerCase();

// Detect heartbeat-specific noise so cron reminders don't trigger on non-reminder events.
function isHeartbeatAckEvent(evt: string): boolean {
  const trimmed = evt.trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith(HEARTBEAT_OK_PREFIX)) {
    return false;
  }
  const suffix = lower.slice(HEARTBEAT_OK_PREFIX.length);
  if (suffix.length === 0) {
    return true;
  }
  return !/[a-z0-9_]/.test(suffix[0]);
}

function isHeartbeatNoiseEvent(evt: string): boolean {
  const lower = evt.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  return (
    isHeartbeatAckEvent(lower) ||
    lower.includes("heartbeat poll") ||
    lower.includes("heartbeat wake")
  );
}

export function isExecCompletionEvent(evt: string): boolean {
  return evt.toLowerCase().includes("exec finished");
}

// Returns true when a system event should be treated as real cron reminder content.
export function isCronSystemEvent(evt: string) {
  if (!evt.trim()) {
    return false;
  }
  return !isHeartbeatNoiseEvent(evt) && !isExecCompletionEvent(evt);
}
