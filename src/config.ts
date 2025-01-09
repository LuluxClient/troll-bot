export const Config = {
    allowedUsers: [ //HARDCODED UWU FUCK .ENV
        '252454259252002826',
        '295515087731556362',
        '263423845040521233',
        '273898521344606208'
    ] as string[],
    allowedRoles: [
        '0'
    ],
    defaultVolume: 1.0,
    maxVolume: 2.0,
    soundsPath: './assets/sounds',
    database: {
        path: './data/database.json'
    },
    pagination: {
        itemsPerPage: 10
    },
    limits: {
        maxSoundSize: 100 * 1024 * 1024, // 100MB in bytes
        maxSoundCount: 100,
        maxTotalStorage: 20 * 1024 * 1024 * 1024 // 20GB in bytes
    },
    botPermissions: [
        'SendMessages',
        'Connect',
        'Speak',
        'UseVAD'
    ] as const
} as const;

export type ConfigType = typeof Config; 