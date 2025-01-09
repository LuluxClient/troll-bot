import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import * as commandModules from './commands';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once(Events.ClientReady, () => {
    console.log('Bot is ready!');
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isAutocomplete()) {
            const command = (commandModules as Record<string, any>)[interaction.commandName];
            if (command?.handleAutocomplete) {
                await command.handleAutocomplete(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = (commandModules as Record<string, any>)[interaction.commandName];
        if (!command) return;

        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.isChatInputCommand()) {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error executing this command!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'There was an error executing this command!',
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN); 