import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    MessageFlags,
    AutocompleteInteraction
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('removus')
    .setDescription('Remove a trollus sound')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Sound name')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;

    const focusedValue = interaction.options.getFocused().toLowerCase();
    const db = await JsonDatabase.getInstance();
    const sounds = await db.getAllSounds(interaction.guildId);

    const filtered = sounds
        .filter(sound => sound.title.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(sound => ({
            name: sound.title,
            value: sound.title
        }));

    await interaction.respond(filtered);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('You do not have permission to use this command.');
        return;
    }
    
    const db = await JsonDatabase.getInstance();
    const soundName = interaction.options.getString('name', true);
    const sounds = await db.getAllSounds(interaction.guildId);
    
    const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
    if (!sound) {
        await interaction.editReply('Sound not found.');
        return;
    }

    try {
        await db.removeSound(interaction.guildId, sound.id);
        await interaction.editReply(`Sound "${sound.title}" has been removed successfully!`);
    } catch (error) {
        console.error('Failed to remove sound:', error);
        await interaction.editReply('Failed to remove sound. Please try again later.');
    }
} 