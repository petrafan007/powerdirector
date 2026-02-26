// @ts-nocheck
export interface ToolResult {
    output: string;
    isError?: boolean;
}

export interface Tool {
    name: string;
    description: string;
    parameters: any; // JSON Schema
    execute(args: any, options?: { callId?: string; sessionId?: string; onOutput?: (data: string) => void; signal?: AbortSignal }): Promise<ToolResult>;
}

export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    public register(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    public get(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    public list(): Tool[] {
        return Array.from(this.tools.values());
    }

    public getDefinitions(): any[] {
        return this.list().map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters
        }));
    }
}
