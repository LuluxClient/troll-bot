import fs from 'fs/promises';
import path from 'path';
import { Config } from '../config';
import { DatabaseSchema, Sound } from '../types';

export class JsonDatabase {
    private static instance: JsonDatabase;
    private data: DatabaseSchema;
    private readonly dbPath: string;

    private constructor() {
        this.dbPath = Config.database.path;
        this.data = {
            sounds: [],
            allowedUsers: [],
            settings: {
                defaultVolume: Config.defaultVolume
            }
        };
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

    public async addSound(sound: Sound): Promise<void> {
        console.log('[Database] Current sounds:', this.data.sounds);
        this.data.sounds.push(sound);
        console.log('[Database] After adding sound:', this.data.sounds);
        await this.save();
        console.log('[Database] Save completed');
    }

    public async removeSound(id: string): Promise<boolean> {
        const initialLength = this.data.sounds.length;
        this.data.sounds = this.data.sounds.filter(sound => sound.id !== id);
        await this.save();
        return initialLength !== this.data.sounds.length;
    }

    public async getSounds(page: number): Promise<Sound[]> {
        const start = (page - 1) * Config.pagination.itemsPerPage;
        return this.data.sounds.slice(start, start + Config.pagination.itemsPerPage);
    }

    public async getAllSounds(): Promise<Sound[]> {
        return this.data.sounds;
    }

    public async getTotalSounds(): Promise<number> {
        return this.data.sounds.length;
    }

    public async addAllowedUser(userId: string): Promise<void> {
        if (!this.data.allowedUsers.includes(userId)) {
            this.data.allowedUsers.push(userId);
            await this.save();
        }
    }

    public async removeAllowedUser(userId: string): Promise<void> {
        this.data.allowedUsers = this.data.allowedUsers.filter(id => id !== userId);
        await this.save();
    }

    public async updateGlobalVolume(volume: number): Promise<void> {
        this.data.settings.defaultVolume = volume;
        await this.save();
    }

    public getGlobalVolume(): number {
        return this.data.settings.defaultVolume;
    }

    public getAllowedUsers(): string[] {
        return this.data.allowedUsers;
    }

    private async getTotalStorageSize(): Promise<number> {
        let totalSize = 0;
        for (const sound of this.data.sounds) {
            try {
                const stats = await fs.stat(sound.filename);
                totalSize += stats.size;
            } catch (error) {
                console.error(`Failed to get size for ${sound.filename}:`, error);
            }
        }
        return totalSize;
    }

    public async canAddSound(fileSize: number): Promise<{ can: boolean; reason?: string }> {
        // Check sound count limit
        if (this.data.sounds.length >= Config.limits.maxSoundCount) {
            return { can: false, reason: `Maximum number of sounds (${Config.limits.maxSoundCount}) reached.` };
        }

        // Check individual file size limit
        if (fileSize > Config.limits.maxSoundSize) {
            return { 
                can: false, 
                reason: `Sound file too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum size is ${Config.limits.maxSoundSize / 1024 / 1024}MB.` 
            };
        }

        // Check total storage limit
        const currentStorage = await this.getTotalStorageSize();
        if (currentStorage + fileSize > Config.limits.maxTotalStorage) {
            return { 
                can: false, 
                reason: `Total storage limit of ${Config.limits.maxTotalStorage / 1024 / 1024 / 1024}GB would be exceeded.` 
            };
        }

        return { can: true };
    }
} 