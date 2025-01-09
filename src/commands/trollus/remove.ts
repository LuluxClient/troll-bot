import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    MessageFlags,
    AutocompleteInteraction
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';

export const data = new SlashCommandSubcommandBuilder()
    .setName('remove')
    .setDescription('Remove a trollus sound')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Sound name')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const db = await JsonDatabase.getInstance();
    const sounds = await db.getAllSounds();

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
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    const db = await JsonDatabase.getInstance();
    const soundName = interaction.options.getString('name', true);
    const sounds = await db.getAllSounds();
    
    const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
    if (!sound) {
        await interaction.editReply('Sound not found.');
        return;
    }

    try {
        await db.removeSound(sound.id);
        await interaction.editReply(`Sound "${sound.title}" has been removed successfully!`);
    } catch (error) {
        console.error('Failed to remove sound:', error);
        await interaction.editReply('Failed to remove sound. Please try again later.');
    }
} 