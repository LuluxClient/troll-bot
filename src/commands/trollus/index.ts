import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import * as add from './add';
import * as user from './user';
import * as list from './list';
import * as remove from './remove';
import * as stop from './stop';
import * as volume from './volume';
import * as play from './play';

export const data = new SlashCommandBuilder()
    .setName('trollus')
    .setDescription('Trollus commands')
    .addSubcommand(add.data)
    .addSubcommand(user.data)
    .addSubcommand(list.data)
    .addSubcommand(remove.data)
    .addSubcommand(stop.data)
    .addSubcommand(volume.data)
    .addSubcommand(play.data);

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'add':
            return add.execute(interaction);
        case 'user':
            return user.execute(interaction);
        case 'list':
            return list.execute(interaction);
        case 'remove':
            return remove.execute(interaction);
        case 'stop':
            return stop.execute(interaction);
        case 'volume':
            return volume.execute(interaction);
        case 'play':
            return play.execute(interaction);
    }
}

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'play':
            return play.autocomplete(interaction);
    }
} 