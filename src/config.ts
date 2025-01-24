import { config } from 'dotenv';
config(); // Charger les variables d'environnement

export const Config = {
    allowedUsers: [ // Les boss qui peuvent tout faire
        '252454259252002826',
        '295515087731556362',
        '263423845040521233',
        '273898521344606208',
        '1060245407663390771',
        '189474808193327104', // Luca
        '1075115721307271198', // Luca 2
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
        moveDelay: 1500,     // Le temps entre chaque move (en ms)
        finalDelay: 2000    // Le temps avant de le ramener (histoire qu'il comprenne ce qui lui arrive)
    },
    retardus: {
        messageDelay: 2500,     // Délai entre chaque message de spam (2.5 sec)
        maxDuration: 1200000,   // Durée max du spam (20 mins)
        deleteDelay: 10000       // Délai avant suppression du salon (1 sec)
    },
    nickus: {
        maxDuration: 10080, // Temps en minutes (7 jours)
        minDuration: 1, // Temps en minutes (1 minute)  
    },
    unban: {
        userId: '384384703710494721', // L'ID de l'utilisateur qui peut se débannir
        cooldown: 30 * 60 * 1000, // 30 minutes en millisecondes
    },
    factchecker: {
        minWords: 3,           // Nombre minimum de mots pour déclencher le fact-checking
        excludeFromWordCount: ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'à', 'en'] as const, // Articles et mots courts à ignorer
        maxMessageLength: 2000  // Longueur maximale du message
    },
    factCheckPrompts: {
        system: `Vous êtes un assistant de fact-checking spécialisé en histoire et en politique, conçu pour être précis et économe en tokens.

Analysez le message et répondez selon ce format :
1. Si l'information est correcte : {"factCheck": "CORRECT"}
2. Si l'information est fausse : {"factCheck": "FAUX", "reason": "explication concise", "source": "source vérifiable", "url": "lien vers la source"}
3. Si non vérifiable : {"factCheck": "NON VERIFIABLE", "reason": "explication brève"}`,
        detection: `Vous êtes un détecteur de contenu historique et politique.
Répondez uniquement avec {"isHistoricalOrPolitical": true} si le message contient :
- Des affirmations sur l'histoire
- Des personnages historiques
- Des politiciens ou personnalités politiques
- Des événements politiques actuels
- Des figures publiques influentes

Sinon, répondez avec {"isHistoricalOrPolitical": false}.`
    }
} as const;

export type ConfigType = typeof Config; 