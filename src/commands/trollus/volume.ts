import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { Config } from '../../config';

export const data = new SlashCommandSubcommandBuilder()
    .setName('volume')
    .setDescription('Set the global volume for all sounds')
    .addNumberOption(option =>
        option.setName('volume')
            .setDescription('Volume multiplier (0.1 to 2.0)')
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(Config.maxVolume)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    const volume = interaction.options.getNumber('volume', true);
    const db = await JsonDatabase.getInstance();

    try {
        await db.updateGlobalVolume(volume);
        await interaction.editReply(`Global volume updated to ${volume}x`);
    } catch (error) {
        console.error('Failed to update volume:', error);
        await interaction.editReply('Failed to update volume. Please try again later.');
    }
} 