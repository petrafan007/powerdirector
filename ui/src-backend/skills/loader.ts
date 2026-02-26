// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { Skill, SkillEntry, ParsedSkillFrontmatter } from './types';
import { getRuntimeLogger } from '../core/logger.ts';

export class SkillLoader {
    private logger = getRuntimeLogger();

    public loadSkillsFromDir(baseDir: string): Skill[] {
        if (!fs.existsSync(baseDir)) {
            return [];
        }

        const skills: Skill[] = [];
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillDir = path.join(baseDir, entry.name);
                const skill = this.loadSkillFromDir(skillDir, entry.name);
                if (skill) {
                    skills.push(skill);
                }
            }
        }

        return skills;
    }

    private loadSkillFromDir(dir: string, dirName: string): Skill | null {
        const pkgJsonPath = path.join(dir, 'package.json');
        const skillMdPath = path.join(dir, 'SKILL.md');
        const runSh = path.join(dir, 'run.sh');
        const runJs = path.join(dir, 'run.js');
        const runCjs = path.join(dir, 'run.cjs');
        const runMjs = path.join(dir, 'run.mjs');

        const hasEntrypoint = fs.existsSync(pkgJsonPath) ||
            fs.existsSync(runSh) ||
            fs.existsSync(runJs) ||
            fs.existsSync(runCjs) ||
            fs.existsSync(runMjs);

        const hasSkillMd = fs.existsSync(skillMdPath);

        // A skill must have either an entrypoint OR a SKILL.md definition
        if (!hasEntrypoint && !hasSkillMd) {
            return null;
        }

        let name = dirName;
        let description = '';
        let env: any[] = [];
        let frontmatter: ParsedSkillFrontmatter = {};

        // 1. Try to load metadata from package.json
        if (fs.existsSync(pkgJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                if (pkg.name) name = pkg.name;
                if (pkg.description) description = pkg.description;
                if (pkg.skill?.env) env = pkg.skill.env;
            } catch (e) {
                this.logger.warn(`Failed to parse package.json for skill ${dirName}`, e);
            }
        }

        // 2. Try to load metadata from SKILL.md frontmatter
        if (hasSkillMd) {
            try {
                const content = fs.readFileSync(skillMdPath, 'utf8');
                frontmatter = SkillLoader.parseFrontmatter(content);
                if (frontmatter.name) name = frontmatter.name;
                if (frontmatter.description) description = frontmatter.description;
                // Merge env? For now, package.json takes precedence if both exist, 
                // but usually it's one or the other.
            } catch (e) {
                this.logger.warn(`Failed to parse SKILL.md for skill ${dirName}`, e);
            }
        }

        return {
            name,
            description,
            baseDir: dir,
            filePath: dir,
            env,
            frontmatter
        };
    }

    public static parseFrontmatter(content: string): ParsedSkillFrontmatter {
        try {
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (match && match[1]) {
                const parsed = YAML.parse(match[1]);
                return parsed || {};
            }
        } catch (e) {
            // ignore
        }
        return {};
    }
}
