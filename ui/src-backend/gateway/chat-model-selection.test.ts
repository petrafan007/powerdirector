import { describe, expect, it } from 'vitest';
import { hasExplicitDefaultModelSelection, shouldUseConfiguredDefaultChain } from '../../ui/lib/chat-model-selection';

describe('chat-model-selection', () => {
    it('treats explicit default picker values as configured-default routing', () => {
        expect(hasExplicitDefaultModelSelection('default', 'default')).toBe(true);
        expect(hasExplicitDefaultModelSelection(undefined, 'default')).toBe(true);
        expect(hasExplicitDefaultModelSelection(undefined, 'default/default')).toBe(true);
    });

    it('does not treat explicit provider/model overrides as configured-default routing', () => {
        expect(hasExplicitDefaultModelSelection('openai-codex', 'gpt-5.4')).toBe(false);
        expect(hasExplicitDefaultModelSelection(undefined, 'openai-codex/gpt-5.4')).toBe(false);
    });

    it('prefers the explicit default-chain flag from the client', () => {
        expect(shouldUseConfiguredDefaultChain({
            provider: undefined,
            model: undefined,
            useDefaultModelChain: true
        })).toBe(true);
    });
});
