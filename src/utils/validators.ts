export function validateUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtu.be';
    } catch {
        return false;
    }
} 