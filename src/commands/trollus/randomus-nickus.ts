import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    Events,
    PartialGuildMember,
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';
import { Config } from '../../config';
import { parseDuration, formatDuration } from '../../utils/duration';

export const data = new SlashCommandSubcommandBuilder()
    .setName('randomus-nickus')
    .setDescription('Force un surnom aléatoire à un utilisateur pendant une durée donnée')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('L\'utilisateur à renommer aléatoirement')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('duration')
            .setDescription('Durée (ex: 30s, 5m, 2h, 1d, 1w, 1M)')
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName('stop')
            .setDescription('Arrêter le surnom forcé')
            .setRequired(false)
    );

async function restoreNickname(member: GuildMember, originalNickname: string | null): Promise<void> {
    try {
        const bot = member.guild.members.me;
        if (!bot || !bot.permissions.has('ManageNicknames') || member.roles.highest.position >= bot.roles.highest.position) {
            console.warn(`Impossible de restaurer le surnom de ${member.user.tag} : permissions insuffisantes`);
            return;
        }

        if (originalNickname === null) {
            await member.setNickname('');
        } else {
            await member.setNickname(originalNickname);
        }
    } catch (error: any) {
        if (error.code === 50013) {
            console.warn(`Impossible de restaurer le surnom de ${member.user.tag} : permissions insuffisantes`);
        } else {
            console.error('Erreur lors de la restauration du surnom:', error);
        }
    }
}

function getRandomNickname(currentNickname: string | null): string {
    const nicknames = Config.randomusNickus.nicknames;
    let availableNicknames = [...nicknames];
    if (currentNickname) {
        availableNicknames = availableNicknames.filter(nick => nick !== currentNickname);
    }
    
    const randomIndex = Math.floor(Math.random() * availableNicknames.length);
    return availableNicknames[randomIndex];
}

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ 
            content: 'Cette commande doit être utilisée dans un serveur.', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        return;
    }

    const targetUser = interaction.options.getMember('user');
    if (!(targetUser instanceof GuildMember)) {
        await interaction.editReply('Utilisateur invalide.');
        return;
    }

    const bot = interaction.guild?.members.me;
    if (!bot) {
        await interaction.editReply('Une erreur est survenue lors de la récupération des informations du bot.');
        return;
    }

    if (!bot.permissions.has('ManageNicknames') && !bot.permissions.has('Administrator')) {
        await interaction.editReply('Le bot n\'a pas la permission de gérer les pseudos.');
        return;
    }

    if (targetUser.roles.highest.position >= bot.roles.highest.position) {
        await interaction.editReply('Le bot ne peut pas modifier le surnom de cet utilisateur car son rôle n\'est pas inférieur à celui du bot.');
        return;
    }

    const db = await JsonDatabase.getInstance();

    const shouldStop = interaction.options.getBoolean('stop') ?? false;
    if (shouldStop) {
        const forcedNick = (await db.getForcedNicknames(interaction.guildId)).find(n => n.userId === targetUser.id);
        if (!forcedNick) {
            await interaction.editReply('Cet utilisateur n\'a pas de surnom forcé actif.');
            return;
        }

        if (forcedNick.forcedBy !== interaction.user.id) {
            await interaction.editReply('Seule la personne ayant forcé le surnom peut le retirer.');
            return;
        }

        const originalNickname = await db.removeForcedNickname(interaction.guildId, targetUser.id);
        await restoreNickname(targetUser, originalNickname);
        await interaction.editReply(`Le surnom forcé de ${targetUser.user.username} a été supprimé.`);
        return;
    }

    const existingNick = (await db.getForcedNicknames(interaction.guildId)).find(n => n.userId === targetUser.id);
    if (existingNick) {
        await interaction.editReply(
            `${targetUser.user.username} a déjà un surnom forcé (${existingNick.nickname}) par <@${existingNick.forcedBy}>. ` +
            `Il expirera <t:${Math.floor(existingNick.expiresAt / 1000)}:R>.`
        );
        return;
    }

    const durationStr = interaction.options.getString('duration', true);
    const durationResult = parseDuration(durationStr, Config.randomusNickus.minDuration, Config.randomusNickus.maxDuration);
    
    if (!durationResult.success) {
        await interaction.editReply(durationResult.error!);
        return;
    }

    const duration = durationResult.minutes!;
    const randomNickname = getRandomNickname(targetUser.nickname);

    try {
        const originalNickname = targetUser.nickname || '';
        await db.addForcedNickname(interaction.guildId, targetUser.id, randomNickname, originalNickname, duration, interaction.user.id);
        await targetUser.setNickname(randomNickname, `Surnom aléatoire forcé par ${interaction.user.tag}`);
        
        await interaction.editReply(
            `Le surnom de ${targetUser.user.username} a été changé en "${randomNickname}" pour ${formatDuration(duration)}.`
        );

        setTimeout(async () => {
            try {
                const expired = await db.cleanExpiredNicknames(interaction.guildId!);
                for (const expiredNick of expired) {
                    try {
                        const member = await interaction.guild?.members.fetch(expiredNick.userId);
                        if (member) {
                            await restoreNickname(member, expiredNick.originalNickname || null);
                        }
                    } catch (error: any) {
                        if (error.code === 10007) {
                            continue;
                        }
                        console.error(`Erreur lors de la restauration du surnom pour ${expiredNick.userId}:`, error);
                    }
                }
                if (expired.length > 0) {
                    global.gc?.();
                }
            } catch (error) {
                console.error('Erreur lors du nettoyage des surnoms expirés:', error);
            }
        }, duration * 60 * 1000);

    } catch (error) {
        console.error('Erreur lors du changement de surnom:', error);
        await interaction.editReply('Une erreur est survenue lors du changement de surnom.');
    }
}

export const events = [
    {
        name: Events.GuildMemberUpdate,
        async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
            if (oldMember.nickname === newMember.nickname) return;

            try {
                const bot = newMember.guild.members.me;
                if (!bot || !bot.permissions.has('ManageNicknames') || newMember.roles.highest.position >= bot.roles.highest.position) {
                    return;
                }

                const db = await JsonDatabase.getInstance();
                const forcedNicknames = await db.getForcedNicknames(newMember.guild.id);
                const forcedNick = forcedNicknames.find(n => n.userId === newMember.id);
                
                if (forcedNick) {
                    if (Date.now() >= forcedNick.expiresAt) {
                        await db.removeForcedNickname(newMember.guild.id, newMember.id);
                        return;
                    }

                    if (newMember.nickname !== forcedNick.nickname) {
                        try {
                            await newMember.setNickname(forcedNick.nickname, 'Restauration du surnom forcé');
                            await newMember.send(
                                `Votre surnom ne peut pas être changé car vous avez un surnom forcé actif (${forcedNick.nickname}). ` +
                                `Il expirera <t:${Math.floor(forcedNick.expiresAt / 1000)}:R>.`
                            ).catch(() => {}); 
                        } catch (error) {
                            console.error('Erreur lors de la restauration du surnom forcé:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du surnom forcé:', error);
            }
        }
    },
    {
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
    }
]; 