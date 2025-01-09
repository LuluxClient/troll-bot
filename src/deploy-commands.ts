import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import * as commandModules from './commands';

config();

const commands = [];
for (const module of Object.values(commandModules)) {
    commands.push(module.data.toJSON());
}

console.log('[DEBUG] Commands to register:', commands);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log(`[DEBUG] Started refreshing application (/) commands for app ${process.env.CLIENT_ID}`);

        const result = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands }
        );

        console.log('[DEBUG] API Response:', result);
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('[DEBUG] Error deploying commands:', error);
    }
})(); 