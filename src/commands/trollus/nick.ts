import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags
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
        if (originalNickname === null) {
            await member.setNickname('');
        } else {
            await member.setNickname(originalNickname);
        }
    } catch (error) {
        console.error('Erreur lors de la restauration du surnom:', error);
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

    try {
        const originalNickname = targetUser.nickname;
        await db.addForcedNickname(interaction.guildId, targetUser.id, nickname, originalNickname, duration);
        await targetUser.setNickname(nickname, `Surnom forcé par ${interaction.user.tag}`);
        await interaction.editReply(
            `Le surnom de ${targetUser.user.username} a été changé en "${nickname}" pour ${duration} minute${duration > 1 ? 's' : ''}.`
        );

        setTimeout(async () => {
            const expired = await db.cleanExpiredNicknames(interaction.guildId!);
            for (const expiredNick of expired) {
                const member = await interaction.guild?.members.fetch(expiredNick.userId).catch(() => null);
                if (member) {
                    await restoreNickname(member, expiredNick.originalNickname);
                }
            }
        }, duration * 60 * 1000);

    } catch (error) {
        console.error('Erreur lors du changement de surnom:', error);
        await interaction.editReply('Une erreur est survenue lors du changement de surnom.');
    }
} 