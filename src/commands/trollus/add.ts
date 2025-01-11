import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { YoutubeService } from '../../services/YoutubeService';
import { validateUrl } from '../../utils/validators';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('addus')
    .setDescription('Add a new trollus sound')
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
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('You do not have permission to use this command.');
        return;
    }

    const url = interaction.options.getString('url', true);
    const title = interaction.options.getString('title', true);

    if (!validateUrl(url)) {
        await interaction.editReply('Invalid YouTube URL provided.');
        return;
    }

    try {
        const youtube = YoutubeService.getInstance();
        const db = await JsonDatabase.getInstance();

        const existingSounds = await db.getAllSounds(interaction.guildId);
        if (existingSounds.some(sound => sound.title.toLowerCase() === title.toLowerCase())) {
            await interaction.editReply(`A sound with the name "${title}" already exists. Please choose a different name.`);
            return;
        }

        await interaction.editReply('Downloading sound... This might take a moment.');
        
        console.log('[Database] Starting download process...');
        const filename = await youtube.downloadSound(url, title, interaction.guildId);
        console.log(`[Database] Download completed: ${filename}`);

        const fileExists = await fs.access(filename).then(() => true).catch(() => false);
        console.log(`[Database] File exists check: ${fileExists}`);
        
        if (!fileExists) {
            throw new Error('Failed to download sound file');
        }

        const stats = await fs.stat(filename);
        const canAdd = await db.canAddSound(interaction.guildId, stats.size);
        if (!canAdd.can) {
            await fs.unlink(filename);
            await interaction.editReply(canAdd.reason || 'Cannot add sound due to storage limits.');
            return;
        }

        const soundId = uuidv4();
        const sound = {
            id: soundId,
            title,
            filename,
            addedBy: interaction.user.id,
            addedAt: new Date().toISOString()
        };

        console.log('[Database] Adding sound to database:', sound);
        await db.addSound(interaction.guildId, sound);
        console.log('[Database] Sound added successfully');

        await interaction.editReply(`Sound "${title}" has been added successfully!`);
    } catch (error) {
        console.error('[Database] Error in add command:', error);
        await interaction.editReply('Failed to add the sound. Please try again later.');
    }
} 