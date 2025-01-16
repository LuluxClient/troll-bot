import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { Config } from '../../config';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('volumeus')
    .setDescription('Set the global volume for all sounds')
    .addNumberOption(option =>
        option.setName('volume')
            .setDescription('Volume multiplier (' + Config.minVolume + ' to ' + Config.maxVolume + ')') 
            .setRequired(true)
            .setMinValue(Config.minVolume)
            .setMaxValue(Config.maxVolume)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('You do not have permission to use this command.');
        return;
    }
    
    const volume = interaction.options.getNumber('volume', true);
    const db = await JsonDatabase.getInstance();

    try {
        await db.updateGlobalVolume(interaction.guildId, volume);
        await interaction.editReply(`Global volume updated to ${volume}x`);
    } catch (error) {
        console.error('Failed to update volume:', error);
        await interaction.editReply('Failed to update volume. Please try again later.');
    }
} 