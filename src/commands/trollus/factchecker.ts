import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    PermissionsBitField,
    EmbedBuilder
} from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { isUserAllowed } from '../../utils/permissions';
import { JsonDatabase } from '../../database/JsonDatabase';
import NodeCache from 'node-cache';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const messageCache = new NodeCache({ 
    stdTTL: 3600,
    checkperiod: 600,
    maxKeys: 1000
});

const SYSTEM_PROMPT = `Vous êtes un assistant de fact-checking spécialisé en histoire et en politique, conçu pour être précis et économe en tokens.

Analysez le message et répondez selon ce format :
1. Si l'information est correcte : {"factCheck": "CORRECT"}
2. Si l'information est fausse : {"factCheck": "FAUX", "reason": "explication concise", "source": "source vérifiable", "url": "lien vers la source"}
3. Si non vérifiable : {"factCheck": "NON VERIFIABLE", "reason": "explication brève"}`;

const DETECTION_PROMPT = `Vous êtes un détecteur de contenu historique et politique.
Répondez uniquement avec {"isHistoricalOrPolitical": true} si le message contient :
- Des affirmations sur l'histoire
- Des personnages historiques
- Des politiciens ou personnalités politiques
- Des événements politiques actuels
- Des figures publiques influentes

Sinon, répondez avec {"isHistoricalOrPolitical": false}.`;

export const data = new SlashCommandSubcommandBuilder()
    .setName('factcheckerus')
    .setDescription('Gère le fact-checking automatique des utilisateurs')
    .addStringOption(option =>
        option.setName('action')
            .setDescription('Action à effectuer')
            .setRequired(true)
            .addChoices(
                { name: 'add', value: 'add' },
                { name: 'remove', value: 'remove' },
                { name: 'list', value: 'list' },
                { name: 'stats', value: 'stats' },
                { name: 'start', value: 'start' },
                { name: 'stop', value: 'stop' }
            )
    )
    .addUserOption(option =>
        option.setName('user')
            .setDescription('Utilisateur concerné (pour add/remove/stats)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        return;
    }

    const action = interaction.options.getString('action', true);
    const targetUser = interaction.options.getMember('user');
    const db = await JsonDatabase.getInstance();

    try {
        switch (action) {
            case 'start':
                await db.setFactCheckGlobalEnabled(interaction.guildId, true);
                await interaction.editReply('✅ Le fact-checking est maintenant activé globalement.');
                break;

            case 'stop':
                await db.setFactCheckGlobalEnabled(interaction.guildId, false);
                await interaction.editReply('❌ Le fact-checking est maintenant désactivé globalement.');
                break;

            case 'add':
                if (!targetUser || !(targetUser instanceof GuildMember)) {
                    await interaction.editReply('Veuillez spécifier un utilisateur valide.');
                    return;
                }
                await db.addFactCheckUser(interaction.guildId, targetUser.id);
                await interaction.editReply(`${targetUser.user.username} a été ajouté à la liste de fact-checking.`);
                break;

            case 'remove':
                if (!targetUser || !(targetUser instanceof GuildMember)) {
                    await interaction.editReply('Veuillez spécifier un utilisateur valide.');
                    return;
                }
                await db.removeFactCheckUser(interaction.guildId, targetUser.id);
                await interaction.editReply(`${targetUser.user.username} a été retiré de la liste de fact-checking.`);
                break;

            case 'stats':
                if (!targetUser || !(targetUser instanceof GuildMember)) {
                    await interaction.editReply('Veuillez spécifier un utilisateur valide.');
                    return;
                }
                const stats = await db.getFactCheckStats(interaction.guildId, targetUser.id);
                if (!stats) {
                    await interaction.editReply(`Aucune statistique disponible pour ${targetUser.user.username}.`);
                    return;
                }
                const accuracy = stats.totalChecks > 0 
                    ? Math.round((stats.correctCount / stats.totalChecks) * 100) 
                    : 0;

                const lastChecked = new Date(stats.lastChecked).toLocaleString(interaction.guild?.preferredLocale || 'fr-FR');
                try {
                    await interaction.editReply(
                        `📊 Statistiques de fact-checking pour ${targetUser.user.username} :\n` +
                        `\n` +
                        `Total de vérifications : ${stats.totalChecks}\n` +
                        `✅ Affirmations correctes : ${stats.correctCount}\n` +
                        `❌ Affirmations incorrectes : ${stats.incorrectCount}\n` +
                        `📈 Taux de précision : ${accuracy}%\n` +
                        `🕒 Dernière vérification : ${lastChecked}`
                    );
                } catch (err) {
                    console.error('Error replying with stats:', err);
                    await interaction.editReply('Une erreur est survenue lors de l\'affichage des statistiques.');
                }
                break;

            case 'list':
                const factCheckUsers = await db.getFactCheckUsers(interaction.guildId);
                if (factCheckUsers.length === 0) {
                    await interaction.editReply('Aucun utilisateur n\'est dans la liste de fact-checking.');
                    return;
                }
                const isGlobalEnabled = await db.isFactCheckGlobalEnabled(interaction.guildId);
                const globalStatus = isGlobalEnabled ? '✅ Fact-checking global: Activé' : '❌ Fact-checking global: Désactivé';
                const userList = await Promise.all(
                    factCheckUsers.map(async (userId) => {
                        const member = await interaction.guild?.members.fetch(userId);
                        return member ? `- ${member.user.username}` : `- Utilisateur inconnu (${userId})`;
                    })
                );
                await interaction.editReply(`${globalStatus}\n\nUtilisateurs dans la liste de fact-checking :\n${userList.join('\n')}`);
                break;
        }
    } catch (error) {
        console.error('Error in factchecker command:', error);
        await interaction.editReply('Une erreur est survenue lors de l\'exécution de la commande.');
    }
}

export async function checkMessage(message: any): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const db = await JsonDatabase.getInstance();
    const isFactChecked = await db.isUserFactChecked(message.guild.id, message.author.id);
    
    console.log(`[FactCheck] Checking message from ${message.author.username}: "${message.content}"`);
    console.log(`[FactCheck] User is fact-checked: ${isFactChecked}`);
    
    if (!isFactChecked) return;

    if (message.content.length === 0 || message.content.length > 2000) {
        console.error('Invalid message length for OpenAI processing.');
        return;
    }

    try {
        const cachedResult = messageCache.get(message.content);
        if (cachedResult !== undefined) {
            if (!cachedResult) return;
        } else {
      
            const detectionCompletion = await openai.createChatCompletion({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: DETECTION_PROMPT },
                    { role: "user", content: message.content }
                ],
                temperature: 0.1,
                max_tokens: 20
            });

            const detectionResponse = detectionCompletion.data.choices[0]?.message?.content;
            console.log(`[FactCheck] Detection response: ${detectionResponse}`);
            
            try {
                const detectionJson = JSON.parse(detectionResponse || "{}");
                if (!detectionJson.isHistoricalOrPolitical) {
                    messageCache.set(message.content, false);
                    return;
                }
            } catch (parseError) {
                console.error('Error parsing detection response:', parseError);
                return;
            }

            const completion = await openai.createChatCompletion({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message.content }
                ],
                temperature: 0.1,
                max_tokens: 150
            });

            const response = completion.data.choices[0]?.message?.content;
            console.log(`[FactCheck] OpenAI response: ${response}`);
            
            try {
                const jsonResponse = JSON.parse(response || "{}");
                if (jsonResponse.factCheck === "CORRECT") {
                    await db.updateFactCheckStats(message.guild.id, message.author.id, true);
                    return;
                }

                try {
                    const getStatusEmoji = (status: string) => {
                        switch (status) {
                            case 'CORRECT': return '✅';
                            case 'FAUX': return '❌';
                            case 'NON VERIFIABLE': return '❓';
                            default: return '⚠️';
                        }
                    };

                    const getStatusColor = (status: string) => {
                        switch (status) {
                            case 'CORRECT': return 0x00FF00; // Vert
                            case 'FAUX': return 0xFF0000; // Rouge
                            case 'NON VERIFIABLE': return 0xFFA500; // Orange
                            default: return 0xFFFF00; // Jaune
                        }
                    };

                    const embed = new EmbedBuilder()
                        .setColor(getStatusColor(jsonResponse.factCheck))
                        .setTitle(`${getStatusEmoji(jsonResponse.factCheck)} Fact-check : ${jsonResponse.factCheck}`)
                        .setDescription(jsonResponse.reason)
                        .addFields(
                            { name: '📚 Source', value: jsonResponse.source || 'Non spécifiée', inline: false }
                        );

                    if (jsonResponse.url) {
                        embed.addFields({ name: '🔗 Lien', value: jsonResponse.url, inline: false });
                    }

                    await message.reply({
                        embeds: [embed],
                        allowedMentions: { repliedUser: false }
                    });
                } catch (replyErr) {
                    console.error('Error replying to message:', replyErr);
                }
                
                await db.updateFactCheckStats(message.guild.id, message.author.id, false);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                console.error('Raw response:', response);
                return;
            }
        }
    } catch (error: any) {
        console.error('Error in message fact-checking:', error);
        if (error.response) {
            console.error('OpenAI API error:', error.response.data);
        }
    }
}