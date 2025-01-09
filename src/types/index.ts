export interface Sound {
    id: string;
    title: string;
    filename: string;
    addedBy: string;
    addedAt: string;
}

export interface DatabaseSchema {
    sounds: Sound[];
    allowedUsers: string[];
    settings: {
        defaultVolume: number;
    };
} 