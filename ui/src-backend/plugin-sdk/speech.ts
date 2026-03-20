// Public speech-provider builders for bundled or third-party plugins.

export { buildElevenLabsSpeechProvider } from "../tts/providers/elevenlabs";
export { buildMicrosoftSpeechProvider } from "../tts/providers/microsoft";
export { buildOpenAISpeechProvider } from "../tts/providers/openai";
export { parseTtsDirectives } from "../tts/tts-core";
export type { SpeechVoiceOption } from "../tts/provider-types";
