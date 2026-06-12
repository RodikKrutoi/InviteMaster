import { Context, Middleware } from 'telegraf';
import { getUserByTelegramId, createUser } from '../database/queries';

/**
 * Middleware to ensure user is registered in the database
 */
export const ensureUserRegistered: Middleware<Context> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }
  
  const telegramId = ctx.from.id;
  const user = await getUserByTelegramId(telegramId);
  
  if (!user) {
    await createUser(
      telegramId,
      ctx.from.username,
      ctx.from.first_name,
      ctx.from.last_name
    );
  }
  
  return next();
};

/**
 * Middleware to log bot interactions
 */
export const logActivity: Middleware<Context> = async (ctx, next) => {
  const startTime = new Date();
  const username = ctx.from?.username || 'Unknown';
  const chatType = ctx.chat?.type || 'Unknown';
  const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : 'No text';
  
  console.log(`[${startTime.toISOString()}] User: @${username}, Chat: ${chatType}, Message: ${messageText}`);
  
  await next();
  
  const responseTime = new Date().getTime() - startTime.getTime();
  console.log(`Response time: ${responseTime}ms`);
};