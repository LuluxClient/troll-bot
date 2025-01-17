import { Events, GuildMember } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';

export const event = {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        try {
            const bot = member.guild.members.me;
            if (!bot || !bot.permissions.has('ManageNicknames') || member.roles.highest.position >= bot.roles.highest.position) {
                return;
            }

            const db = await JsonDatabase.getInstance();
            const forcedNicknames = await db.getForcedNicknames(member.guild.id);
            const forcedNick = forcedNicknames.find(n => n.userId === member.id);

            if (forcedNick) {
                if (Date.now() >= forcedNick.expiresAt) {
                    await db.removeForcedNickname(member.guild.id, member.id);
                    return;
                }

                try {
                    await member.setNickname(forcedNick.nickname, 'Restauration du surnom forcé après retour');
                    await member.send(
                        `Votre surnom forcé (${forcedNick.nickname}) a été restauré car il est toujours actif. ` +
                        `Il expirera <t:${Math.floor(forcedNick.expiresAt / 1000)}:R>.`
                    ).catch(() => {});
                } catch (error) {
                    console.error('Erreur lors de la restauration du surnom forcé après retour:', error);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du surnom forcé après retour:', error);
        }
    }
}; 