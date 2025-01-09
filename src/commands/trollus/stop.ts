import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';

export const data = new SlashCommandSubcommandBuilder()
    .setName('stopus')
    .setDescription('Stop current sound and disconnect');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const connection = getVoiceConnection(interaction.guildId!);
        
        if (!connection) {
            await interaction.editReply('Not currently playing anything.');
            return;
        }

        connection.destroy();
        await interaction.editReply('Stopped playing and disconnected.');
    } catch (error) {
        console.error('Failed to stop playback:', error);
        await interaction.editReply('Failed to stop playback. Please try again later.');
    }
} 