import { 
    ApplicationCommandType,
    MessageContextMenuCommandInteraction,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { isUserAllowed } from '../utils/permissions';
import { Config } from '../config';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const contextMenuData = new ContextMenuCommandBuilder()
    .setName('Fact-check ce message')
    .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ 
            content: 'Cette commande doit être utilisée dans un serveur.', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    if (!await isUserAllowed(interaction)) {
        await interaction.reply({ 
            content: 'Vous n\'avez pas la permission d\'utiliser cette commande.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const targetMessage = interaction.targetMessage;
    
    if (!targetMessage.content) {
        await interaction.reply({ 
            content: 'Ce message ne contient pas de texte à vérifier.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.deferReply();

    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: Config.factCheckPrompts.system },
                { role: "user", content: targetMessage.content }
            ],
            temperature: 0.1,
            max_tokens: 150
        });

        const response = completion.data.choices[0]?.message?.content;
        console.log(`[FactCheck] Manual check response: ${response}`);
        
        try {
            const jsonResponse = JSON.parse(response || "{}");
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
                    case 'CORRECT': return 0x00FF00;
                    case 'FAUX': return 0xFF0000;
                    case 'NON VERIFIABLE': return 0xFFA500;
                    default: return 0xFFFF00;
                }
            };

            const embed = new EmbedBuilder()
                .setColor(getStatusColor(jsonResponse.factCheck))
                .setTitle(`${getStatusEmoji(jsonResponse.factCheck)} Fact-check : ${jsonResponse.factCheck}`);

            if (jsonResponse.factCheck === "CORRECT") {
                embed.setDescription("Cette affirmation est correcte.");
            } else if (jsonResponse.reason) {
                embed.setDescription(jsonResponse.reason);
            }

            if (jsonResponse.source) {
                embed.addFields({ name: '📚 Source', value: jsonResponse.source, inline: false });
            }

            if (jsonResponse.url) {
                embed.addFields({ name: '🔗 Lien', value: jsonResponse.url, inline: false });
            }

            await interaction.deleteReply();
            await targetMessage.reply({
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });

        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            await interaction.editReply('Une erreur est survenue lors de l\'analyse de la réponse.');
            return;
        }
    } catch (error) {
        console.error('Error in manual fact-checking:', error);
        await interaction.editReply('Une erreur est survenue lors de la vérification du message.');
    }
} 