import { ChatInputCommandInteraction, MessageContextMenuCommandInteraction } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';
import { Config } from '../config';

export async function isUserAllowed(
    interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction
): Promise<boolean> {
    const userId = interaction.user.id;
    
    if (Config.allowedUsers.includes(userId)) {
        return true;
    }

    if (!interaction.guildId) {
        return false;
    }

    const db = await JsonDatabase.getInstance();
    const allowedUsers = db.getAllowedUsers(interaction.guildId);
    return allowedUsers.includes(userId);
} 

// TODO: Add permissions for each command in the future (maybe uwu)