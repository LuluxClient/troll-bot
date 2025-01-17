import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction, 
    GuildMember,
    ChannelType,
    MessageFlags,
    VoiceChannel,
    AutocompleteInteraction
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';
import { Config } from '../../config';
import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    VoiceConnection,
    AudioPlayer
} from '@discordjs/voice';

const movingUsers = new Set<string>();

export const data = new SlashCommandSubcommandBuilder()
    .setName('tourduparcus')
    .setDescription('Fait faire le tour du parc à un utilisateur')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('Utilisateur à déplacer')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('sound')
            .setDescription('Son à jouer pendant le tour')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addNumberOption(option =>
        option.setName('volume')
            .setDescription('Volume multiplier (' + Config.minVolume + ' to ' + Config.maxVolume + ')')
            .setMinValue(Config.minVolume)
            .setMaxValue(Config.maxVolume)
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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const targetUser = interaction.options.getMember('user');
    if (!(targetUser instanceof GuildMember)) {
        await interaction.editReply('Utilisateur invalide.');
        return;
    }

    const userKey = `${interaction.guildId}-${targetUser.id}`;
    if (movingUsers.has(userKey)) {
        await interaction.editReply('Cet utilisateur est déjà en train d\'être déplacé.');
        return;
    }

    const targetVoiceChannel = targetUser.voice.channel;
    if (!targetVoiceChannel || targetVoiceChannel.type !== ChannelType.GuildVoice) {
        await interaction.editReply('L\'utilisateur doit être dans un salon vocal.');
        return;
    }

    let currentConnection: VoiceConnection | null = null;
    let player: AudioPlayer | null = null;
    let isTouring = false;

    try {
        const db = await JsonDatabase.getInstance();
        const soundName = interaction.options.getString('sound', true);
        const sounds = await db.getAllSounds(interaction.guildId);
        const sound = sounds.find(s => s.title.toLowerCase() === soundName.toLowerCase());
        
        if (!sound) {
            await interaction.editReply('Son introuvable.');
            return;
        }

        const voiceChannels = interaction.guild!.channels.cache
            .filter(channel => 
                channel.type === ChannelType.GuildVoice && 
                channel.id !== targetVoiceChannel.id &&
                (channel as VoiceChannel).members.size === 0
            ) as Map<string, VoiceChannel>;

        if (voiceChannels.size < 2) {
            await interaction.editReply('Pas assez de salons vocaux vides pour faire le tour du parc !');
            return;
        }

        movingUsers.add(userKey);
        isTouring = true;
        await interaction.editReply(`Début du tour du parc pour ${targetUser.displayName}!`);

        player = createAudioPlayer();
        const volume = interaction.options.getNumber('volume') || Config.maxVolume;

        const createNewResource = () => {
            const resource = createAudioResource(sound.filename, {
                inlineVolume: true
            });
            resource.volume?.setVolume(volume);
            return resource;
        };

        player.on(AudioPlayerStatus.Idle, () => {
            if (isTouring && player) {
                player.play(createNewResource());
            }
        });

        const moveToChannel = async (channel: VoiceChannel) => {
            try {
                await targetUser.voice.setChannel(channel);

                const newConnection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: interaction.guildId!,
                    adapterCreator: interaction.guild!.voiceAdapterCreator,
                });

                await sleep(100);

                if (currentConnection) {
                    try {
                        (currentConnection as VoiceConnection).destroy();
                    } catch (e) {
                    }
                }

                currentConnection = newConnection;
                if (player) {
                    currentConnection.subscribe(player);
                }
            } catch (error) {
                console.error('Erreur lors du changement de salon:', error);
                throw error;
            }
        };


        await moveToChannel(targetVoiceChannel);
        if (player) {
            player.play(createNewResource());
        }

        const channelsArray = Array.from(voiceChannels.values());
        let lastChannel: VoiceChannel | null = null;
        for (let i = 0; i < Config.tourduparcus.moves && isTouring; i++) {
            let availableChannels = channelsArray.filter(channel => 
                channel.members.size === 0 && 
                (!lastChannel || channel.id !== lastChannel.id)
            );

            if (availableChannels.length === 0) {
                break;
            }

            const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
            lastChannel = randomChannel;

            await moveToChannel(randomChannel);
            await sleep(Config.tourduparcus.moveDelay);
        }

        isTouring = false;
        await sleep(Config.tourduparcus.finalDelay);

        if (player) {
            player.stop();
            player.removeAllListeners();
        }

        await moveToChannel(targetVoiceChannel);
        
        if (currentConnection) {
            try {
                (currentConnection as VoiceConnection).destroy();
            } catch (e) {
                console.error('Erreur lors de la destruction de la connexion:', e);
            }
        }

        movingUsers.delete(userKey);
        await interaction.editReply(`Tour du parc terminé pour ${targetUser.displayName}!`);

    } catch (error) {
        console.error('Error in tourduparc command:', error);
        isTouring = false;
        movingUsers.delete(userKey);

        if (player) {
            player.stop();
            player.removeAllListeners();
        }

        if (currentConnection) {
            try {
                (currentConnection as VoiceConnection).destroy();
            } catch (e) {
                console.error('Erreur lors de la destruction de la connexion:', e);
            }
        }

        try {
            await targetUser.voice.setChannel(targetVoiceChannel);
        } catch (e) {
            console.error('Erreur lors du retour au salon d\'origine:', e);
        }

        await interaction.editReply('Erreur lors de l\'exécution de la commande. Réessayez plus tard.');
    }
} 