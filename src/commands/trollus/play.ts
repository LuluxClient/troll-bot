import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction, 
    GuildMember,
    ChannelType,
    MessageFlags,
    AutocompleteInteraction,
    VoiceChannel
} from 'discord.js';
import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource,
    AudioPlayerStatus
} from '@discordjs/voice';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('playus')
    .setDescription('Play a trollus sound')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Sound name')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('Voice channel to play in (optional)')
            .addChannelTypes(ChannelType.GuildVoice)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;

    const focusedValue = interaction.options.getFocused().toLowerCase();
    const db = await JsonDatabase.getInstance();
    const sounds = await db.getAllSounds(interaction.guildId);

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
    console.log(`[DEBUG] Play command started in guild: ${interaction.guildId}`);
    
    if (!interaction.guildId) {
        console.log('[DEBUG] No guild ID found');
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('You do not have permission to use this command.');
        return;
    }

    if (!(interaction.member instanceof GuildMember)) {
        await interaction.editReply('Command must be used in a server.');
        return;
    }

    const specifiedChannel = interaction.options.getChannel('channel') as VoiceChannel | null;
    const memberVoiceChannel = (interaction.member as GuildMember).voice.channel;
    
    const voiceChannel = specifiedChannel || memberVoiceChannel;

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.editReply('Please either join a voice channel or specify a voice channel to play in!');
        return;
    }

    try {
        const db = await JsonDatabase.getInstance();
        console.log(`[DEBUG] Getting sounds for guild: ${interaction.guildId}`);
        const sounds = await db.getAllSounds(interaction.guildId);
        console.log(`[DEBUG] Found ${sounds.length} sounds`);
        
        const soundName = interaction.options.getString('name', true);
        
        const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
        if (!sound) {
            await interaction.editReply('Sound not found.');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(sound.filename, {
            inlineVolume: true
        });

        const globalVolume = db.getGlobalVolume(interaction.guildId);
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
        console.error('[DEBUG] Play command error:', error);
        await interaction.editReply('Failed to play sound. Please try again later.');
    }
} 