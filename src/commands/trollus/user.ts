import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';

export const data = new SlashCommandSubcommandBuilder()
    .setName('userus')
    .setDescription('Manage allowed users')
    .addStringOption(option =>
        option.setName('action')
            .setDescription('Add or remove user')
            .setRequired(true)
            .addChoices(
                { name: 'add', value: 'add' },
                { name: 'remove', value: 'remove' }
            )
    )
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to manage')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    const action = interaction.options.getString('action', true);
    const user = interaction.options.getUser('user', true);
    const db = await JsonDatabase.getInstance();

    try {
        if (action === 'add') {
            await db.addAllowedUser(interaction.guildId, user.id);
            await interaction.editReply(`User ${user.tag} has been added to allowed users.`);
        } else {
            await db.removeAllowedUser(interaction.guildId, user.id);
            await interaction.editReply(`User ${user.tag} has been removed from allowed users.`);
        }
    } catch (error) {
        console.error('Failed to manage user:', error);
        await interaction.editReply('Failed to manage user. Please try again later.');
    }
} 