import { Client, Events, GatewayIntentBits, MessageFlags, GuildMember, PartialGuildMember } from 'discord.js';
import { config } from 'dotenv';
import * as commandModules from './commands';
import * as guildMemberUpdate from './commands/trollus/nick';
import * as messageCreate from './events/messageCreate';
import * as guildMemberAdd from './events/guildMemberAdd';
import * as guildBanAdd from './events/guildBanAdd';
import { contextMenuCommands } from './applications';
import { NicknameRotationService } from './services/NicknameRotationService';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

client.once(Events.ClientReady, () => {
    console.log('Bot is ready!');
    NicknameRotationService.getInstance(client);
});

client.on(Events.GuildMemberUpdate, (...args) => guildMemberUpdate.events[0].execute(...args));
client.on(Events.GuildMemberAdd, member => guildMemberAdd.event.execute(member));
client.on(Events.GuildBanAdd, ban => guildBanAdd.event.execute(ban));

client.on(Events.MessageCreate, message => messageCreate.event.execute(message));

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

        // Handle context menu commands
        if (interaction.isMessageContextMenuCommand()) {
            console.log(`[DEBUG] Context menu command received: ${interaction.commandName}`);
            const command = contextMenuCommands.find(cmd => cmd.data.name === interaction.commandName);
            if (!command) {
                console.log(`[DEBUG] Context menu command not found: ${interaction.commandName}`);
                return;
            }
            await command.execute(interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        console.log(`[DEBUG] Command interaction received: ${interaction.commandName} in guild: ${interaction.guildId}`);
        const command = (commandModules as Record<string, any>)[interaction.commandName];
        if (!command) {
            console.log(`[DEBUG] Command not found: ${interaction.commandName}`);
            return;
        }

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                if (interaction.isChatInputCommand()) {
                    if (!interaction.replied && !interaction.deferred) {
                        interaction.reply({
                            content: 'La commande a pris trop de temps à s\'exécuter.',
                            flags: MessageFlags.Ephemeral
                        }).catch(console.error);
                    }
                }
                reject(new Error('Command timeout'));
            }, 2500);
        });

        try {
            await Promise.race([command.execute(interaction), timeoutPromise]);
        } catch (error) {
            if (error instanceof Error && error.message !== 'Command timeout') {
                throw error;
            }
        }

    } catch (error: any) {
        console.error('[DEBUG] Error executing command:', error);
        
        if (error.code === 10062 || error.code === 40060 || error.code === 10015) return;

        if (interaction.isChatInputCommand()) {
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
    }
});

client.login(process.env.DISCORD_TOKEN); 