import TelegramBot from 'node-telegram-bot-api';
import { cfg } from '../config.js';

if (!cfg.tgToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');
export const bot = new TelegramBot(cfg.tgToken, { polling: false });

export async function notifyPublic(text) {
  if (!cfg.tgPublic) return;
  await bot.sendMessage(cfg.tgPublic, text, { parse_mode: 'Markdown' });
}
export async function notifyPrivate(text) {
  if (!cfg.tgPrivate) return;
  await bot.sendMessage(cfg.tgPrivate, text, { parse_mode: 'Markdown' });
}
export async function createSingleUseInviteLink() {
  if (!cfg.tgPrivate) throw new Error('Missing TELEGRAM_PRIVATE_CHAT_ID');
  // Botas PRIVALO būti to kanalo adminu su „Add Users / Invite via Link“ teisėmis
  const link = await bot.createChatInviteLink(cfg.tgPrivate, {
    member_limit: 1, // vienkartinė
    // (nebūtina) expire_date: Math.floor(Date.now()/1000) + 3600
  });
  return link.invite_link;
}
