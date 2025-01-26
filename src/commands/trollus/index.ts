import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import * as add from './add';
import * as user from './user';
import * as list from './list';
import * as remove from './remove';
import * as stop from './stop';
import * as volume from './volume';
import * as play from './play';
import * as moveplay from './moveplay';
import * as tourduparc from './tourduparc';
import * as retard from './retard';
import * as blacklist from './blacklist';
import * as nick from './nick';
import * as factchecker from './factchecker';
import * as recopitus from './recopitus';

export const trollus = {
    data: new SlashCommandBuilder()
        .setName('trollus')
        .setDescription('Trollus commands')
        .addSubcommand(add.data)
        .addSubcommand(user.data)
        .addSubcommand(list.data)
        .addSubcommand(remove.data)
        .addSubcommand(stop.data)
        .addSubcommand(volume.data)
        .addSubcommand(play.data)
        .addSubcommand(moveplay.data)
        .addSubcommand(tourduparc.data)
        .addSubcommand(retard.data)
        .addSubcommand(blacklist.data)
        .addSubcommand(nick.data)
        .addSubcommand(factchecker.data)
        .addSubcommand(recopitus.data),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'addus':
                return add.execute(interaction);
            case 'userus':
                return user.execute(interaction);
            case 'listus':
                return list.execute(interaction);
            case 'removus':
                return remove.execute(interaction);
            case 'stopus':
                return stop.execute(interaction);
            case 'volumeus':
                return volume.execute(interaction);
            case 'playus':
                return play.execute(interaction);
            case 'moveplayus':
                return moveplay.execute(interaction);
            case 'tourduparcus':
                return tourduparc.execute(interaction);
            case 'retardus':
                return retard.execute(interaction);
            case 'blacklistus':
                return blacklist.execute(interaction);
            case 'nickus':
                return nick.execute(interaction);
            case 'factcheckerus':
                return factchecker.execute(interaction);
            case 'recopitus':
                return recopitus.execute(interaction);
        }
    },

    async handleAutocomplete(interaction: AutocompleteInteraction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'playus':
                return play.autocomplete(interaction);
            case 'removus':
                return remove.autocomplete(interaction);
            case 'moveplayus':
                return moveplay.autocomplete(interaction);
            case 'tourduparcus':
                return tourduparc.autocomplete(interaction);
        }
    }
}; 