import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
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

        const timeout = setTimeout(() => {
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply({
                    content: 'La commande a pris trop de temps à s\'exécuter.',
                    flags: MessageFlags.Ephemeral
                }).catch(console.error);
            }
        }, 2500);

        try {
            await command.execute(interaction);
        } finally {
            clearTimeout(timeout);
        }

    } catch (error: any) {
        console.error('[DEBUG] Error executing command:', error);
        
        if (error.code === 10062 || error.code === 40060) return;

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Une erreur est survenue lors de l\'exécution de la commande!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.followUp({
                    content: 'Une erreur est survenue lors de l\'exécution de la commande!',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (e) {
            console.error('Failed to send error message:', e);
        }
    }
});

client.login(process.env.DISCORD_TOKEN); 