import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

bot.createChatInviteLink(process.env.TELEGRAM_PRIVATE_CHAT_ID, { member_limit: 1 })
    .then(link => console.log('Invite link:', link.invite_link))
    .catch(err => console.error('createChatInviteLink error:', err.message));