# Telegram Referral & Giveaway Bot

A Telegram bot built with TypeScript that helps track referrals and manage giveaways in groups. The bot allows users to generate personal invite links, tracks who invited whom, displays leaderboards, and manages reward giveaways.

## Features

- **Referral System**
  - Generate unique invite links for both personal and group referrals
  - Track referrals in real-time
  - Automatically credit users who invite others

- **Leaderboard**
  - Display top referrers with their invite counts
  - Support for both global and group-specific leaderboards

- **Giveaway System**
  - Create time-limited giveaways with custom settings
  - Automatically determine winners based on referral counts
  - Support for various reward structures

- **Group Management**
  - Admin commands for configuring group settings
  - Full support for Telegram group invite links
  - Automatic approval of join requests

## Tech Stack

- TypeScript
- Node.js
- Telegraf.js - Telegram Bot Framework
- Supabase (PostgreSQL) - Database
- node-cron - Scheduling

## Prerequisites

- Node.js 14+ and npm
- A Telegram Bot Token (from BotFather)
- A Supabase account and project

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/telegram-referral-bot.git
cd telegram-referral-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a .env file

Create a `.env` file in the root directory with the following variables:

```
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=your_bot_username_without_@
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### 4. Set up the database

Execute the SQL queries in `setup-database.sql` on your Supabase project to create the necessary tables:

- `users` - Stores user information and referral counts
- `referrals` - Tracks individual referrals
- `giveaways` - Manages giveaway campaigns
- `winners` - Records giveaway winners
- `group_invites` - Tracks group invite links
- `group_members` - Records group membership and who invited whom

### 5. Build and start the bot

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Bot Commands

### User Commands

- `/start` - Start the bot
- `/help` - Display help information
- `/referral` - Get your personal referral link
- `/leaderboard` - View the global referral leaderboard
- `/giveaway` - View active giveaway details

### Group Commands

- `/help_group` - Display group-specific help
- `/group_referral` - Generate a group invite link that tracks referrals
- `/leaderboard` - View group-specific leaderboard
- `/giveaway` - View active giveaway for this group

### Admin Commands

- `/startgiveaway` - Start a new giveaway
- `/endgiveaway` - End the current giveaway manually
- `/configgroup` - Configure group-specific settings

## Bot Setup in Telegram

1. Add the bot to your group
2. Make the bot an administrator with these permissions:
   - Can invite users via link
   - Can pin messages
3. Use `/help_group` to see available commands

## How Referrals Work

1. Users request a referral link using `/referral` (in private) or `/group_referral` (in groups)
2. The bot generates a unique invite link tied to that user
3. When someone joins using that link, the referrer gets credit
4. Referral counts are displayed on the leaderboard

## Giveaway System

The bot supports time-limited giveaways with configurable parameters:

- Target referral count (default: 20)
- Maximum number of winners (default: 10)
- Duration in days (default: 3)

When a giveaway ends, the bot automatically selects winners based on who met the referral criteria.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

