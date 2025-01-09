import { SlashCommandBuilder } from 'discord.js';
import * as add from './add';

export const data = new SlashCommandBuilder()
    .setName('troll')
    .setDescription('Troll commands')
    .addSubcommand(add.data);

export const execute = add.execute; 