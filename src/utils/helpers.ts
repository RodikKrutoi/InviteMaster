import { REFERRAL_LINK_BASE } from '../config';
import { Telegraf } from 'telegraf';

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
    return 'На данный момент в таблице лидеров никого нет.';
  }
  
  const leaderboardText = entries.map((entry, index) => {
    const name = entry.username || 
                 `${entry.first_name || ''} ${entry.last_name || ''}`.trim() || 
                 'Аноним';
    
    return `${index + 1}. ${name} - ${entry.referral_count} приглашений`;
  }).join('\n');
  
  return `🏆 *Таблица лидеров* 🏆\n\n${leaderboardText}`;
}

/**
 * Format the giveaway status message
 */
export function formatGiveawayStatus(giveaway: any): string {
  const endDate = new Date(giveaway.end_date);
  const now = new Date();
  const timeLeft = endDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

   // Склонение слова "день"
  const dayWord = (daysLeft: number): string => {
    if (daysLeft % 10 === 1 && daysLeft % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(daysLeft % 10) && ![12, 13, 14].includes(daysLeft % 100)) return 'дня';
    return 'дней';
  };
  
  return `
🎁 *Активный розыгрыш: ${giveaway.title}* 🎁

${giveaway.description || ''}

*Цель:* Пригласить ${giveaway.target_referrals}+ человек
*Приз:* 20000 FLOPS для первых ${giveaway.max_winners} пользователей, достигших цели
*Осталось:* ${daysLeft} ${dayWord(daysLeft)}
*Дата окончания:* ${formatDate(endDate)}

Используйте /referral, чтобы получить свою реферальную ссылку и начать приглашать!
  `;
}

/**
 * Проверяет, подписан ли пользователь на канал
 * @param bot - экземпляр бота
 * @param userId - Telegram ID пользователя
 * @param channelUsername - username канала (без @)
 * @returns true если подписан, false если нет
 */
export async function isUserSubscribed(
  bot: Telegraf, 
  userId: number, 
  channelUsername: string
): Promise<boolean> {
  try {
    const chatMember = await bot.telegram.getChatMember(
      `@${channelUsername}`, 
      userId
    );
    return ['member', 'creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    console.error('Ошибка проверки подписки:', error);
    return false;
  }
}
