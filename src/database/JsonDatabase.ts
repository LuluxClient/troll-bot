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
        await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    }

    public async addSound(sound: Sound): Promise<void> {
        this.data.sounds.push(sound);
        await this.save();
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

    public async updateVolume(id: string, volume: number): Promise<boolean> {
        const sound = this.data.sounds.find(s => s.id === id);
        if (sound) {
            sound.volume = volume;
            await this.save();
            return true;
        }
        return false;
    }
} 