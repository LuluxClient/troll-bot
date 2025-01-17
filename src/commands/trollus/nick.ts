import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    Events,
    PartialGuildMember
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';
import { Config } from '../../config';

export const data = new SlashCommandSubcommandBuilder()
    .setName('nickus')
    .setDescription('Force un surnom à un utilisateur pendant une durée donnée')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('L\'utilisateur à renommer')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('nickname')
            .setDescription('Le nouveau surnom')
            .setRequired(true)
            .setMaxLength(32)
    )
    .addIntegerOption(option =>
        option.setName('duration')
            .setDescription('Durée en minutes')
            .setRequired(true)
            .setMinValue(Config.nickus.minDuration)
            .setMaxValue(Config.nickus.maxDuration)
    )
    .addBooleanOption(option =>
        option.setName('stop')
            .setDescription('Arrêter le surnom forcé')
            .setRequired(false)
    );

async function restoreNickname(member: GuildMember, originalNickname: string | null): Promise<void> {
    try {
        const bot = member.guild.members.me;
        if (!bot || !bot.permissions.has('ManageNicknames') || member.roles.highest.position > bot.roles.highest.position) {
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

    if (!bot.permissions.has('ManageNicknames')) {
        await interaction.editReply('Le bot n\'a pas la permission de gérer les pseudos.');
        return;
    }

    if (targetUser.roles.highest.position > bot.roles.highest.position) {
        await interaction.editReply('Le bot ne peut pas modifier le surnom de cet utilisateur car son rôle est trop élevé.');
        return;
    }

    const db = await JsonDatabase.getInstance();

    const shouldStop = interaction.options.getBoolean('stop') ?? false;
    if (shouldStop) {
        const originalNickname = await db.removeForcedNickname(interaction.guildId, targetUser.id);
        if (originalNickname === null) {
            await interaction.editReply('Cet utilisateur n\'a pas de surnom forcé actif.');
            return;
        }

        await restoreNickname(targetUser, originalNickname);
        await interaction.editReply(`Le surnom forcé de ${targetUser.user.username} a été supprimé.`);
        return;
    }

    const nickname = interaction.options.getString('nickname', true);
    const duration = interaction.options.getInteger('duration', true);

    const sensitiveWords = ['nigger', 'nigga', 'negro'];
    if (sensitiveWords.some(word => nickname.toLowerCase().includes(word))) {
        await interaction.editReply('Ce surnom contient des termes interdits par Discord.');
        return;
    }

    try {
        const originalNickname = targetUser.nickname;
        await db.addForcedNickname(interaction.guildId, targetUser.id, nickname, originalNickname, duration);
        await targetUser.setNickname(nickname, `Surnom forcé par ${interaction.user.tag}`);
        await interaction.editReply(
            `Le surnom de ${targetUser.user.username} a été changé en "${nickname}" pour ${duration} minute${duration > 1 ? 's' : ''}.`
        );

        setTimeout(async () => {
            try {
                const expired = await db.cleanExpiredNicknames(interaction.guildId!);
                for (const expiredNick of expired) {
                    try {
                        const member = await interaction.guild?.members.fetch(expiredNick.userId);
                        if (member) {
                            await restoreNickname(member, expiredNick.originalNickname);
                        }
                    } catch (error: any) {
                        if (error.code === 10007) {
                            continue;
                        }
                        console.error(`Erreur lors de la restauration du surnom pour ${expiredNick.userId}:`, error);
                    }
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

export const event = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (oldMember.nickname === newMember.nickname) return;

        try {
            const bot = newMember.guild.members.me;
            if (!bot || !bot.permissions.has('ManageNicknames') || newMember.roles.highest.position > bot.roles.highest.position) {
                return;
            }

            const db = await JsonDatabase.getInstance();
            const forcedNicknames = await db.getForcedNicknames(newMember.guild.id);
            const forcedNick = forcedNicknames.find(n => n.userId === newMember.id);
            if (forcedNick && newMember.nickname !== forcedNick.nickname) {
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
        } catch (error) {
            console.error('Erreur lors de la vérification du surnom forcé:', error);
        }
    }
}; 