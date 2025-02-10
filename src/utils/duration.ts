export function formatDuration(minutes: number): string {
    if (minutes < 1) {
        return `${Math.round(minutes * 60)} seconde${Math.round(minutes * 60) > 1 ? 's' : ''}`;
    } else if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        return `${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (minutes < 10080) {
        const days = Math.floor(minutes / 1440);
        return `${days} jour${days > 1 ? 's' : ''}`;
    } else if (minutes < 43200) {
        const weeks = Math.floor(minutes / 10080);
        return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else {
        const months = Math.floor(minutes / 43200);
        return `${months} mois`;
    }
}

/**
 * Parse a duration string into minutes
 * Supports formats:
 * - s: seconds (e.g., '30s' = 0.5 minutes)
 * - m: minutes (e.g., '5m' = 5 minutes)
 * - h: hours (e.g., '2h' = 120 minutes)
 * - d: days (e.g., '1d' = 1440 minutes)
 * - w: weeks (e.g., '1w' = 10080 minutes)
 * - M: months (e.g., '1M' = 43200 minutes, assuming 30 days per month)
 */
export function parseDuration(duration: string, minMinutes: number, maxMinutes: number): { 
    success: boolean;
    minutes?: number;
    error?: string;
} {
    const match = duration.match(/^(\d+)([smhdwM])$/);
    if (!match) {
        return {
            success: false,
            error: 'Format invalide. Utilisez un nombre suivi de s/m/h/d/w/M (ex: 30s, 5m, 2h, 1d, 1w, 1M)'
        };
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    let minutes: number;
    switch (unit) {
        case 's':
            minutes = value / 60;
            break;
        case 'm':
            minutes = value;
            break;
        case 'h':
            minutes = value * 60;
            break;
        case 'd':
            minutes = value * 24 * 60;
            break;
        case 'w':
            minutes = value * 7 * 24 * 60;
            break;
        case 'M':
            minutes = value * 30 * 24 * 60; //30 jours par mois ici
            break;
        default:
            return {
                success: false,
                error: 'Unité invalide. Utilisez s/m/h/d/w/M'
            };
    }

    if (minutes < minMinutes) {
        return {
            success: false,
            error: `La durée minimum est de ${formatDuration(minMinutes)}`
        };
    }

    if (minutes > maxMinutes) {
        return {
            success: false,
            error: `La durée maximum est de ${formatDuration(maxMinutes)}`
        };
    }

    return {
        success: true,
        minutes
    };
} 