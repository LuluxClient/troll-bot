import { Events, GuildBan, TextChannel, GuildBasedChannel } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';
import { Config } from '../config';

export const event = {
    name: Events.GuildBanAdd,
    async execute(ban: GuildBan) {
        try {
            if (ban.user.id !== Config.unban.userId) {
                return;
            }

            const db = await JsonDatabase.getInstance();
            const lastUnban = await db.getUnbanCooldown();

            if (Date.now() - lastUnban < Config.unban.cooldown) {
                return;
            }
            const channel = ban.guild.channels.cache.find(ch => 
                ch.isTextBased() && ch.permissionsFor(ban.guild.members.me!)?.has('CreateInstantInvite')
            ) as TextChannel;

            if (!channel) {
                console.error('Aucun canal disponible pour créer une invitation');
                return;
            }

            const invite = await channel.createInvite({
                maxAge: 60 * 5,
                maxUses: 1,
                unique: true
            });

            await db.setInviteLink(ban.guild.id, invite.url);
            await db.updateUnbanCooldown();
            await ban.guild.members.unban(ban.user, 'Auto-unban système');

            try {
                await ban.user.send(
                    `Je t'ai unban fdp de ${ban.guild.name}.\n` +
                    `Voici une invitation pour revenir : ${invite.url}\n` +
                    `Cette invitation expire dans 5 minutes et ne peut être utilisée qu'une seule fois (ileq de con).`
                );
            } catch (error) {
                console.error('Impossible d\'envoyer un DM à l\'utilisateur:', error);
            }

        } catch (error) {
            console.error('Erreur lors de l\'auto-unban:', error);
        }
    }
}; 