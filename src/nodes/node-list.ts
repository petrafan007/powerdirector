// @ts-nocheck
import { DevicePairingList, isNodePairingEntry } from './device-pairing.js';
import { NodeInfo, NodeManager } from './manager.js';

export type ListedNode = {
    nodeId: string;
    displayName?: string;
    platform?: string;
    version?: string;
    coreVersion?: string;
    uiVersion?: string;
    deviceFamily?: string;
    modelIdentifier?: string;
    remoteIp?: string;
    caps: string[];
    commands: string[];
    pathEnv?: string[];
    permissions?: string[];
    connectedAtMs?: number;
    paired: boolean;
    connected: boolean;
};

function uniqueSortedStrings(values: unknown[]): string[] {
    return [...new Set(values.filter((value) => typeof value === 'string'))]
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
        .sort();
}

function mapConnectedNode(node: NodeInfo): ListedNode {
    const displayName = typeof node.displayName === 'string' && node.displayName.trim()
        ? node.displayName.trim()
        : (typeof node.name === 'string' && node.name.trim() ? node.name.trim() : node.id);
    return {
        nodeId: node.id,
        displayName,
        platform: node.platform,
        version: node.version,
        coreVersion: node.coreVersion,
        uiVersion: node.uiVersion,
        deviceFamily: node.deviceFamily,
        modelIdentifier: node.modelIdentifier,
        remoteIp: node.remoteIp,
        caps: uniqueSortedStrings(node.capabilities || []),
        commands: uniqueSortedStrings(node.commands || []),
        pathEnv: Array.isArray(node.pathEnv) ? uniqueSortedStrings(node.pathEnv) : undefined,
        permissions: Array.isArray(node.permissions) ? uniqueSortedStrings(node.permissions) : undefined,
        connectedAtMs: node.connectedAtMs ?? node.lastSeen,
        paired: false,
        connected: node.status === 'online'
    };
}

export function buildNodeList(nodeManager: NodeManager, pairing: DevicePairingList): ListedNode[] {
    const connected = nodeManager.getNodes();
    const pairedById = new Map<string, ListedNode>();
    for (const entry of pairing.paired) {
        if (!isNodePairingEntry(entry)) continue;
        const nodeId = typeof entry.deviceId === 'string' ? entry.deviceId.trim() : '';
        if (!nodeId) continue;
        pairedById.set(nodeId, {
            nodeId,
            displayName: entry.displayName,
            platform: entry.platform as ListedNode['platform'],
            version: undefined,
            coreVersion: undefined,
            uiVersion: undefined,
            deviceFamily: undefined,
            modelIdentifier: undefined,
            remoteIp: entry.remoteIp,
            caps: [],
            commands: [],
            pathEnv: undefined,
            permissions: undefined,
            connectedAtMs: undefined,
            paired: true,
            connected: false
        });
    }

    const connectedById = new Map<string, ListedNode>();
    for (const node of connected) {
        connectedById.set(node.id, mapConnectedNode(node));
    }

    const nodeIds = new Set<string>([
        ...pairedById.keys(),
        ...connectedById.keys()
    ]);

    const list: ListedNode[] = [];
    for (const nodeId of nodeIds) {
        const paired = pairedById.get(nodeId);
        const live = connectedById.get(nodeId);
        const node: ListedNode = {
            nodeId,
            displayName: live?.displayName ?? paired?.displayName,
            platform: live?.platform ?? paired?.platform,
            version: live?.version ?? paired?.version,
            coreVersion: live?.coreVersion ?? paired?.coreVersion,
            uiVersion: live?.uiVersion ?? paired?.uiVersion,
            deviceFamily: live?.deviceFamily ?? paired?.deviceFamily,
            modelIdentifier: live?.modelIdentifier ?? paired?.modelIdentifier,
            remoteIp: live?.remoteIp ?? paired?.remoteIp,
            caps: uniqueSortedStrings([...(live?.caps || []), ...(paired?.caps || [])]),
            commands: uniqueSortedStrings([...(live?.commands || []), ...(paired?.commands || [])]),
            pathEnv: live?.pathEnv,
            permissions: live?.permissions ?? paired?.permissions,
            connectedAtMs: live?.connectedAtMs,
            paired: Boolean(paired),
            connected: Boolean(live?.connected)
        };
        list.push(node);
    }

    list.sort((a, b) => {
        if (a.connected !== b.connected) {
            return a.connected ? -1 : 1;
        }
        const aLabel = (a.displayName ?? a.nodeId).toLowerCase();
        const bLabel = (b.displayName ?? b.nodeId).toLowerCase();
        if (aLabel < bLabel) return -1;
        if (aLabel > bLabel) return 1;
        return a.nodeId.localeCompare(b.nodeId);
    });

    return list;
}
