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
    settings: {
        defaultVolume: number;
    };
    forcedNicknames: ForcedNickname[];
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