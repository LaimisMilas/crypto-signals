import TelegramBot from 'node-telegram-bot-api';
import { cfg } from '../config.js';

export const bot = new TelegramBot(cfg.tgToken, { polling: false });

export async function notifyPublic(text) {
  if (!cfg.tgPublic) return;
  await bot.sendMessage(cfg.tgPublic, text, { parse_mode: 'Markdown' });
}
export async function notifyPrivate(text) {
  if (!cfg.tgPrivate) return;
  await bot.sendMessage(cfg.tgPrivate, text, { parse_mode: 'Markdown' });
}
