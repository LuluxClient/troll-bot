export const Config = {
    allowedUsers: [
        // Add Discord user IDs here
    ],
    allowedRoles: [
        // Add Discord role IDs here
    ],
    defaultVolume: 1.0,
    maxVolume: 2.0,
    soundsPath: './sounds',
    database: {
        path: './data/database.json'
    },
    pagination: {
        itemsPerPage: 10
    }
} as const;

export type ConfigType = typeof Config; 