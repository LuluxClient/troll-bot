import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    VoiceChannel,
    GuildMember,
    PermissionsBitField
} from 'discord.js';
import {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior,
    EndBehaviorType
} from '@discordjs/voice';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('recopitus')
    .setDescription('Se connecte et répète uniquement votre voix')
    .addBooleanOption(option =>
        option.setName('stop')
            .setDescription('Arrêter la répétition')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;
    const shouldStop = interaction.options.getBoolean('stop') ?? false;

    if (shouldStop) {
        const connection = getVoiceConnection(interaction.guildId);
        if (connection) {
            connection.destroy();
            await interaction.editReply('✅ Déconnecté du salon vocal.');
        } else {
            await interaction.editReply('❌ Je ne suis pas connecté à un salon vocal.');
        }
        return;
    }

    if (!voiceChannel) {
        await interaction.editReply('❌ Vous devez être dans un salon vocal.');
        return;
    }

    try {
        const permissions = voiceChannel.permissionsFor(interaction.client.user!);
        if (!permissions?.has([
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak
        ])) {
            await interaction.editReply('❌ Je n\'ai pas les permissions nécessaires dans ce salon.');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });

        connection.subscribe(player);

        connection.receiver.speaking.on('start', (userId) => {
            console.log(`[Recopitus] User ${userId} started speaking`);
            if (userId === member.id) {
                console.log(`[Recopitus] Creating audio stream for user ${userId}`);
                const audioStream = connection.receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.Manual
                    }
                });

                const resource = createAudioResource(audioStream, {
                    inputType: StreamType.Opus,
                    inlineVolume: true
                });

                resource.volume?.setVolume(1);
                player.play(resource);

                console.log(`[Recopitus] Playing audio from user ${userId}`);
            }
        });

        player.on('error', error => {
            console.error('[Recopitus] Error in audio player:', error);
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('[Recopitus] Audio player is now playing');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('[Recopitus] Audio player is now idle');
        });

        connection.on('stateChange', async (oldState, newState) => {
            console.log(`[Recopitus] Connection state changed from ${oldState.status} to ${newState.status}`);
            if (newState.status === 'disconnected') {
                player.stop();
                console.log('[Recopitus] Stopped audio player due to disconnection');
            }
        });

        await interaction.editReply('✅ Connecté au salon vocal. Je répète uniquement votre voix.');

    } catch (error) {
        console.error('Error in recopitus command:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la connexion au salon vocal.');
    }
} 