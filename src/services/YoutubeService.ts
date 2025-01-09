import ytdl, { downloadOptions } from 'ytdl-core';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Config } from '../config';

export class YoutubeService {
    private static instance: YoutubeService;
    private readonly cookiesPath: string = './cookies.txt';

    private constructor() {}

    public static getInstance(): YoutubeService {
        if (!YoutubeService.instance) {
            YoutubeService.instance = new YoutubeService();
        }
        return YoutubeService.instance;
    }

    public async downloadSound(url: string, title: string): Promise<string> {
        const sanitizedTitle = this.sanitizeTitle(title);
        const outputPath = path.join(Config.soundsPath, `${sanitizedTitle}.mp3`);

        try {
            const cookies = await this.loadCookies();
            
            await fs.mkdir(Config.soundsPath, { recursive: true });
            
            return new Promise((resolve, reject) => {
                const options: downloadOptions = {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                };

                if (cookies) {
                    (options as any).cookies = cookies;
                }

                ytdl(url, options)
                    .pipe(fsSync.createWriteStream(outputPath))
                    .on('finish', () => resolve(outputPath))
                    .on('error', reject);
            });
        } catch (error) {
            console.error('Failed to download sound:', error);
            throw error;
        }
    }

    private async loadCookies(): Promise<string> {
        try {
            return await fs.readFile(this.cookiesPath, 'utf-8');
        } catch (error) {
            console.warn('No cookies file found, downloading without authentication');
            return '';
        }
    }

    private sanitizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
} 