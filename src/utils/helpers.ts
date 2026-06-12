import { REFERRAL_LINK_BASE } from '../config';

/**
 * Generate a random referral code
 */
export function generateReferralCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a referral link for a user
 */
export function generateReferralLink(referralCode: string): string {
  return `${REFERRAL_LINK_BASE}${referralCode}`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format the leaderboard message
 */
export function formatLeaderboard(entries: any[]): string {
  if (entries.length === 0) {
    return 'No users on the leaderboard yet.';
  }
  
  const leaderboardText = entries.map((entry, index) => {
    const name = entry.username || 
                 `${entry.first_name || ''} ${entry.last_name || ''}`.trim() || 
                 'Anonymous';
    
    return `${index + 1}. ${name} - ${entry.referral_count} referrals`;
  }).join('\n');
  
  return `🏆 *Referral Leaderboard* 🏆\n\n${leaderboardText}`;
}

/**
 * Format the giveaway status message
 */
export function formatGiveawayStatus(giveaway: any): string {
  const endDate = new Date(giveaway.end_date);
  const now = new Date();
  const timeLeft = endDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  
  return `
🎁 *Active Giveaway: ${giveaway.title}* 🎁

${giveaway.description || ''}

*Target:* Invite ${giveaway.target_referrals}+ people
*Prize:* $10 for the first ${giveaway.max_winners} users who reach the target
*Ends in:* ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
*End Date:* ${formatDate(endDate)}

Use /referral to get your invite link and start referring!
  `;
}