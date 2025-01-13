import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    ChannelType,
    TextChannel
} from 'discord.js';
import { isUserAllowed } from '../../utils/permissions';
import { Config } from '../../config';

const activeChecks = new Map<string, NodeJS.Timeout>();

export const data = new SlashCommandSubcommandBuilder()
    .setName('retardus')
    .setDescription('Spam un utilisateur jusqu\'à ce qu\'il rejoigne le vocal')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('L\'utilisateur en retard')
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName('stop')
            .setDescription('Arrêter le spam pour cet utilisateur')
            .setRequired(false)
    );

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkUserStatus(
    channel: TextChannel,
    targetUser: GuildMember,
    startTime: number,
    checkInterval: NodeJS.Timeout
) {
    try {
        // Vérifier si le canal existe toujours
        try {
            await channel.fetch();
        } catch (error: any) {
            if (error.code === 10003) { // Unknown Channel
                clearInterval(checkInterval);
                activeChecks.delete(targetUser.id);
                return;
            }
            throw error;
        }

        const now = Date.now();
        const timeElapsed = now - startTime;

        if (timeElapsed >= Config.retardus.maxDuration) {
            clearInterval(checkInterval);
            activeChecks.delete(targetUser.id);
            await channel.send(`${targetUser}, temps écoulé ! Tu as raté le summon fdp...`);
            await sleep(Config.retardus.deleteDelay);
            await channel.delete();
            return;
        }

        let member;
        try {
            member = await channel.guild.members.fetch(targetUser.id);
        } catch (error: any) {
            if (error.code === 10007) { // Unknown Member
                clearInterval(checkInterval);
                activeChecks.delete(targetUser.id);
                await channel.send(`${targetUser} a quitté le serveur, arrêt du spam.`);
                await sleep(Config.retardus.deleteDelay);
                await channel.delete();
                return;
            }
            throw error;
        }

        const isInVoice = member.voice.channel !== null;
        const isMuted = member.voice.mute;

        if (isInVoice && !isMuted) {
            clearInterval(checkInterval);
            activeChecks.delete(targetUser.id);
            await channel.send({
                content: `${targetUser} est enfin là et unmute ! Bon retour parmi nous !`
            });
            await sleep(Config.retardus.deleteDelay);
            await channel.delete();
            return;
        }

        const messages = [
            `${targetUser} RÉVEILLE TOI !!!`,
            `${targetUser} ON T'ATTEND !!!`,
            `${targetUser} TU ES EN RETARD !!!`,
            `${targetUser} CONNECTE TOI !!!`,
            `${targetUser} ???????????`,
            `${targetUser} ALLOOOOOO`,
            `${targetUser} CEST VALO TIME FILS DE PUTE !!!`
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        await channel.send(randomMessage);
    } catch (error: any) {
        console.error('Erreur lors de la vérification:', error);
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

    if (activeChecks.has(targetUser.id)) {
        await interaction.editReply('Cet utilisateur est déjà en train d\'être spammé.');
        return;
    }

    const shouldStop = interaction.options.getBoolean('stop');
    if (shouldStop) {
        const userKey = targetUser.id;
        if (!activeChecks.has(userKey)) {
            await interaction.editReply('Cet utilisateur n\'est pas en train d\'être spammé.');
            return;
        }

        clearInterval(activeChecks.get(userKey));
        activeChecks.delete(userKey);

        // Trouver et supprimer le salon de spam
        const spamChannel = interaction.guild!.channels.cache
            .find(channel => 
                channel.name === `retard-${targetUser.user.username}` && 
                channel.type === ChannelType.GuildText
            );

        if (spamChannel) {
            await spamChannel.delete();
        }

        await interaction.editReply(`Spam arrêté pour ${targetUser.displayName}.`);
        return;
    }

    try {
        const channel = await interaction.guild!.channels.create({
            name: `retard-${targetUser.user.username}`,
            type: ChannelType.GuildText,
            topic: `Salon de spam pour ${targetUser.displayName}`
        });

        const startTime = Date.now();
        const checkInterval = setInterval(
            () => checkUserStatus(channel, targetUser, startTime, checkInterval),
            Config.retardus.messageDelay
        );

        activeChecks.set(targetUser.id, checkInterval);

        await channel.send(`${targetUser} EST EN RETARD !!! RÉVEILLEZ-VOUS !!!`);
        await interaction.editReply(`Début du spam pour ${targetUser.displayName}. Salon créé: ${channel}`);

    } catch (error) {
        console.error('Error in retard command:', error);
        await interaction.editReply('Erreur lors de l\'exécution de la commande.');
    }
} 