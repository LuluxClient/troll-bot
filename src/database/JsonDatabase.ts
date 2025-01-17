import fs from 'fs/promises';
import path from 'path';
import { Config } from '../config';
import { DatabaseSchema, Sound, ForcedNickname } from '../types';

export class JsonDatabase {
    private static instance: JsonDatabase;
    private data: DatabaseSchema;
    private readonly dbPath: string;

    private constructor() {
        this.dbPath = Config.database.path;
        this.data = {
            servers: {},
            unban: {
                lastUnban: 0,
                inviteLinks: {}
            }
        };
    }

    private initServerData(guildId: string): void {
        if (!this.data.servers[guildId]) {
            this.data.servers[guildId] = {
                sounds: [],
                allowedUsers: [],
                blacklist: [],
                forcedNicknames: [],
                settings: {
                    defaultVolume: Config.defaultVolume
                }
            };
        } else {
            if (!this.data.servers[guildId].blacklist) {
                this.data.servers[guildId].blacklist = [];
                this.save().catch(console.error);
            }
            if (!this.data.servers[guildId].forcedNicknames) {
                this.data.servers[guildId].forcedNicknames = [];
                this.save().catch(console.error);
            }
        }
        if (!this.data.unban) {
            this.data.unban = {
                lastUnban: 0,
                inviteLinks: {}
            };
            this.save().catch(console.error);
        }
    }

    public static async getInstance(): Promise<JsonDatabase> {
        if (!JsonDatabase.instance) {
            JsonDatabase.instance = new JsonDatabase();
            await JsonDatabase.instance.init();
        }
        return JsonDatabase.instance;
    }

    private async init(): Promise<void> {
        try {
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            
            const exists = await fs.access(this.dbPath)
                .then(() => true)
                .catch(() => false);

            if (exists) {
                const content = await fs.readFile(this.dbPath, 'utf-8');
                this.data = JSON.parse(content);
            } else {
                await this.save();
            }
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    private async save(): Promise<void> {
        try {
            console.log('[Database] Saving to:', this.dbPath);
            await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('[Database] Save successful');
        } catch (error) {
            console.error('[Database] Save failed:', error);
            throw error;
        }
    }

    public async addSound(guildId: string, sound: Sound): Promise<void> {
        this.initServerData(guildId);
        console.log(`[Database] Adding sound for server ${guildId}`);
        this.data.servers[guildId].sounds.push(sound);
        await this.save();
    }

    public async removeSound(guildId: string, id: string): Promise<boolean> {
        this.initServerData(guildId);
        const initialLength = this.data.servers[guildId].sounds.length;
        this.data.servers[guildId].sounds = this.data.servers[guildId].sounds.filter(sound => sound.id !== id);
        await this.save();
        return initialLength !== this.data.servers[guildId].sounds.length;
    }

    public async getSounds(guildId: string, page: number): Promise<Sound[]> {
        this.initServerData(guildId);
        const start = (page - 1) * Config.pagination.itemsPerPage;
        return this.data.servers[guildId].sounds.slice(start, start + Config.pagination.itemsPerPage);
    }

    public async getAllSounds(guildId: string): Promise<Sound[]> {
        this.initServerData(guildId);
        return this.data.servers[guildId].sounds;
    }

    public async getTotalSounds(guildId: string): Promise<number> {
        this.initServerData(guildId);
        return this.data.servers[guildId].sounds.length;
    }

    public async addAllowedUser(guildId: string, userId: string): Promise<void> {
        this.initServerData(guildId);
        if (!this.data.servers[guildId].allowedUsers.includes(userId)) {
            this.data.servers[guildId].allowedUsers.push(userId);
            await this.save();
        }
    }

    public async removeAllowedUser(guildId: string, userId: string): Promise<void> {
        this.initServerData(guildId);
        this.data.servers[guildId].allowedUsers = this.data.servers[guildId].allowedUsers.filter(id => id !== userId);
        await this.save();
    }

    public async updateGlobalVolume(guildId: string, volume: number): Promise<void> {
        this.initServerData(guildId);
        this.data.servers[guildId].settings.defaultVolume = volume;
        await this.save();
    }

    public getGlobalVolume(guildId: string): number {
        this.initServerData(guildId);
        return this.data.servers[guildId].settings.defaultVolume;
    }

    public getAllowedUsers(guildId: string): string[] {
        this.initServerData(guildId);
        return this.data.servers[guildId].allowedUsers;
    }

    private async getTotalStorageSize(guildId: string): Promise<number> {
        let totalSize = 0;
        for (const sound of this.data.servers[guildId].sounds) {
            try {
                const stats = await fs.stat(sound.filename);
                totalSize += stats.size;
            } catch (error) {
                console.error(`Failed to get size for ${sound.filename}:`, error);
            }
        }
        return totalSize;
    }

    public async canAddSound(guildId: string, fileSize: number): Promise<{ can: boolean; reason?: string }> {
        this.initServerData(guildId);
        const serverSounds = this.data.servers[guildId].sounds;

        if (serverSounds.length >= Config.limits.maxSoundCount) {
            return { can: false, reason: `Maximum number of sounds (${Config.limits.maxSoundCount}) reached for this server.` };
        }

        if (fileSize > Config.limits.maxSoundSize) {
            return { 
                can: false, 
                reason: `Sound file too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum size is ${Config.limits.maxSoundSize / 1024 / 1024}MB.` 
            };
        }

        const currentStorage = await this.getTotalStorageSize(guildId);
        if (currentStorage + fileSize > Config.limits.maxTotalStorage) {
            return { 
                can: false, 
                reason: `Total storage limit of ${Config.limits.maxTotalStorage / 1024 / 1024 / 1024}GB would be exceeded.` 
            };
        }

        return { can: true };
    }

    public async getBlacklist(guildId: string): Promise<string[]> {
        this.initServerData(guildId);
        return this.data.servers[guildId].blacklist || [];
    }

    public async setBlacklist(guildId: string, blacklist: string[]): Promise<void> {
        this.initServerData(guildId);
        this.data.servers[guildId].blacklist = blacklist;
        await this.save();
    }

    public async isUserBlacklisted(guildId: string, userId: string): Promise<boolean> {
        const blacklist = await this.getBlacklist(guildId);
        return blacklist.includes(userId);
    }

    public async addForcedNickname(guildId: string, userId: string, nickname: string, originalNickname: string | null, durationMinutes: number): Promise<void> {
        this.initServerData(guildId);
        
        this.data.servers[guildId].forcedNicknames = this.data.servers[guildId].forcedNicknames.filter(n => n.userId !== userId);
        
        this.data.servers[guildId].forcedNicknames.push({
            guildId,
            userId,
            nickname,
            originalNickname,
            expiresAt: Date.now() + (durationMinutes * 60 * 1000)
        });
        
        await this.save();
    }

    public async removeForcedNickname(guildId: string, userId: string): Promise<string | null> {
        this.initServerData(guildId);
        const nickname = this.data.servers[guildId].forcedNicknames.find(n => n.userId === userId);
        if (nickname) {
            this.data.servers[guildId].forcedNicknames = this.data.servers[guildId].forcedNicknames.filter(n => n.userId !== userId);
            await this.save();
            return nickname.originalNickname;
        }
        return null;
    }

    public async getForcedNicknames(guildId: string): Promise<ForcedNickname[]> {
        this.initServerData(guildId);
        return this.data.servers[guildId].forcedNicknames;
    }

    public async cleanExpiredNicknames(guildId: string): Promise<ForcedNickname[]> {
        this.initServerData(guildId);
        const now = Date.now();
        const expired = this.data.servers[guildId].forcedNicknames.filter(n => n.expiresAt <= now);
        this.data.servers[guildId].forcedNicknames = this.data.servers[guildId].forcedNicknames.filter(n => n.expiresAt > now);
        if (expired.length > 0) {
            await this.save();
        }
        return expired;
    }

    public async updateUnbanCooldown(): Promise<void> {
        this.data.unban.lastUnban = Date.now();
        await this.save();
    }

    public async getUnbanCooldown(): Promise<number> {
        return this.data.unban.lastUnban;
    }

    public async setInviteLink(guildId: string, inviteLink: string): Promise<void> {
        this.data.unban.inviteLinks[guildId] = inviteLink;
        await this.save();
    }

    public async getInviteLink(guildId: string): Promise<string | undefined> {
        return this.data.unban.inviteLinks[guildId];
    }

    public async getAllInviteLinks(): Promise<{ [guildId: string]: string }> {
        return this.data.unban.inviteLinks;
    }
} 