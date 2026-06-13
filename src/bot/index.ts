import { Telegraf, Composer } from 'telegraf';
import { message } from 'telegraf/filters';
import * as cron from 'node-cron';
import { BOT_TOKEN } from '../config';
import { ensureUserRegistered, logActivity } from './middleware';
import { 
  handleStartCommand, 
  handleHelpCommand, 
  handleLeaderboardCommand 
} from './commands';
import { 
  handleReferralCommand, 
  handleStartWithReferral 
} from './referrals';
import { 
  handleGiveawayCommand, 
  handleCreateGiveaway, 
  handleEndGiveaway,
  handleViewGiveaway,
  handleListGiveaways,
  checkExpiredGiveaways
} from './giveaways';
import {
  handleBotAddedToGroup,
  handleNewMember,
  handleGroupHelpCommand,
  generateGroupInviteLink,
  handleConfigGroup
} from './groups';
import { getGroupLeaderboard, getLeaderboard } from '../database/queries';
import { formatLeaderboard } from '../utils/helpers';

// Create bot instance
const bot = new Telegraf(BOT_TOKEN);

// Apply global middleware
bot.use(logActivity);
bot.use(ensureUserRegistered);

// Basic commands
bot.command('help', handleHelpCommand);
bot.command('help_group', handleGroupHelpCommand);
bot.command('referral', handleReferralCommand);
bot.command('group_referral', generateGroupInviteLink);
bot.command('giveaway', handleGiveawayCommand);
bot.command('config_group', handleConfigGroup);

// Admin commands
const adminCommands = new Composer();
adminCommands.command('creategiveaway', handleCreateGiveaway);
adminCommands.command('endgiveaway', handleEndGiveaway);
adminCommands.command('startgiveaway', handleCreateGiveaway);
adminCommands.command('listgiveaways', handleListGiveaways);
adminCommands.command('viewgiveaway', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const giveawayId = parts[1] ? parseInt(parts[1]) : undefined;
  await handleViewGiveaway(ctx, giveawayId);
});
bot.use(adminCommands);

// Handle leaderboard command (supports both private and group chats)
bot.command('leaderboard', async (ctx) => {
  if (!ctx.chat) return;
  
  let leaderboardEntries;
  
  // Different handling for groups vs direct messages
  if (ctx.chat.type === 'private') {
    leaderboardEntries = await getLeaderboard();
  } else {
    // Get group-specific leaderboard
    leaderboardEntries = await getGroupLeaderboard(ctx.chat.id);
  }
  
  const formattedLeaderboard = formatLeaderboard(leaderboardEntries);
  
  return ctx.reply(formattedLeaderboard, { parse_mode: 'Markdown' });
});

// Handle /start command with or without referral code
bot.command('start', (ctx) => {
  if (!ctx.message || !('text' in ctx.message)) return;
  
  const message = ctx.message.text;
  const parts = message.split(' ');
  
  if (parts.length > 1) {
    // If there's a parameter after /start, treat it as a referral code
    const referralCode = parts[1];
    return handleStartWithReferral(ctx, referralCode);
  }
  
  // Regular start without referral
  return handleStartCommand(ctx);
});

// Handle when bot is added to group or new members join
bot.on(message('new_chat_members'), (ctx) => {
  const newMembers = ctx.message.new_chat_members;
  const isBotAdded = newMembers.some(member => member.id === ctx.botInfo.id);
  
  if (isBotAdded) {
    return handleBotAddedToGroup(ctx);
  } else {
    return handleNewMember(ctx);
  }
});

// Handle join requests if your bot uses them
bot.on('chat_join_request', async (ctx) => {
  if (!ctx.chatJoinRequest?.from) return;
  
  const user = ctx.chatJoinRequest.from;
  const chat = ctx.chatJoinRequest.chat;
  
  // Log the join request
  if (chat.type === 'group' as 'group' | 'supergroup' | 'channel' || chat.type === 'supergroup' || chat.type === 'channel') {
    console.log(`Join request from ${user.username || user.first_name} (${user.id}) for ${chat.title}`);
  } else {
    console.log(`Join request from ${user.username || user.first_name} (${user.id})`);
  }
  
  // You can auto-approve requests
  try {
    await ctx.approveChatJoinRequest(user.id);
    console.log(`Approved join request for user ${user.id}`);
  } catch (error) {
    console.error('Error approving join request:', error);
  }
});

// Schedule checking for expired giveaways (every hour)
cron.schedule('0 * * * *', () => {
  checkExpiredGiveaways(bot);
});

export default bot;
