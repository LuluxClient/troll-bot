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
            console.log(`[DEBUG] Autocomplete interaction received for command: ${interaction.commandName}`);
            const command = (commandModules as Record<string, any>)[interaction.commandName];
            if (command?.handleAutocomplete) {
                await command.handleAutocomplete(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        console.log(`[DEBUG] Command interaction received: ${interaction.commandName} in guild: ${interaction.guildId}`);
        const command = (commandModules as Record<string, any>)[interaction.commandName];
        if (!command) {
            console.log(`[DEBUG] Command not found: ${interaction.commandName}`);
            return;
        }

        await command.execute(interaction);
    } catch (error: any) {
        console.error('[DEBUG] Error executing command:', error);
        
        if (error.code === 10062 || error.code === 40060) return;

        if (interaction.isChatInputCommand()) {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: 'Une erreur est survenue lors de l\'exécution de la commande!',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'Une erreur est survenue lors de l\'exécution de la commande!',
                        ephemeral: true
                    });
                }
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN); 