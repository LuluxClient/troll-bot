import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags
} from 'discord.js';
import { JsonDatabase } from '../../database/JsonDatabase';
import { isUserAllowed } from '../../utils/permissions';

export const data = new SlashCommandBuilder()
    .setName('blacklistus')
    .setDescription('Gère la liste des utilisateurs blacklistés')
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Ajoute un utilisateur à la blacklist')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('L\'utilisateur à blacklister')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Retire un utilisateur de la blacklist')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('L\'utilisateur à retirer de la blacklist')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Affiche la liste des utilisateurs blacklistés')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        await interaction.reply({ 
            content: 'Cette commande doit être utilisée dans un serveur.', 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!await isUserAllowed(interaction)) {
        await interaction.editReply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        return;
    }

    const db = await JsonDatabase.getInstance();
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'add': {
            const targetUser = interaction.options.getMember('user');
            if (!(targetUser instanceof GuildMember)) {
                await interaction.editReply('Utilisateur invalide.');
                return;
            }

            const blacklist = await db.getBlacklist(interaction.guildId);
            if (blacklist.includes(targetUser.id)) {
                await interaction.editReply('Cet utilisateur est déjà dans la blacklist.');
                return;
            }

            blacklist.push(targetUser.id);
            await db.setBlacklist(interaction.guildId, blacklist);
            await interaction.editReply(`${targetUser.displayName} a été ajouté à la blacklist.`);
            break;
        }
        case 'remove': {
            const targetUser = interaction.options.getMember('user');
            if (!(targetUser instanceof GuildMember)) {
                await interaction.editReply('Utilisateur invalide.');
                return;
            }

            const blacklist = await db.getBlacklist(interaction.guildId);
            const index = blacklist.indexOf(targetUser.id);
            if (index === -1) {
                await interaction.editReply('Cet utilisateur n\'est pas dans la blacklist.');
                return;
            }

            blacklist.splice(index, 1);
            await db.setBlacklist(interaction.guildId, blacklist);
            await interaction.editReply(`${targetUser.displayName} a été retiré de la blacklist.`);
            break;
        }
        case 'list': {
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