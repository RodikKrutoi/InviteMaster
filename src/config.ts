import dotenv from 'dotenv';
dotenv.config();

// Bot configuration
export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const BOT_USERNAME = process.env.BOT_USERNAME || '';

// Supabase configuration
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Application settings
export const REFERRAL_LINK_BASE = `https://t.me/${BOT_USERNAME}?start=`;
export const LEADERBOARD_LIMIT = 10;
export const GIVEAWAY_TARGET_REFERRALS = 10;
export const GIVEAWAY_MAX_WINNERS = 5;
export const GIVEAWAY_DURATION_DAYS = 14;

export const REQUIRED_ADMIN_RIGHTS = ['can_invite_users', 'can_pin_messages'];
export const GROUP_WELCOME_MESSAGE = true; // Set to true to welcome new members

// Check if essential environment variables are set
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not defined in .env file');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase configuration is not defined in .env file');
}
