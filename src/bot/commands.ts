import { Context } from 'telegraf';
import { getLeaderboard } from '../database/queries';
import { formatLeaderboard } from '../utils/helpers';
import { LEADERBOARD_LIMIT } from '../config';

export async function handleStartCommand(ctx: Context) {
  return ctx.reply(
    `👋 Добро пожаловать в Реферального бота с розыгрышами!\n\n` +
    `Этот бот помогает отслеживать рефералов и участвовать в розыгрышах.\n\n` +
    `🔹 Используйте /referral, чтобы получить свою пригласительную ссылку\n` +
    `🔹 Используйте /leaderboard, чтобы увидеть топ пригласивших\n` +
    `🔹 Используйте /giveaway, чтобы узнать об активных розыгрышах\n` +
    `🔹 Используйте /help для получения помощи\n\n` +
    `Делитесь своей реферальной ссылкой с друзьями и получайте награды!`
  );
}

export async function handleHelpCommand(ctx: Context) {
  return ctx.reply(
    `🤖 *Команды бота* 🤖\n\n` +
    `• /start - Запустить бота\n` +
    `• /referral - Получить вашу реферальную ссылку\n` +
    `• /leaderboard - Посмотреть топ пригласивших\n` +
    `• /giveaway - Узнать детали активного розыгрыша\n` +
    `• /help - Показать это сообщение\n\n` +
    `*Как это работает:*\n` +
    `1. Получите вашу реферальную ссылку через /referral\n` +
    `2. Поделитесь ей с друзьями\n` +
    `3. Когда они присоединятся по вашей ссылке, вы получите баллы\n` +
    `4. Лучшие пригласившие выигрывают призы в розыгрышах!\n\n` +
    `*Текущий розыгрыш:*\n` +
    `Первые 5 пользователей, которые пригласят ${LEADERBOARD_LIMIT}+ человек, выигрывают 100000 FLOPS!\n\n` +
    `Используйте /giveaway для получения более подробной информации.`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleLeaderboardCommand(ctx: Context) {
  const leaderboardEntries = await getLeaderboard();
  const formattedLeaderboard = formatLeaderboard(leaderboardEntries);
  return ctx.reply(formattedLeaderboard, { parse_mode: 'Markdown' });
}