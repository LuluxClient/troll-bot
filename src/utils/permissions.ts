import { ChatInputCommandInteraction } from 'discord.js';
import { JsonDatabase } from '../database/JsonDatabase';
import { Config } from '../config';

export async function isUserAllowed(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const userId = interaction.user.id;
    
    // Check if user is in hardcoded admin list
    if (Config.allowedUsers.includes(userId)) {
        return true;
    }

    // Check if user is in database allowed users
    const db = await JsonDatabase.getInstance();
    const allowedUsers = db.getAllowedUsers();
    return allowedUsers.includes(userId);
} 