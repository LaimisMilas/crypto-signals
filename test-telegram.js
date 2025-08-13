import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_PRIVATE_CHAT_ID;

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!chatId) {
  console.error('Missing TELEGRAM_PRIVATE_CHAT_ID');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

bot
  .createChatInviteLink(chatId, { member_limit: 1 })
  .then((link) => console.log('Invite link:', link.invite_link))
  .catch((err) => console.error('createChatInviteLink error:', err.message));
