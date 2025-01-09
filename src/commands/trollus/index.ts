import { SlashCommandBuilder } from 'discord.js';
import * as add from './add';

export const data = new SlashCommandBuilder()
    .setName('trollus')
    .setDescription('Trollus commands')
    .addSubcommand(add.data);

export const execute = add.execute; 