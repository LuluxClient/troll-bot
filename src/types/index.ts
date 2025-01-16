export interface Sound {
    id: string;
    title: string;
    filename: string;
    addedBy: string;
    addedAt: string;
}

export interface ForcedNickname {
    userId: string;
    nickname: string;
    originalNickname: string | null;
    expiresAt: number;
}

export interface UnbanData {
    lastUnban: number;
    inviteLinks: { [guildId: string]: string };
}

export interface ServerSettings {
    defaultVolume: number;
}

export interface ServerData {
    sounds: Sound[];
    allowedUsers: string[];
    blacklist: string[];
    forcedNicknames: ForcedNickname[];
    settings: ServerSettings;
}

export interface DatabaseSchema {
    servers: {
        [guildId: string]: ServerData;
    };
    unban: UnbanData;
} 