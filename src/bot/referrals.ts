import { Context, Markup } from 'telegraf';
import { 
  getUserByTelegramId, 
  getUserByReferralCode, 
  createUser, 
  createReferral 
} from '../database/queries';
import { generateReferralLink } from '../utils/helpers';
import supabase from '../database/supabase';

export async function handleReferralCommand(ctx: Context) {
  if (!ctx.from) {
    return ctx.reply('Что-то пошло не так. Пожалуйста, попробуйте снова.');
  }
  
  const user = await getUserByTelegramId(ctx.from.id);
  
  if (!user) {
    return ctx.reply('Не удалось получить информацию о пользователе. Пожалуйста, попробуйте снова.');
  }
  
  const referralLink = generateReferralLink(user.referral_code);
  
  return ctx.reply(
    `✨ *Ваша реферальная ссылка* ✨\n\n${referralLink}\n\n` +
    `Вы пригласили *${user.referral_count}* человек.\n\n` +
    `Поделитесь этой ссылкой с друзьями. Когда они присоединятся по вашей ссылке, ` +
    `вы получите баллы за реферала!`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.url('Поделиться ссылкой', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Зайдите в бота, присоединитесь к нашей группе и получайте награды!')}`)
      ])
    }
  );
}

export async function handleStartWithReferral(ctx: Context, referralCode: string) {
  if (!ctx.from) {
    return ctx.reply('Что-то пошло не так. Пожалуйста, попробуйте снова.');
  }
  
  const telegramId = ctx.from.id;
  let user = await getUserByTelegramId(telegramId);
  
  if (user && user.referred_by) {
    return ctx.reply(
      'С возвращением! Вы уже присоединились по реферальной ссылке. ' +
      'Используйте /referral, чтобы получить свою ссылку.'
    );
  }
  
  const referrer = await getUserByReferralCode(referralCode);
  
  if (!referrer) {
    if (!user) {
      await createUser(telegramId, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
    }
    return ctx.reply(
      'Добро пожаловать! Использованная вами реферальная ссылка недействительна. ' +
      'Используйте /referral, чтобы получить свою собственную реферальную ссылку.'
    );
  }
  
  if (referrer.telegram_id === telegramId) {
    return ctx.reply(
      'Хорошая попытка! Вы не можете пригласить сами себя. ' +
      'Поделитесь своей реферальной ссылкой с другими с помощью /referral.'
    );
  }
  
  if (!user) {
    user = await createUser(telegramId, ctx.from.username, ctx.from.first_name, ctx.from.last_name, referrer.telegram_id);
    if (!user) return ctx.reply('Не удалось создать ваш профиль. Пожалуйста, попробуйте снова.');
    await createReferral(referrer.telegram_id, telegramId);
    
    await ctx.reply(
      `Добро пожаловать! Вы присоединились по реферальной ссылке ${referrer.username || 'пользователя'}. ` +
      'Используйте /referral, чтобы получить свою ссылку и приглашать других!'
    );
    
    try {
      const updatedReferrer = await getUserByTelegramId(referrer.telegram_id);
      const newCount = updatedReferrer?.referral_count || referrer.referral_count + 1;
      await ctx.telegram.sendMessage(
        referrer.telegram_id,
        `🎉 Отличные новости! ${ctx.from.username || 'Кто-то'} только что присоединился по вашей реферальной ссылке! ` +
        `Теперь у вас ${newCount} приглашённых.`
      );
    } catch (error) {
      console.error('Не удалось уведомить пригласившего:', error);
    }
    return;
  }
  
  try {
    await supabase.from('users').update({ referred_by: referrer.telegram_id }).eq('telegram_id', telegramId);
    await createReferral(referrer.telegram_id, telegramId);
    await ctx.reply(
      `С возвращением! Вы были успешно приглашены ${referrer.username || 'пользователем'}. ` +
      'Используйте /referral, чтобы получить свою ссылку и приглашать других!'
    );
    try {
      const updatedReferrer = await getUserByTelegramId(referrer.telegram_id);
      const newCount = updatedReferrer?.referral_count || referrer.referral_count + 1;
      await ctx.telegram.sendMessage(
        referrer.telegram_id,
        `🎉 Отличные новости! ${ctx.from.username || 'Кто-то'} только что присоединился по вашей реферальной ссылке! ` +
        `Теперь у вас ${newCount} приглашённых.`
      );
    } catch (error) {
      console.error('Не удалось уведомить пригласившего:', error);
    }
  } catch (error) {
    console.error('Ошибка при обновлении пользователя с рефералом:', error);
    await ctx.reply('Что-то пошло не так при обработке вашего реферала. Пожалуйста, попробуйте позже.');
  }
}
