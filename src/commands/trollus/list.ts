import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { Config } from '../../config';

export const data = new SlashCommandSubcommandBuilder()
    .setName('listus')
    .setDescription('Liste tous les sons disponibles')
    .addIntegerOption(option =>
        option.setName('page')
            .setDescription('Numéro de la page')
            .setMinValue(1)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    
    try {
        const db = await JsonDatabase.getInstance();
        const sounds = await db.getAllSounds(interaction.guildId);
        
        if (!sounds || sounds.length === 0) {
            await interaction.editReply('Aucun son trouvé pour ce serveur.');
            return;
        }

        const page = interaction.options.getInteger('page') || 1;
        const totalPages = Math.ceil(sounds.length / Config.pagination.itemsPerPage);

        if (page > totalPages) {
            await interaction.editReply(`Il n'y a que ${totalPages} page(s) disponible(s).`);
            return;
        }

        const startIndex = (page - 1) * Config.pagination.itemsPerPage;
        const endIndex = Math.min(startIndex + Config.pagination.itemsPerPage, sounds.length);
        const pageItems = sounds.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('🎵 Sons Trollus Disponibles')
            .setDescription(pageItems.map((sound, i) => 
                `${startIndex + i + 1}. **${sound.title}**`
            ).join('\n'))
            .setFooter({ 
                text: `Page ${page}/${totalPages} • Total: ${sounds.length} sons` 
            });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la liste des sons:', error);
        await interaction.editReply('Erreur lors de la récupération des sons. Réessayez plus tard.');
    }
} 