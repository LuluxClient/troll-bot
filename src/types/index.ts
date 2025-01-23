export interface DatabaseSchema {
    servers: { [guildId: string]: ServerData };
    unban: {
        lastUnban: number;
        inviteLinks: { [guildId: string]: string };
    };
}

export interface ServerData {
    sounds: Sound[];
    allowedUsers: string[];
    blacklist: string[];
    forcedNicknames: ForcedNickname[];
    factCheckUsers: string[];
    factCheckEnabled: { [userId: string]: boolean };
    factCheckGlobalEnabled: boolean;
    factCheckStats: { [userId: string]: FactCheckStats };
    settings: {
        defaultVolume: number;
    };
}

export interface Sound {
    id: string;
    title: string;
    filename: string;
    addedBy: string;
    addedAt: string;
}

export interface ForcedNickname {
    guildId: string;
    userId: string;
    nickname: string;
    originalNickname: string | null;
    expiresAt: number;
    forcedBy: string;
}

export interface FactCheckStats {
    totalChecks: number;
    correctCount: number;
    incorrectCount: number;
    lastChecked: number;
}