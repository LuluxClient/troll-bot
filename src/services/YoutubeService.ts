import youtubeDl from 'youtube-dl-exec';
import fs from 'fs/promises';
import path from 'path';
import { Config } from '../config';

export class YoutubeService {
    private static instance: YoutubeService;
    private readonly cookiesPath: string;

    private constructor() {
        this.cookiesPath = path.join(process.cwd(), 'cookies.txt');
    }

    public static getInstance(): YoutubeService {
        if (!YoutubeService.instance) {
            YoutubeService.instance = new YoutubeService();
        }
        return YoutubeService.instance;
    }

    public async downloadSound(url: string, title: string, guildId: string): Promise<string> {
        const serverSoundsPath = path.join(Config.soundsPath, guildId);
        await fs.mkdir(serverSoundsPath, { recursive: true });

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = path.join(serverSoundsPath, `${safeTitle}.mp3`);

        try {
            console.log(`[Download] Starting download for "${title}" from ${url}`);
            
            await youtubeDl(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
                output: filename,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                cookies: this.cookiesPath,
                addHeader: [
                    'referer:youtube.com',
                    'user-agent:Mozilla/5.0'
                ]
            });

            const stats = await fs.stat(filename);
            console.log(`[Download] Final file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

            if (stats.size > 0) {
                console.log('[Download] Download completed successfully');
                return filename;
            } else {
                console.error('[Download] File is empty, cleaning up...');
                await fs.unlink(filename);
                throw new Error('Downloaded file is empty');
            }
        } catch (error) {
            console.error('[Download] Fatal error:', error);
            try {
                await fs.unlink(filename).catch(() => {
                    console.log('[Download] No file to clean up');
                });
            } catch {}
            throw error;
        }
    }
} 