import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction, 
    GuildMember,
    ChannelType,
    MessageFlags,
    AutocompleteInteraction
} from 'discord.js';
import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource,
    AudioPlayerStatus
} from '@discordjs/voice';
import { JsonDatabase } from '../../database/JsonDatabase';
import path from 'path';
import { Config } from '../../config';

export const data = new SlashCommandSubcommandBuilder()
    .setName('play')
    .setDescription('Play a trollus sound')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Sound name')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const db = await JsonDatabase.getInstance();
    const sounds = await db.getAllSounds();

    const filtered = sounds
        .filter(sound => sound.title.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(sound => ({
            name: sound.title,
            value: sound.title
        }));

    await interaction.respond(filtered);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!(interaction.member instanceof GuildMember)) {
        await interaction.editReply('Command must be used in a server.');
        return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.editReply('You must be in a voice channel to use this command!');
        return;
    }

    try {
        const db = await JsonDatabase.getInstance();
        const sounds = await db.getAllSounds();
        const soundName = interaction.options.getString('name', true);
        
        const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
        if (!sound) {
            await interaction.editReply('Sound not found.');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId!,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(sound.filename, {
            inlineVolume: true
        });

        const globalVolume = db.getGlobalVolume();
        resource.volume?.setVolume(globalVolume);
        
        connection.subscribe(player);
        player.play(resource);

        await interaction.editReply(`Playing "${sound.title}"`);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });

        player.on('error', (error) => {
            console.error('Error playing sound:', error);
            connection.destroy();
        });

    } catch (error) {
        console.error('Failed to play sound:', error);
        await interaction.editReply('Failed to play sound. Please try again later.');
    }
} 