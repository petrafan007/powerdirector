// @ts-nocheck
import { getRuntimeLogger } from './logger';

export interface BindingEntry {
    agentId: string;
    match: {
        channel: string;
        accountId?: string;
        peer?: { kind: 'direct' | 'group' | 'channel' | 'dm'; id: string };
        guildId?: string;
        teamId?: string;
        roles?: string[];
    };
}

export interface BindingResolveInput {
    channelId?: string | null;
    accountId?: string | null;
    peer?: { kind?: string | null; id?: string | number | null } | null;
    parentPeer?: { kind?: string | null; id?: string | number | null } | null;
    guildId?: string | null;
    teamId?: string | null;
    memberRoleIds?: Array<string | number> | null;
    metadata?: any;
}

export interface BindingResolution {
    channelId: string;
    agentId: string;
    matchedBy?:
        | 'binding.peer'
        | 'binding.peer.parent'
        | 'binding.guild+roles'
        | 'binding.guild'
        | 'binding.team'
        | 'binding.account'
        | 'binding.channel';
    model?: string;
    systemPrompt?: string;
    tools?: string[];
}

type NormalizedPeerKind = 'direct' | 'group' | 'channel';

type NormalizedPeerConstraint =
    | { state: 'none' }
    | { state: 'invalid' }
    | { state: 'valid'; kind: NormalizedPeerKind; id: string };

type NormalizedBinding = {
    agentId: string;
    match: {
        channelId: string;
        accountPattern: string;
        peer: NormalizedPeerConstraint;
        guildId: string | null;
        teamId: string | null;
        roles: string[] | null;
    };
};

type BindingScope = {
    peer: { kind: NormalizedPeerKind; id: string } | null;
    guildId: string;
    teamId: string;
    memberRoleIds: Set<string>;
};

function normalizeToken(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

function normalizeString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'bigint') return String(value).trim();
    return '';
}

function normalizeChannelId(value: unknown): string {
    const normalized = normalizeToken(value);
    if (!normalized) return '';
    if (normalized === 'teams') return 'msteams';
    if (normalized === 'google-chat' || normalized === 'gchat') return 'googlechat';
    return normalized;
}

function normalizePeerKind(value: unknown): NormalizedPeerKind | undefined {
    const normalized = normalizeToken(value);
    if (!normalized) return undefined;
    if (normalized === 'direct' || normalized === 'dm') return 'direct';
    if (normalized === 'group') return 'group';
    if (normalized === 'channel') return 'channel';
    return undefined;
}

function normalizePeerConstraint(
    value?: { kind?: string | null; id?: string | number | null } | null
): NormalizedPeerConstraint {
    if (!value) return { state: 'none' };
    const kind = normalizePeerKind(value.kind);
    const id = normalizeString(value.id);
    if (!kind || !id) return { state: 'invalid' };
    return { state: 'valid', kind, id };
}

function normalizeAccountId(value: unknown): string {
    const normalized = normalizeString(value);
    return normalized || 'default';
}

function normalizeRoleList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const normalized: string[] = [];
    for (const entry of value) {
        const role = normalizeString(entry);
        if (!role) continue;
        normalized.push(role);
    }
    return normalized;
}

function firstDefined(...values: unknown[]): unknown {
    for (const value of values) {
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
}

function matchesAccountId(matchPattern: string, actualAccountId: string): boolean {
    const pattern = normalizeString(matchPattern);
    if (!pattern) return actualAccountId === 'default';
    if (pattern === '*') return true;
    return pattern === actualAccountId;
}

function hasGuildConstraint(match: NormalizedBinding['match']): boolean {
    return Boolean(match.guildId);
}

function hasTeamConstraint(match: NormalizedBinding['match']): boolean {
    return Boolean(match.teamId);
}

function hasRolesConstraint(match: NormalizedBinding['match']): boolean {
    return Array.isArray(match.roles) && match.roles.length > 0;
}

function matchesBindingScope(match: NormalizedBinding['match'], scope: BindingScope): boolean {
    if (match.peer.state === 'invalid') {
        return false;
    }
    if (match.peer.state === 'valid') {
        if (!scope.peer || scope.peer.kind !== match.peer.kind || scope.peer.id !== match.peer.id) {
            return false;
        }
    }
    if (match.guildId && match.guildId !== scope.guildId) {
        return false;
    }
    if (match.teamId && match.teamId !== scope.teamId) {
        return false;
    }
    if (match.roles) {
        for (const role of match.roles) {
            if (scope.memberRoleIds.has(role)) {
                return true;
            }
        }
        return false;
    }
    return true;
}

export class BindingsManager {
    private readonly logger = getRuntimeLogger();
    private readonly bindings: NormalizedBinding[] = [];

    constructor(entries: BindingEntry[] = []) {
        for (const raw of entries || []) {
            const binding = this.normalizeBinding(raw);
            if (!binding) continue;
            this.bindings.push(binding);
        }
    }

    public resolve(input: string | BindingResolveInput | undefined | null): BindingResolution | null {
        const context = this.normalizeContext(input);
        if (!context.channelId) {
            return null;
        }
        if (this.bindings.length === 0) {
            return null;
        }

        const candidates = this.bindings.filter((binding) => {
            if (binding.match.channelId !== context.channelId) return false;
            return matchesAccountId(binding.match.accountPattern, context.accountId);
        });

        if (candidates.length === 0) {
            return null;
        }

        const baseScope: Omit<BindingScope, 'peer'> = {
            guildId: context.guildId,
            teamId: context.teamId,
            memberRoleIds: new Set(context.memberRoleIds)
        };

        const tiers: Array<{
            matchedBy: NonNullable<BindingResolution['matchedBy']>;
            enabled: boolean;
            scopePeer: { kind: NormalizedPeerKind; id: string } | null;
            predicate: (binding: NormalizedBinding) => boolean;
        }> = [
            {
                matchedBy: 'binding.peer',
                enabled: Boolean(context.peer),
                scopePeer: context.peer,
                predicate: (binding) => binding.match.peer.state === 'valid'
            },
            {
                matchedBy: 'binding.peer.parent',
                enabled: Boolean(context.parentPeer),
                scopePeer: context.parentPeer,
                predicate: (binding) => binding.match.peer.state === 'valid'
            },
            {
                matchedBy: 'binding.guild+roles',
                enabled: Boolean(context.guildId && context.memberRoleIds.length > 0),
                scopePeer: context.peer,
                predicate: (binding) =>
                    hasGuildConstraint(binding.match) && hasRolesConstraint(binding.match)
            },
            {
                matchedBy: 'binding.guild',
                enabled: Boolean(context.guildId),
                scopePeer: context.peer,
                predicate: (binding) =>
                    hasGuildConstraint(binding.match) && !hasRolesConstraint(binding.match)
            },
            {
                matchedBy: 'binding.team',
                enabled: Boolean(context.teamId),
                scopePeer: context.peer,
                predicate: (binding) => hasTeamConstraint(binding.match)
            },
            {
                matchedBy: 'binding.account',
                enabled: true,
                scopePeer: context.peer,
                predicate: (binding) => binding.match.accountPattern !== '*'
            },
            {
                matchedBy: 'binding.channel',
                enabled: true,
                scopePeer: context.peer,
                predicate: (binding) => binding.match.accountPattern === '*'
            }
        ];

        for (const tier of tiers) {
            if (!tier.enabled) continue;
            const matched = candidates.find((candidate) =>
                tier.predicate(candidate)
                && matchesBindingScope(candidate.match, { ...baseScope, peer: tier.scopePeer })
            );
            if (matched) {
                return {
                    channelId: context.channelId,
                    agentId: matched.agentId,
                    matchedBy: tier.matchedBy
                };
            }
        }

        return null;
    }

    private normalizeBinding(raw: BindingEntry): NormalizedBinding | null {
        const agentId = normalizeString(raw?.agentId);
        const match = raw?.match;
        const channelId = normalizeChannelId(match?.channel);
        if (!agentId || !channelId) {
            this.logger.warn('Skipping binding with missing agentId or match.channel.');
            return null;
        }

        const roles = normalizeRoleList(match?.roles);
        return {
            agentId,
            match: {
                channelId,
                accountPattern: normalizeString(match?.accountId),
                peer: normalizePeerConstraint(match?.peer),
                guildId: normalizeString(match?.guildId) || null,
                teamId: normalizeString(match?.teamId) || null,
                roles: roles.length > 0 ? roles : null
            }
        };
    }

    private normalizeContext(input: string | BindingResolveInput | undefined | null): {
        channelId: string;
        accountId: string;
        peer: { kind: NormalizedPeerKind; id: string } | null;
        parentPeer: { kind: NormalizedPeerKind; id: string } | null;
        guildId: string;
        teamId: string;
        memberRoleIds: string[];
    } {
        if (typeof input === 'string') {
            return {
                channelId: normalizeChannelId(input),
                accountId: 'default',
                peer: null,
                parentPeer: null,
                guildId: '',
                teamId: '',
                memberRoleIds: []
            };
        }

        const metadata = input?.metadata && typeof input.metadata === 'object'
            ? input.metadata
            : {};

        const channelId = normalizeChannelId(firstDefined(input?.channelId, metadata.channelId));
        const accountId = normalizeAccountId(firstDefined(
            input?.accountId,
            metadata.accountId,
            metadata?.account?.accountId,
            metadata?.account?.id
        ));

        const peerConstraint = normalizePeerConstraint(
            (input?.peer as any) ?? (metadata?.peer as any)
        );
        const parentPeerConstraint = normalizePeerConstraint(
            (input?.parentPeer as any) ?? (metadata?.parentPeer as any)
        );

        const guildId = normalizeString(firstDefined(input?.guildId, metadata.guildId, metadata?.guild?.id));
        const teamId = normalizeString(firstDefined(input?.teamId, metadata.teamId, metadata?.teamId, metadata?.team?.id, metadata?.team));
        const memberRoleIds = normalizeRoleList(
            firstDefined(input?.memberRoleIds, metadata.memberRoleIds, metadata?.member?.roles, metadata.roles)
        );

        return {
            channelId,
            accountId,
            peer: peerConstraint.state === 'valid' ? { kind: peerConstraint.kind, id: peerConstraint.id } : null,
            parentPeer: parentPeerConstraint.state === 'valid'
                ? { kind: parentPeerConstraint.kind, id: parentPeerConstraint.id }
                : null,
            guildId,
            teamId,
            memberRoleIds
        };
    }
}
