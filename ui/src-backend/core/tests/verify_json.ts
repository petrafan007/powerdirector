// @ts-nocheck

const findToolCall = (text: string): string | null => {
    // 1. Check for markdown blocks first (most reliable)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return jsonMatch[1].trim();

    // 2. Fallback to balanced brace search for raw JSON
    let searchIdx = 0;
    while (searchIdx < text.length) {
        const startIdx = text.indexOf('{', searchIdx);
        if (startIdx === -1) break;

        let depth = 0;
        let inString = false;
        let escaped = false;
        let foundMatch = false;

        for (let j = startIdx; j < text.length; j++) {
            const char = text[j];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
                    depth--;
                    if (depth === 0) {
                        const candidate = text.substring(startIdx, j + 1);
                        if (candidate.includes('"tool":') && candidate.includes('"args":')) {
                            return candidate;
                        }
                        searchIdx = j + 1;
                        foundMatch = true;
                        break;
                    }
                }
            }
        }

        if (!foundMatch) {
            searchIdx = startIdx + 1;
        }
    }
    return null;
};

const testCases = [
    {
        name: "Standard Markdown",
        input: 'Hello! ```json\n{"tool": "test", "args": {}}\n``` Bye.',
        expected: '{"tool": "test", "args": {}}'
    },
    {
        name: "Raw JSON with leading text",
        input: 'Here is the call: {"tool": "test", "args": {"code": "}"} } extra info',
        expected: '{"tool": "test", "args": {"code": "}"} }'
    },
    {
        name: "Multiple blocks, non-JSON text between",
        input: '{ "thought": "Thinking..." }\nSome garbage text here.\n{ "tool": "real_tool", "args": {} }',
        expected: '{ "tool": "real_tool", "args": {} }'
    },
    {
        name: "Nested braces in string",
        input: '{"tool": "edit", "args": {"text": "function() { return 1; }"}}',
        expected: '{"tool": "edit", "args": {"text": "function() { return 1; }"}}'
    },
    {
        name: "Escape characters",
        input: '{"tool": "msg", "args": {"text": "He said \\"Hello!\\" and then {something}"}}',
        expected: '{"tool": "msg", "args": {"text": "He said \\"Hello!\\" and then {something}"}}'
    }
];

let failed = false;
testCases.forEach(tc => {
    const result = findToolCall(tc.input);
    if (result === tc.expected) {
        console.log(`PASS: ${tc.name}`);
    } else {
        console.error(`FAIL: ${tc.name}`);
        console.error(`  Expected: ${tc.expected}`);
        console.error(`  Actual:   ${result}`);
        failed = true;
    }
});

if (failed) process.exit(1);
console.log("All tests passed!");
