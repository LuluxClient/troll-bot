import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';

export const data = new SlashCommandSubcommandBuilder()
    .setName('user')
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
    await interaction.deferReply({ ephemeral: true });
    
    const action = interaction.options.getString('action', true);
    const user = interaction.options.getUser('user', true);
    const db = await JsonDatabase.getInstance();

    try {
        if (action === 'add') {
            await db.addAllowedUser(user.id);
            await interaction.editReply(`User ${user.tag} has been added to allowed users.`);
        } else {
            await db.removeAllowedUser(user.id);
            await interaction.editReply(`User ${user.tag} has been removed from allowed users.`);
        }
    } catch (error) {
        console.error('Failed to manage user:', error);
        await interaction.editReply('Failed to manage user. Please try again later.');
    }
} 