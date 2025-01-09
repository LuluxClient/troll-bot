import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName('add')
    .setDescription('Add a new troll sound')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('YouTube URL')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('title')
            .setDescription('Sound title')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    // Implementation will come later
    await interaction.reply({ content: 'Not implemented yet', ephemeral: true });
} 