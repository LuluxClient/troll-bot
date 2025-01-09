import youtubeDl from 'youtube-dl-exec';
import fs from 'fs/promises';
import path from 'path';
import { Config } from '../config';

export class YoutubeService {
    private static instance: YoutubeService;

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
            console.log(`[Download] Starting download for "${title}" from ${url}`);
            await fs.mkdir(Config.soundsPath, { recursive: true });

            console.log('[Download] Executing youtube-dl...');
            await youtubeDl(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
                output: outputPath,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                addHeader: [
                    'referer:youtube.com',
                    'user-agent:Mozilla/5.0'
                ]
            });

            // Verify file exists and has content
            const stats = await fs.stat(outputPath);
            console.log(`[Download] Final file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

            if (stats.size > 0) {
                console.log('[Download] Download completed successfully');
                return outputPath;
            } else {
                console.error('[Download] File is empty, cleaning up...');
                await fs.unlink(outputPath);
                throw new Error('Downloaded file is empty');
            }
        } catch (error) {
            console.error('[Download] Fatal error:', error);
            try {
                console.log('[Download] Cleaning up failed download...');
                await fs.unlink(outputPath).catch(() => {
                    console.log('[Download] No file to clean up');
                });
            } catch {}
            throw error;
        }
    }

    private sanitizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
} 