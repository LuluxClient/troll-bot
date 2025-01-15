export interface Sound {
    id: string;
    title: string;
    filename: string;
    addedBy: string;
    addedAt: string;}

export interface ServerData {
    sounds: Sound[];
    allowedUsers: string[];
    blacklist: string[];
    settings: {
        defaultVolume: number;
    };
}

export interface DatabaseSchema {
    servers: {
        [guildId: string]: ServerData;
    };
} 