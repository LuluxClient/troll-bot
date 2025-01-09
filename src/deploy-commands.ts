import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { config } from 'dotenv';
import * as commandModules from './commands';

config();

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

interface CommandModule {
    data: {
        toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
    };
}

for (const module of Object.values(commandModules) as CommandModule[]) {
    commands.push(module.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})(); 