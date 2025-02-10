import { Client, GuildMember } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';
import { Config } from '../config';

export class NicknameRotationService {
    private static instance: NicknameRotationService;
    private client: Client;
    private midnightTimeout: NodeJS.Timeout | null = null;

    private constructor(client: Client) {
        this.client = client;
        this.scheduleMidnightRotation();
    }

    public static getInstance(client: Client): NicknameRotationService {
        if (!NicknameRotationService.instance) {
            NicknameRotationService.instance = new NicknameRotationService(client);
        }
        return NicknameRotationService.instance;
    }

    private getMsUntilMidnight(): number {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime() - now.getTime();
    }

    private scheduleMidnightRotation(): void {
        if (this.midnightTimeout) {
            clearTimeout(this.midnightTimeout);
        }

        const msUntilMidnight = this.getMsUntilMidnight();
        this.midnightTimeout = setTimeout(() => {
            this.rotateNicknames().catch(console.error);
            this.scheduleMidnightRotation();
        }, msUntilMidnight);
    }

    private async rotateNicknames(): Promise<void> {
        const db = await JsonDatabase.getInstance();
        const guilds = this.client.guilds.cache;

        for (const [guildId, guild] of guilds) {
            try {
                const forcedNicknames = await db.getForcedNicknames(guildId);
                const randomNicknames = forcedNicknames.filter(nick => 
                    nick.nickname && Config.randomusNickus.nicknames.includes(nick.nickname as any)
                );

                for (const forcedNick of randomNicknames) {
                    try {
                        const member = await guild.members.fetch(forcedNick.userId);
                        if (!member) continue;

                        const currentNickname = member.nickname;
                        const newNickname = this.getNewRandomNickname(currentNickname);

                        await db.updateForcedNickname(guildId, forcedNick.userId, newNickname);
                        await member.setNickname(newNickname, 'Rotation quotidienne du surnom aléatoire');

                    } catch (error) {
                        console.error(`Erreur lors de la rotation du surnom pour l'utilisateur ${forcedNick.userId} dans le serveur ${guildId}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Erreur lors de la rotation des surnoms pour le serveur ${guildId}:`, error);
            }
        }
    }

    private getNewRandomNickname(currentNickname: string | null): string {
        const nicknames = Config.randomusNickus.nicknames;
        const availableNicknames = nicknames.filter(nick => nick !== currentNickname);
        const randomIndex = Math.floor(Math.random() * availableNicknames.length);
        return availableNicknames[randomIndex];
    }
} 