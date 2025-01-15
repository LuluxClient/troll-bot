export interface Sound {
    id: string;
    title: string;
    filename: string;
    addedBy: string;
    addedAt: string;
}

export interface ServerSettings {
    defaultVolume: number;
    webhook?: {
        id: string;
        token: string;
    };
}

export interface ServerData {
    sounds: Sound[];
    allowedUsers: string[];
    blacklist: string[];
    settings: ServerSettings;
}

export interface DatabaseSchema {
    servers: {
        [guildId: string]: ServerData;
    };
} 