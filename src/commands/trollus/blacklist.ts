import { 
    SlashCommandSubcommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandSubcommandBuilder()
    .setName('blacklistus')
    .setDescription('Gère la liste des utilisateurs blacklistés')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('L\'utilisateur à gérer')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('action')
            .setDescription('Action à effectuer')
            .setRequired(true)
            .addChoices(
                { name: 'Ajouter', value: 'addus' },
                { name: 'Retirer', value: 'removeus' },
                { name: 'Liste', value: 'listus' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    console.log('Début de la commande blacklistus');
    if (!interaction.guildId) {
        await interaction.reply({ 
            content: 'Cette commande doit être utilisée dans un serveur.', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    console.log('Commande différée');

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        return;
    }
    console.log('Permissions vérifiées');

    const db = await JsonDatabase.getInstance();
    const action = interaction.options.getString('action', true);
    const targetUser = interaction.options.getMember('user') as GuildMember | null;
    console.log('Action:', action, 'Target user:', targetUser?.id);

    if (action !== 'listus' && !targetUser) {
        await interaction.editReply('Utilisateur invalide.');
        return;
    }

    switch (action) {
        case 'addus': {
            console.log('Tentative d\'ajout à la blacklist');
            const blacklist = await db.getBlacklist(interaction.guildId);
            console.log('Blacklist actuelle:', blacklist);
            if (blacklist.includes(targetUser!.id)) {
                await interaction.editReply('Cet utilisateur est déjà dans la blacklist.');
                return;
            }

            blacklist.push(targetUser!.id);
            await db.setBlacklist(interaction.guildId, blacklist);
            console.log('Blacklist mise à jour:', blacklist);
            await interaction.editReply(`${targetUser!.displayName} a été ajouté à la blacklist.`);
            break;
        }
        case 'removeus': {
            const blacklist = await db.getBlacklist(interaction.guildId);
            const index = blacklist.indexOf(targetUser!.id);
            if (index === -1) {
                await interaction.editReply('Cet utilisateur n\'est pas dans la blacklist.');
                return;
            }

            blacklist.splice(index, 1);
            await db.setBlacklist(interaction.guildId, blacklist);
            await interaction.editReply(`${targetUser!.displayName} a été retiré de la blacklist.`);
            break;
        }
        case 'listus': {
            const blacklist = await db.getBlacklist(interaction.guildId);
            if (blacklist.length === 0) {
                await interaction.editReply('La blacklist est vide.');
                return;
            }

            const blacklistedUsers = await Promise.all(
                blacklist.map(async (userId) => {
                    try {
                        const member = await interaction.guild!.members.fetch(userId);
                        return member.displayName;
                    } catch {
                        return `<Utilisateur inconnu: ${userId}>`;
                    }
                })
            );

            await interaction.editReply(
                'Utilisateurs blacklistés :\n' + 
                blacklistedUsers.map((name, i) => `${i + 1}. ${name}`).join('\n')
            );
            break;
        }
    }
} 