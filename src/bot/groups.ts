import { Context } from 'telegraf';
import { 
  getUserByTelegramId, 
  createUser, 
  createGroupInvite, 
  recordGroupMembership, 
  createReferral 
} from '../database/queries';
import { REQUIRED_ADMIN_RIGHTS } from '../config';
import supabase from '../database/supabase';

/**
 * Обработчик добавления бота в группу
 */
export async function handleBotAddedToGroup(ctx: Context) {
  const chat = ctx.chat;
  if (!chat) return;

  // Проверяем, является ли чат группой, супергруппой или каналом
  if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
    console.log(`Бот добавлен в ${chat.type}: ${chat.title} (${chat.id})`);
  } else {
    console.log(`Бот добавлен в чат с ID: ${chat.id}`);
  }
  
  await ctx.reply(
    `👋 Всем привет! Я бот для рефералов и розыгрышей.\n\n` +
    `Я помогаю отслеживать рефералов и проводить розыгрыши в этой группе.\n\n` +
    `Для начала работы, пожалуйста, сделайте меня администратором с правами:\n` +
    `- Приглашать пользователей\n` +
    `- Закреплять сообщения\n\n` +
    `Используйте /help_group для просмотра доступных команд.`
  );
}

/**
 * Проверка, есть ли у бота необходимые права администратора
 */
export async function checkBotAdminRights(ctx: Context): Promise<boolean> {
  if (!ctx.chat) return false;
  
  try {
    const botMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    
    if (botMember.status !== 'administrator') {
      await ctx.reply('Для работы в группах мне нужны права администратора!');
      return false;
    }
    
    // Проверка конкретных прав
    const missingPermissions = [];
    for (const right of REQUIRED_ADMIN_RIGHTS) {
      if (!(botMember as any)[right]) {
        missingPermissions.push(right);
      }
    }
    
    if (missingPermissions.length > 0) {
      await ctx.reply(
        `У меня отсутствуют следующие права:\n` +
        `- ${missingPermissions.join('\n- ')}\n\n` +
        `Пожалуйста, обновите мои права администратора.`
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при проверке прав администратора:', error);
    return false;
  }
}

/**
 * Обработчик групповой команды помощи
 */
export async function handleGroupHelpCommand(ctx: Context) {
  return ctx.reply(
    `🤖 *Команды для группы* 🤖\n\n` +
    `• /referral - Получить вашу персональную реферальную ссылку\n` +
    `• /leaderboard - Посмотреть топ пригласивших в этой группе\n` +
    `• /giveaway - Узнать детали активного розыгрыша\n` +
    `• /help_group - Показать это сообщение\n\n` +
    `*Команды администратора:*\n` +
    `• /start_giveaway - Запустить новый розыгрыш\n` +
    `• /end_giveaway - Завершить текущий розыгрыш\n` +
    `• /config_group - Настроить параметры группы\n\n` +
    `Для правильной работы бот должен быть администратором с правами:\n` +
    `- Приглашать пользователей\n` +
    `- Закреплять сообщения`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Обработчик новых участников в группе
 */
export async function handleNewMember(ctx: Context) {
  if (!ctx.message || !('new_chat_members' in ctx.message)) return;
  
  for (const member of ctx.message.new_chat_members) {
    // Пропускаем, если новый участник — сам бот
    if (member.id === ctx.botInfo.id) continue;
    
    console.log(`Новый участник присоединился: ${member.username || member.first_name} (${member.id})`);
    
    // Проверяем, существует ли пользователь в базе данных
    let user = await getUserByTelegramId(member.id);
    
    if (!user) {
      // Создаём пользователя, если его нет
      user = await createUser(
        member.id,
        member.username,
        member.first_name,
        member.last_name
      );
    }
    
    // Здесь можно добавить приветственное сообщение или отследить пригласившего
  }
}

/**
 * Генерация и сохранение отслеживаемой ссылки-приглашения для пользователя
 */
export async function generateGroupInviteLink(ctx: Context) {
  if (!ctx.from || !ctx.chat) return ctx.reply('Что-то пошло не так. Попробуйте снова.');
  
  // Работаем только в группах
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return ctx.reply('Эта команда работает только в группах.');
  }
  
  // Проверяем, есть ли у бота необходимые права
  const hasRights = await checkBotAdminRights(ctx);
  if (!hasRights) return;
  
  const user = await getUserByTelegramId(ctx.from.id);
  
  if (!user) {
    return ctx.reply('Не удалось получить информацию о пользователе. Попробуйте снова.');
  }
  
  try {
    // Создаём уникальное имя для ссылки
    const inviteName = `ref_${user.telegram_id}_${Date.now()}`;
    
    // Создаём ссылку-приглашение
    const inviteLink = await ctx.telegram.createChatInviteLink(
      ctx.chat.id, 
      {
        name: inviteName,
        creates_join_request: true, // Требовать одобрение для отслеживания
        expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 дней
      }
    );
    
    // Сохраняем ссылку в базу данных
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await createGroupInvite(
      ctx.chat.id,
      user.telegram_id,
      inviteLink.invite_link,
      expiresAt
    );
    
    return ctx.reply(
      `✨ *Ваша ссылка для приглашения в группу* ✨\n\n${inviteLink.invite_link}\n\n` +
      `Вы пригласили *${user.referral_count}* человек.\n\n` +
      `Поделитесь этой ссылкой с друзьями. Когда они присоединятся по вашей ссылке, ` +
      `вы получите баллы за реферала!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Поделиться ссылкой', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink.invite_link)}&text=${encodeURIComponent('Присоединяйтесь к нашей Telegram-группе!')}` }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при создании ссылки-приглашения:', error);
    return ctx.reply('Не удалось создать ссылку-приглашение. Убедитесь, что у меня есть права администратора.');
  }
}

/**
 * Настройка параметров группы (для администраторов)
 */
export async function handleConfigGroup(ctx: Context) {
  // Проверяем наличие чата и отправителя
  if (!ctx.chat || !ctx.from) return ctx.reply('Ошибка: не удалось определить пользователя или чат.');
  
  try {
    const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    
    if (chatMember.status !== 'creator' && chatMember.status !== 'administrator') {
      return ctx.reply('Только администраторы группы могут использовать эту команду.');
    }
    
    // Здесь вы можете реализовать настройки конфигурации группы
    return ctx.reply(
      'Настройки группы:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Включить/Выключить приветствие', callback_data: 'config:welcome' }],
            [{ text: 'Настроить приветственные сообщения', callback_data: 'config:custom_messages' }],
            [{ text: 'Настройки таблицы лидеров', callback_data: 'config:leaderboard' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка в handleConfigGroup:', error);
    return ctx.reply('Что-то пошло не так. Попробуйте снова.');
  }
}

/**
 * Обработчик запросов на вступление для отслеживания рефералов
 */
export async function handleChatJoinRequest(ctx: Context) {
    if (!ctx.chatJoinRequest) return;
    
    const user = ctx.chatJoinRequest.from;
    const chat = ctx.chatJoinRequest.chat;
    const inviteLink = ctx.chatJoinRequest.invite_link;
    
    // Логируем запрос на вступление
    const chatTitle = 'title' in chat ? chat.title : 'неизвестный чат';
    console.log(`Запрос на вступление от ${user.username || user.first_name} (${user.id}) по ссылке: ${inviteLink?.invite_link || 'неизвестно'} для ${chatTitle}`);
    
    // Проверяем, существует ли пользователь
    let dbUser = await getUserByTelegramId(user.id);
    
    // Если нет — создаём
    if (!dbUser) {
      dbUser = await createUser(
        user.id,
        user.username,
        user.first_name,
        user.last_name
      );
      
      if (!dbUser) {
        console.error('Не удалось создать запись пользователя');
        return;
      }
    }
    
    // Пытаемся найти, кто создал эту ссылку-приглашение
    if (inviteLink && inviteLink.invite_link) {
      const { data, error } = await supabase
        .from('group_invites')
        .select('creator_id')
        .eq('invite_link', inviteLink.invite_link)
        .single();
      
      if (!error && data) {
        const inviterId = data.creator_id;
        
        // Запрещаем само-рефералы
        if (inviterId !== user.id) {
          // Записываем членство в группе с пригласившим
          await recordGroupMembership(chat.id, user.id, inviterId);
          
          // Также записываем глобального реферала
          await createReferral(inviterId, user.id);
          
          // Уведомляем пригласившего
          try {
            const chatName = 'title' in chat ? chat.title : 'чат';
            await ctx.telegram.sendMessage(
              inviterId,
              `🎉 Отличные новости! ${user.username || user.first_name} присоединился к ${chatName} по вашей ссылке-приглашению!`
            );
          } catch (err) {
            console.error('Не удалось уведомить пригласившего:', err);
          }
        }
      }
    } else {
      // Записываем членство в группе без пригласившего
      await recordGroupMembership(chat.id, user.id);
    }
    
    // Одобряем запрос на вступление
    try {
      await ctx.approveChatJoinRequest(user.id);
      console.log(`Запрос на вступление для пользователя ${user.id} одобрен`);
    } catch (error) {
      console.error('Ошибка при одобрении запроса на вступление:', error);
    }
  }