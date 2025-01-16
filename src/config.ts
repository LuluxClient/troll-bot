export const Config = {
    allowedUsers: [ // Les boss qui peuvent tout faire
        '252454259252002826',
        '295515087731556362',
        '263423845040521233',
        '273898521344606208',
        '1060245407663390771'
    ] as string[],
    allowedRoles: [ // Les rôles qui peuvent utiliser le bot (pas implémenté mdr)
        '0'
    ],
    defaultVolume: 1.0, // Le volume de base, tranquille
    minVolume: 0.1, // Le volume min pour ne pas déconner
    maxVolume: 10.0, // Le volume max pour péter les oreilles
    soundsPath: './assets/sounds', // Là où on stock les sons
    database: {
        path: './data/database.json' // Notre petite BDD locale
    },
    pagination: {
        itemsPerPage: 10 // Nombre de sons par page dans la liste
    },
    limits: {
        maxSoundSize: 100 * 1024 * 1024, // 100MB max par son, faut pas déconner
        maxSoundCount: 100, // Max 100 sons par serveur, ça devrait suffire
        maxTotalStorage: 20 * 1024 * 1024 * 1024 // 20GB au total, on est généreux
    },
    botPermissions: [ // Les perms dont le bot a besoin pour faire le fou
        'SendMessages', // Pour raconter sa vie
        'Connect',     // Pour rejoindre les vocs
        'Speak',       // Pour faire du bruit
        'UseVAD'       // Pour la détection vocale (osef en vrai)
    ] as const,
    tourduparcus: {
        moves: 10,          // Combien de fois on fait bouger le mec
        moveDelay: 800,     // Le temps entre chaque move (en ms)
        finalDelay: 1500    // Le temps avant de le ramener (histoire qu'il comprenne ce qui lui arrive)
    },
    retardus: {
        messageDelay: 2500,     // Délai entre chaque message de spam (2.5 sec)
        maxDuration: 1200000,   // Durée max du spam (20 mins)
        deleteDelay: 10000       // Délai avant suppression du salon (1 sec)
    },
} as const;

export type ConfigType = typeof Config; 