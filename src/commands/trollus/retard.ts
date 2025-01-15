import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    ChannelType,
    TextChannel,
    WebhookClient
} from 'discord.js';
import { isUserAllowed } from '../../utils/permissions';
import { Config } from '../../config';
import { JsonDatabase } from '../../database/JsonDatabase';

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
    checkInterval: NodeJS.Timeout,
    webhook: WebhookClient
) {
    try {
        // Vérifier si le canal existe toujours
        try {
            await channel.fetch();
        } catch (error: any) {
            if (error.code === 10003) { // Unknown Channel
                clearInterval(checkInterval);
                activeChecks.delete(targetUser.id);
                webhook.destroy();
                return;
            }
            throw error;
        }

        const now = Date.now();
        const timeElapsed = now - startTime;

        if (timeElapsed >= Config.retardus.maxDuration) {
            clearInterval(checkInterval);
            activeChecks.delete(targetUser.id);
            await webhook.send(`${targetUser}, temps écoulé ! Tu as raté le summon fdp...`);
            webhook.destroy();
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
                await webhook.send(`${targetUser} a quitté le serveur, arrêt du spam.`);
                webhook.destroy();
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
            await webhook.send({
                content: `${targetUser} est enfin là et unmute ! Bon retour parmi nous !`
            });
            webhook.destroy();
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
        await webhook.send({
            content: randomMessage,
            username: 'Trollus Bot',
            avatarURL: 'https://cdn.discordapp.com/attachments/1099852374174077012/1329211395727949924/face.png?ex=67898414&is=67883294&hm=2ecf756d2ea371c5dc8cb2eb3727c75fc4b7d18eeac133fd2c7255f920b78da0&' // Vous pouvez changer l'URL de l'avatar
        });
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

    const shouldStop = interaction.options.getBoolean('stop') ?? false;
    if (shouldStop === true) {
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

    const db = await JsonDatabase.getInstance();
    if (await db.isUserBlacklisted(interaction.guildId, targetUser.id)) {
        await interaction.editReply('Cet utilisateur est dans la blacklist et ne peut pas être ciblé par cette commande.');
        return;
    }

    if (activeChecks.has(targetUser.id)) {
        await interaction.editReply('Cet utilisateur est déjà en train d\'être spammé.');
        return;
    }

    try {
        const channel = await interaction.guild!.channels.create({
            name: `retard-${targetUser.user.username}`,
            type: ChannelType.GuildText,
            topic: `Salon de spam pour ${targetUser.displayName}`
        });

        // Créer ou récupérer le webhook
        let webhookData = db.getWebhook(interaction.guildId);
        let webhook: WebhookClient;

        if (!webhookData) {
            const createdWebhook = await channel.createWebhook({
                name: 'Trollus Bot',
                avatar: 'https://cdn.discordapp.com/attachments/1099852374174077012/1329211395727949924/face.png?ex=67898414&is=67883294&hm=2ecf756d2ea371c5dc8cb2eb3727c75fc4b7d18eeac133fd2c7255f920b78da0&' // Vous pouvez changer l'URL de l'avatar
            });
            await db.setWebhook(interaction.guildId, createdWebhook.id, createdWebhook.token!);
            webhook = new WebhookClient({ id: createdWebhook.id, token: createdWebhook.token! });
        } else {
            webhook = new WebhookClient({ id: webhookData.id, token: webhookData.token });
        }

        const startTime = Date.now();
        const checkInterval = setInterval(
            () => checkUserStatus(channel, targetUser, startTime, checkInterval, webhook),
            Config.retardus.messageDelay
        );

        activeChecks.set(targetUser.id, checkInterval);

        await webhook.send({
            content: `${targetUser} EST EN RETARD !!! RÉVEILLEZ-VOUS !!!`,
            username: 'Trollus Bot',
            avatarURL: 'https://i.imgur.com/AfFp7pu.png' // Vous pouvez changer l'URL de l'avatar
        });
        await interaction.editReply(`Début du spam pour ${targetUser.displayName}. Salon créé: ${channel}`);

    } catch (error) {
        console.error('Error in retard command:', error);
        await interaction.editReply('Erreur lors de l\'exécution de la commande.');
    }
} 