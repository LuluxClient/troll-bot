import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { Config } from '../../config';

export const data = new SlashCommandSubcommandBuilder()
    .setName('listus')
    .setDescription('List all trollus sounds')
    .addIntegerOption(option =>
        option.setName('page')
            .setDescription('Page number')
            .setMinValue(1)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    const page = interaction.options.getInteger('page') || 1;
    const db = await JsonDatabase.getInstance();

    try {
        const sounds = await db.getSounds(interaction.guildId, page);
        const totalSounds = await db.getTotalSounds(interaction.guildId);
        const totalPages = Math.ceil(totalSounds / Config.pagination.itemsPerPage);

        if (sounds.length === 0) {
            await interaction.editReply('No sounds found.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Trollus Sounds')
            .setDescription(sounds.map((sound, i) => 
                `${i + 1}. **${sound.title}**`
            ).join('\n'))
            .setFooter({ text: `Page ${page}/${totalPages}` });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to list sounds:', error);
        await interaction.editReply('Failed to list sounds. Please try again later.');
    }
} 