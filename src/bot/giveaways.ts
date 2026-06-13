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
 * Показать статус активного розыгрыша
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
 * Команда администратора для создания нового розыгрыша
 */
export async function handleCreateGiveaway(ctx: Context) {
  // Обычно здесь должна быть проверка прав администратора
  // Для простоты пропускаем эту часть
  
  const activeGiveaway = await getActiveGiveaway();
  
  if (activeGiveaway) {
    return ctx.reply(
      'Уже есть активный розыгрыш. Завершите текущий розыгрыш перед запуском нового.'
    );
  }
  
  const giveaway = await createGiveaway(
    'Розыгрыш 100000 FLOPS',
    GIVEAWAY_TARGET_REFERRALS,
    GIVEAWAY_MAX_WINNERS,
    GIVEAWAY_DURATION_DAYS,
    'Приглашайте друзей и выигрывайте 20000 FLOPS! Первые 5 пользователей, пригласившие 10+ человек, получат награду.'
  );
  
  if (!giveaway) {
    return ctx.reply('Не удалось создать розыгрыш. Пожалуйста, попробуйте снова.');
  }
  
  return ctx.reply(
    `✅ Розыгрыш успешно создан!\n\n${formatGiveawayStatus(giveaway)}`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Команда администратора для завершения розыгрыша и выбора победителей
 */
export async function handleEndGiveaway(ctx: Context) {
  // Обычно здесь должна быть проверка прав администратора
  
  const giveaway = await getActiveGiveaway();
  
  if (!giveaway) {
    return ctx.reply('Нет активного розыгрыша для завершения.');
  }
  
  const winners = await registerGiveawayWinners(giveaway.id);
  
  if (winners.length === 0) {
    return ctx.reply(
      `Розыгрыш "${giveaway.title}" завершён, но никто не прошёл квалификацию. ` +
      `Участникам нужно было пригласить минимум ${giveaway.target_referrals} человек.`
    );
  }
  
  const fullWinnerData = await getGiveawayWinners(giveaway.id);
  
  let winnerText = 'Следующие пользователи выиграли:\n\n';
  
  fullWinnerData.forEach((winner, index) => {
    const user = winner.users;
    const name = user.username || 
                 `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                 'Аноним';
    
    winnerText += `${index + 1}. ${name} - ${winner.referral_count} приглашений\n`;
  });
  
  return ctx.reply(
    `🎊 Розыгрыш "${giveaway.title}" завершён! 🎊\n\n` +
    `${winnerText}\n` +
    `Поздравляем победителей! Свяжитесь с администратором для получения приза.`
  );
}

/**
 * Функция для автоматической проверки истекших розыгрышей
 */
export async function checkExpiredGiveaways(bot: any) {
  const giveaway = await getActiveGiveaway();
  
  if (!giveaway) {
    return;
  }
  
  const now = new Date();
  const endDate = new Date(giveaway.end_date);
  
  if (now >= endDate) {
    console.log(`Розыгрыш ${giveaway.id} истёк. Обработка победителей...`);
    
    const winners = await registerGiveawayWinners(giveaway.id);
    
    // Отправка уведомления в канал или группу
    try {
      if (winners.length === 0) {
        await bot.telegram.sendMessage(
          process.env.ADMIN_CHAT_ID || process.env.GROUP_CHAT_ID,
          `Розыгрыш "${giveaway.title}" завершён, но никто не прошёл квалификацию. ` +
          `Участникам нужно было пригласить минимум ${giveaway.target_referrals} человек.`
        );
        return;
      }
      
      const fullWinnerData = await getGiveawayWinners(giveaway.id);
      
      let winnerText = 'Следующие пользователи выиграли:\n\n';
      
      fullWinnerData.forEach((winner, index) => {
        const user = winner.users;
        const name = user.username || 
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                    'Аноним';
        
        winnerText += `${index + 1}. ${name} - ${winner.referral_count} приглашений\n`;
      });
      
      await bot.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID || process.env.GROUP_CHAT_ID,
        `🎊 Розыгрыш "${giveaway.title}" завершён! 🎊\n\n` +
        `${winnerText}\n` +
        `Поздравляем победителей! Свяжитесь с администратором для получения приза.`
      );
    } catch (error) {
      console.error('Ошибка при отправке уведомления о завершении розыгрыша:', error);
    }
  }
}

/**
 * Команда администратора для просмотра деталей конкретного розыгрыша
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
        ? `Розыгрыш с ID ${giveawayId} не найден.` 
        : 'На данный момент нет активного розыгрыша.'
    );
  }
  
  // Получаем победителей, если розыгрыш завершён
  let winnerText = '';
  if (!giveaway.is_active) {
    const winners = await getGiveawayWinners(giveaway.id);
    
    if (winners.length > 0) {
      winnerText = '\n\n*Победители:*\n';
      winners.forEach((winner, index) => {
        const user = winner.users;
        const name = user.username || 
                    `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                    'Аноним';
        
        winnerText += `${index + 1}. ${name} - ${winner.referral_count} приглашений\n`;
      });
    } else {
      winnerText = '\n\n*Нет победителей в этом розыгрыше.*';
    }
  }
  
  const startDate = new Date(giveaway.start_date);
  const endDate = new Date(giveaway.end_date);
  
  return ctx.reply(
    `🎁 *Детали розыгрыша* 🎁\n\n` +
    `*Название:* ${giveaway.title}\n` +
    `*Описание:* ${giveaway.description || 'Нет описания'}\n` +
    `*Целевое количество приглашений:* ${giveaway.target_referrals}\n` +
    `*Максимум победителей:* ${giveaway.max_winners}\n` +
    `*Дата начала:* ${formatDate(startDate)}\n` +
    `*Дата окончания:* ${formatDate(endDate)}\n` +
    `*Статус:* ${giveaway.is_active ? 'Активен' : 'Завершён'}` +
    `${winnerText}`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Команда администратора для просмотра всех розыгрышей
 */
export async function handleListGiveaways(ctx: Context) {
  const { data, error } = await supabase
    .from('giveaways')
    .select('id, title, is_active, start_date, end_date')
    .order('start_date', { ascending: false });
  
  if (error) {
    console.error('Ошибка при получении розыгрышей:', error);
    return ctx.reply('Не удалось получить список розыгрышей. Попробуйте снова.');
  }
  
  if (data.length === 0) {
    return ctx.reply('Розыгрыши не найдены.');
  }
  
  let giveawayText = '*Все розыгрыши:*\n\n';
  
  data.forEach((giveaway, index) => {
    const startDate = new Date(giveaway.start_date);
    const endDate = new Date(giveaway.end_date);
    const status = giveaway.is_active ? '🟢 Активен' : '🔴 Завершён';
    
    giveawayText += `${index + 1}. *${giveaway.title}* (ID: ${giveaway.id})\n` +
                    `   ${status} | ${formatDate(startDate)} — ${formatDate(endDate)}\n\n`;
  });
  
  giveawayText += 'Используйте `/viewgiveaway <ID>` для просмотра деталей конкретного розыгрыша.';
  
  return ctx.reply(giveawayText, { parse_mode: 'Markdown' });
}
