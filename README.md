# Trollus Discord Bot 🎵

A Discord bot for playing YouTube sounds in voice channels with customizable volume and per-server sound management.

## Features 🚀

- **Add Sound**: `/trollus addus` - Add a sound from a YouTube URL.
- **Play Sound**: `/trollus playus` - Play a sound with optional voice channel selection.
- **List Sounds**: `/trollus listus` - List all available sounds with pagination.
- **Remove Sound**: `/trollus removus` - Remove a sound.
- **Stop Sound**: `/trollus stopus` - Stop the current sound and disconnect.
- **Set Volume**: `/trollus volumeus` - Set global volume (0.1x to 5.0x).
- **Manage Users**: `/trollus userus` - Add or remove authorized users.

## Installation 🛠️

### Prerequisites

- Node.js v20+
- npm
- ffmpeg

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/trollus-bot.git
   cd trollus-bot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file:**

   ```env
   DISCORD_TOKEN=your_discord_token
   CLIENT_ID=your_application_id
   ```

4. **Create required directories:**

   ```bash
   mkdir -p assets/sounds
   mkdir -p data
   ```

5. **Add a valid `cookies.txt` file in the root directory (for YouTube authentication).**

6. **Configure allowed users in `src/config.ts`:**

   ```typescript
   allowedUsers: [
       'your_discord_user_id',
       // Add other admin user IDs
   ] as string[],
   ```

### Build & Deploy

1. **Build the project:**

   ```bash
   npm run build
   ```

2. **Deploy slash commands:**

   ```bash
   npm run deploy
   ```

3. **Start the bot:**

   ```bash
   npm start
   ```

## Configuration ⚙️

### System Limits

- **Maximum sound size:** 100MB
- **Maximum sounds per server:** 100
- **Maximum total storage:** 20GB

### Volume Control

- **Default volume:** 1.0
- **Maximum volume:** 5.0 (500%)
- **Minimum volume:** 0.1 (10%)

## Development 💻

### Available Scripts

- **Run with hot reload:** `npm run dev`
- **Deploy slash commands:** `npm run deploy`
- **Build TypeScript:** `npm run build`
- **Start production bot:** `npm start`

## Project Structure 📁

```
trollus-bot/
├── src/
│   ├── commands/
│   │   └── trollus/
│   │       ├── add.ts
│   │       ├── play.ts
│   │       ├── list.ts
│   │       └── ...
│   ├── services/
│   │   └── YoutubeService.ts
│   ├── database/
│   │   └── JsonDatabase.ts
│   ├── utils/
│   │   └── validators.ts
│   ├── types/
│   │   └── index.ts
│   └── config.ts
├── assets/
│   └── sounds/
│       └── [guild_id]/
├── data/
│   └── database.json
└── dist/
```

### Database Structure

```typescript
interface DatabaseSchema {
    servers: {
        [guildId: string]: {
            sounds: Sound[];
            allowedUsers: string[];
            settings: {
                defaultVolume: number;
            };
        };
    };
}
```

## Dependencies 📦

- `discord.js`: ^14.11.0
- `@discordjs/voice`: ^0.18.0
- `@discordjs/opus`: ^0.9.0
- `youtube-dl-exec`: ^3.0.12
- `dotenv`: ^16.0.3
- `uuid`: ^9.0.0

## Troubleshooting 🔍

1. **Command not found**
   - Run `npm run deploy` to update slash commands.
   - Wait a few minutes for Discord to register commands.

2. **Sound download fails**
   - Check `cookies.txt` is valid.
   - Verify YouTube URL format.
   - Check storage limits.

3. **Voice errors**
   - Ensure ffmpeg is installed.
   - Check bot has voice permissions.
   - Verify voice channel access.

## License 📄

MIT License

## Author 👤

xdLulux

## Support 💬

For issues and feature requests, please open an issue on GitHub. (no support L)