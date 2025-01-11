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
    AudioPlayerStatus,
    getVoiceConnection
} from '@discordjs/voice';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';

const movingUsers = new Set<string>();

export const data = new SlashCommandSubcommandBuilder()
    .setName('moveplayus')
    .setDescription('Move a user, play a sound, then move them back')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to move')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('sound')
            .setDescription('Sound to play')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addNumberOption(option =>
        option.setName('volume')
            .setDescription('Volume multiplier (0.1 to 5.0)')
            .setMinValue(0.1)
            .setMaxValue(5.0)
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
    if (!interaction.guildId) {
        await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('You do not have permission to use this command.');
        return;
    }

    const targetUser = interaction.options.getMember('user');
    if (!(targetUser instanceof GuildMember)) {
        await interaction.editReply('Invalid user specified.');
        return;
    }

    const userKey = `${interaction.guildId}-${targetUser.id}`;
    if (movingUsers.has(userKey)) {
        await interaction.editReply('This user is already being moved by another command.');
        return;
    }

    const targetVoiceChannel = targetUser.voice.channel;
    if (!targetVoiceChannel || targetVoiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.editReply('Target user must be in a voice channel.');
        return;
    }

    try {
        const db = await JsonDatabase.getInstance();
        const sounds = await db.getAllSounds(interaction.guildId);
        const soundName = interaction.options.getString('sound', true);
        
        const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
        if (!sound) {
            await interaction.editReply('Sound not found.');
            return;
        }

        const tempChannel = await interaction.guild!.channels.create({
            name: '🎵 Trollus Room',
            type: ChannelType.GuildVoice,
            parent: targetVoiceChannel.parent
        });

        movingUsers.add(userKey);
        await targetUser.voice.setChannel(tempChannel);

        const connection = joinVoiceChannel({
            channelId: tempChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild!.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(sound.filename, {
            inlineVolume: true
        });

        const volume = interaction.options.getNumber('volume') || db.getGlobalVolume(interaction.guildId);
        resource.volume?.setVolume(volume);
        
        connection.subscribe(player);
        player.play(resource);

        await interaction.editReply(`Moving ${targetUser.displayName} and playing "${sound.title}"`);

  
        player.on(AudioPlayerStatus.Idle, async () => {
            try {
                await targetUser.voice.setChannel(targetVoiceChannel);
                await tempChannel.delete();
                movingUsers.delete(userKey);
                connection.destroy();
            } catch (error) {
                console.error('Error in cleanup:', error);
            }
        });

        player.on('error', async (error) => {
            console.error('Error playing sound:', error);
            try {
                await targetUser.voice.setChannel(targetVoiceChannel);
                await tempChannel.delete();
                movingUsers.delete(userKey);
                connection.destroy();
            } catch (cleanupError) {
                console.error('Error in error cleanup:', cleanupError);
            }
        });

    } catch (error) {
        console.error('Error in moveplay command:', error);
        movingUsers.delete(userKey);
        await interaction.editReply('Failed to execute the command. Please try again later.');
    }
} 