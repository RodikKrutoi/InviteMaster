import { Context } from 'telegraf';
import { 
  getActiveGiveaway, 
  createGiveaway, 
  registerGiveawayWinners,
  getGiveawayWinners,
  getGiveawayById
} from '../database/queries';
import { 
  formatGiveawayStatus, 
  formatDate 
} from '../utils/helpers';
import { 
  GIVEAWAY_TARGET_REFERRALS, 
  GIVEAWAY_MAX_WINNERS, 
  GIVEAWAY_DURATION_DAYS 
} from '../config';
import supabase from '../database/supabase';

/**
 * Show the active giveaway status
 */
export async function handleGiveawayCommand(ctx: Context) {
  const giveaway = await getActiveGiveaway();
  
  if (!giveaway) {
    return ctx.reply(
      'На данный момент нет активного розыгрыша. Загляните позже или свяжитесь с администратором.'
    );
  }
  
  return ctx.reply(formatGiveawayStatus(giveaway), { parse_mode: 'Markdown' });
}

/**
 * Admin command to create a new giveaway
 */
export async function handleCreateGiveaway(ctx: Context) {
  // This would typically include admin verification
  // For simplicity, we're skipping that part
  
  const activeGiveaway = await getActiveGiveaway();
  
  if (activeGiveaway) {
    return ctx.reply(
      'There is already an active giveaway. ' +
      'End the current giveaway before starting a new one.'
    );
  }
  
  const giveaway = await createGiveaway(
    '$10 Giveaway',
    GIVEAWAY_TARGET_REFERRALS,
    GIVEAWAY_MAX_WINNERS,
    GIVEAWAY_DURATION_DAYS,
    'Refer friends and win $10! The first 10 users to invite 20+ people will win.'
  );
  
  if (!giveaway) {
    return ctx.reply('Failed to create giveaway. Please try again.');
  }
  
  return ctx.reply(
    `✅ Giveaway created successfully!\n\n${formatGiveawayStatus(giveaway)}`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Admin command to end the current giveaway and pick winners
 */
export async function handleEndGiveaway(ctx: Context) {
  // This would typically include admin verification
  
  const giveaway = await getActiveGiveaway();
  
  if (!giveaway) {
    return ctx.reply('There is no active giveaway to end.');
  }
  
  const winners = await registerGiveawayWinners(giveaway.id);
  
  if (winners.length === 0) {
    return ctx.reply(
      `The giveaway "${giveaway.title}" has ended, but no users qualified for prizes. ` +
      `Users needed at least ${giveaway.target_referrals} referrals to qualify.`
    );
  }
  
  const fullWinnerData = await getGiveawayWinners(giveaway.id);
  
  let winnerText = 'The following users have won:\n\n';
  
  fullWinnerData.forEach((winner, index) => {
    const user = winner.users;
    const name = user.username || 
                 `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                 'Anonymous';
    
    winnerText += `${index + 1}. ${name} - ${winner.referral_count} referrals\n`;
  });
  
  return ctx.reply(
    `🎊 The giveaway "${giveaway.title}" has ended! 🎊\n\n` +
    `${winnerText}\n` +
    `Congratulations to all winners! Please contact the admin to claim your prize.`
  );
}

/**
 * Schedule function to check for expired giveaways
 */
export async function checkExpiredGiveaways(bot: any) {
  const giveaway = await getActiveGiveaway();
  
  if (!giveaway) {
    return;
  }
  
  const now = new Date();
  const endDate = new Date(giveaway.end_date);
  
  if (now >= endDate) {
    console.log(`Giveaway ${giveaway.id} has expired. Processing winners...`);
    
    const winners = await registerGiveawayWinners(giveaway.id);
    
    // Notify a channel or group about the giveaway ending
    // This would typically go to an admin channel or the main group
    try {
      if (winners.length === 0) {
        await bot.telegram.sendMessage(
          process.env.ADMIN_CHAT_ID || process.env.GROUP_CHAT_ID,
          `The giveaway "${giveaway.title}" has ended, but no users qualified for prizes. ` +
          `Users needed at least ${giveaway.target_referrals} referrals to qualify.`
        );
        return;
      }
      
      const fullWinnerData = await getGiveawayWinners(giveaway.id);
      
      let winnerText = 'The following users have won:\n\n';
      
      fullWinnerData.forEach((winner, index) => {
        const user = winner.users;
        const name = user.username || 
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                    'Anonymous';
        
        winnerText += `${index + 1}. ${name} - ${winner.referral_count} referrals\n`;
      });
      
      await bot.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID || process.env.GROUP_CHAT_ID,
        `🎊 The giveaway "${giveaway.title}" has ended! 🎊\n\n` +
        `${winnerText}\n` +
        `Congratulations to all winners! Please contact the admin to claim your prize.`
      );
    } catch (error) {
      console.error('Error sending giveaway end notification:', error);
    }
  }
}

/**
 * Admin command to view details of a specific giveaway
 */
export async function handleViewGiveaway(ctx: Context, giveawayId?: number) {
  let giveaway;
  
  if (giveawayId) {
    giveaway = await getGiveawayById(giveawayId);
  } else {
    giveaway = await getActiveGiveaway();
  }
  
  if (!giveaway) {
    return ctx.reply(
      giveawayId 
        ? `No giveaway found with ID ${giveawayId}.` 
        : 'There is no active giveaway at the moment.'
    );
  }
  
  // Get winners if giveaway has ended
  let winnerText = '';
  if (!giveaway.is_active) {
    const winners = await getGiveawayWinners(giveaway.id);
    
    if (winners.length > 0) {
      winnerText = '\n\n*Winners:*\n';
      winners.forEach((winner, index) => {
        const user = winner.users;
        const name = user.username || 
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                    'Anonymous';
        
        winnerText += `${index + 1}. ${name} - ${winner.referral_count} referrals\n`;
      });
    } else {
      winnerText = '\n\n*No winners for this giveaway.*';
    }
  }
  
  const startDate = new Date(giveaway.start_date);
  const endDate = new Date(giveaway.end_date);
  
  return ctx.reply(
    `🎁 *Giveaway Details* 🎁\n\n` +
    `*Title:* ${giveaway.title}\n` +
    `*Description:* ${giveaway.description || 'No description'}\n` +
    `*Target Referrals:* ${giveaway.target_referrals}\n` +
    `*Max Winners:* ${giveaway.max_winners}\n` +
    `*Start Date:* ${formatDate(startDate)}\n` +
    `*End Date:* ${formatDate(endDate)}\n` +
    `*Status:* ${giveaway.is_active ? 'Active' : 'Ended'}` +
    `${winnerText}`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Admin command to list all giveaways
 */
export async function handleListGiveaways(ctx: Context) {
  const { data, error } = await supabase
    .from('giveaways')
    .select('id, title, is_active, start_date, end_date')
    .order('start_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching giveaways:', error);
    return ctx.reply('Failed to fetch giveaways. Please try again.');
  }
  
  if (data.length === 0) {
    return ctx.reply('No giveaways found.');
  }
  
  let giveawayText = '*All Giveaways:*\n\n';
  
  data.forEach((giveaway, index) => {
    const startDate = new Date(giveaway.start_date);
    const endDate = new Date(giveaway.end_date);
    const status = giveaway.is_active ? '🟢 Active' : '🔴 Ended';
    
    giveawayText += `${index + 1}. *${giveaway.title}* (ID: ${giveaway.id})\n` +
                    `   ${status} | ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
  });
  
  giveawayText += 'Use `/viewgiveaway <ID>` to see details of a specific giveaway.';
  
  return ctx.reply(giveawayText, { parse_mode: 'Markdown' });
}