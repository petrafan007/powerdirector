// @ts-nocheck
import { Tool, ToolResult } from './base';
import fs from 'node:fs/promises';
import path from 'node:path';

interface FileSystemToolOptions {
    baseDir?: string;
}


export class ReadFileTool implements Tool {
    public name = 'read_file';
    public description = 'Read the content of a file. Provide the absolute path to the file.';
    public parameters = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Absolute path to the file' }
        },
        required: ['path']
    };
    private readonly baseDir?: string;

    constructor(options: FileSystemToolOptions = {}) {
        this.baseDir = options.baseDir;
    }

    async execute(args: any): Promise<ToolResult> {
        const { path: targetPath } = args;
        try {
            if (!targetPath) throw new Error('Path is required');
            const resolvedPath = path.isAbsolute(targetPath)
                ? path.resolve(targetPath)
                : path.resolve(this.baseDir || process.cwd(), targetPath);
            const data = await fs.readFile(resolvedPath, 'utf-8');
            return { output: data };
        } catch (error: any) {
            return { output: `Error: ${error.message}`, isError: true };
        }
    }
}

export class WriteFileTool implements Tool {
    public name = 'write_file';
    public description = 'Write content to a file. Provide the absolute path and the content to write.';
    public parameters = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
            content: { type: 'string', description: 'Content to write' }
        },
        required: ['path', 'content']
    };
    private readonly baseDir?: string;

    constructor(options: FileSystemToolOptions = {}) {
        this.baseDir = options.baseDir;
    }

    async execute(args: any): Promise<ToolResult> {
        const { path: targetPath, content } = args;
        try {
            if (!targetPath) throw new Error('Path is required');
            if (content === undefined) throw new Error('Content is required');
            const resolvedPath = path.isAbsolute(targetPath)
                ? path.resolve(targetPath)
                : path.resolve(this.baseDir || process.cwd(), targetPath);

            // Ensure directory exists
            await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

            await fs.writeFile(resolvedPath, content, 'utf-8');
            return { output: `Successfully wrote to ${resolvedPath}` };
        } catch (error: any) {
            return { output: `Error: ${error.message}`, isError: true };
        }
    }
}

export class ListFilesTool implements Tool {
    public name = 'list_files';
    public description = 'List the contents of a directory. Provide the absolute path to the directory.';
    public parameters = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Absolute path to the directory' }
        },
        required: ['path']
    };
    private readonly baseDir?: string;

    constructor(options: FileSystemToolOptions = {}) {
        this.baseDir = options.baseDir;
    }

    async execute(args: any): Promise<ToolResult> {
        const { path: targetPath } = args;
        try {
            if (!targetPath) throw new Error('Path is required');
            const resolvedPath = path.isAbsolute(targetPath)
                ? path.resolve(targetPath)
                : path.resolve(this.baseDir || process.cwd(), targetPath);
            const items = await fs.readdir(resolvedPath);
            return { output: items.join('\n') };
        } catch (error: any) {
            return { output: `Error: ${error.message}`, isError: true };
        }
    }
}

export class ReplaceFileTool implements Tool {
    public name = 'replace';
    public description = 'Replace exact text in a file. Required parameters: path (absolute), old_string (the exact block of text to remove), new_string (what to put in its place). Ensure old_string perfectly matches the existing file contents.';
    public parameters = {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
            old_string: { type: 'string', description: 'Exact string block to search for and replace' },
            new_string: { type: 'string', description: 'The replacement string block' }
        },
        required: ['path', 'old_string', 'new_string']
    };
    private readonly baseDir?: string;

    constructor(options: FileSystemToolOptions = {}) {
        this.baseDir = options.baseDir;
    }

    async execute(args: any): Promise<ToolResult> {
        const { path: targetPath, old_string, new_string } = args;
        try {
            if (!targetPath) throw new Error('Path is required');
            if (old_string === undefined || new_string === undefined) {
                throw new Error('Both old_string and new_string are required');
            }

            const resolvedPath = path.isAbsolute(targetPath)
                ? path.resolve(targetPath)
                : path.resolve(this.baseDir || process.cwd(), targetPath);

            const content = await fs.readFile(resolvedPath, 'utf-8');

            if (!content.includes(old_string)) {
                return { output: 'Error: old_string not found in file. Please ensure exact match including whitespace.', isError: true };
            }

            const updatedContent = content.replace(old_string, new_string);
            await fs.writeFile(resolvedPath, updatedContent, 'utf-8');
            return { output: `Successfully replaced text in ${resolvedPath}` };
        } catch (error: any) {
            return { output: `Error: ${error.message}`, isError: true };
        }
    }
}
