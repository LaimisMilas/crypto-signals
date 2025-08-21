import TelegramBot from 'node-telegram-bot-api';

let bot = null;

function getBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[TG] Missing TELEGRAM_BOT_TOKEN – alerts disabled');
    return null;
  }
  if (!bot) {
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
}

/**
 * sendMessage(text, opts)
 * opts: { parse_mode?: 'HTML'|'MarkdownV2', disable_web_page_preview?: boolean }
 */
export async function sendMessage(chatId, text, opts = {}) {
  const b = getBot();
  if (!b) return { ok: false, error: 'no-bot' };
  try {
    const res = await b.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...opts,
    });
    return { ok: true, res };
  } catch (e) {
    console.error('[TG] sendMessage error:', e?.response?.body || e);
    return { ok: false, error: String(e?.response?.body?.description || e) };
  }
}

/**
 * sendTradeAlert(type, payload)
 * type: 'OPEN' | 'CLOSE'
 * payload:
 *  - symbol, side ('LONG' only, jei taip darote), entryPrice, exitPrice?, size
 *  - reason?: 'TP'|'SL'|'TRAIL'|'SIGNAL' etc.
 *  - pnl?: number
 *  - ts: number (ms)
 */
export async function sendTradeAlert(type, payload = {}) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn('[TG] Missing TELEGRAM_CHAT_ID – alerts disabled');
    return { ok: false, error: 'no-chat' };
  }

  const {
    symbol = 'BTCUSDT',
    side = 'LONG',
    entryPrice,
    exitPrice,
    size,
    pnl,
    reason,
    ts = Date.now(),
  } = payload;

  const when = new Date(ts).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  const fmt = (n) => (n == null ? '-' : Number(n).toFixed(2));

  let title = '';
  let body = '';
  if (type === 'OPEN') {
    title = '🟢 <b>OPEN</b>';
    body =
`• <b>${symbol}</b> ${side}
• Size: <b>${fmt(size)}</b>
• Entry: <b>${fmt(entryPrice)}</b>
• Time: ${when}`;
  } else {
    title = '🔴 <b>CLOSE</b>';
    const rr = reason ? ` (${reason})` : '';
    body =
`• <b>${symbol}</b> ${side}${rr}
• Exit: <b>${fmt(exitPrice)}</b>
• PnL: <b>${fmt(pnl)}</b>
• Time: ${when}`;
  }

  const text = `${title}\n${body}`;
  return sendMessage(chatId, text);
}

// --- Legacy helpers -------------------------------------------------------
export async function notifyPublic(text) {
  const chatId = process.env.TELEGRAM_PUBLIC_CHAT_ID;
  if (!chatId) return;
  await sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

export async function notifyPrivate(text) {
  const chatId = process.env.TELEGRAM_PRIVATE_CHAT_ID;
  if (!chatId) return;
  await sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

export async function createSingleUseInviteLink() {
  const chatId = process.env.TELEGRAM_PRIVATE_CHAT_ID;
  const b = getBot();
  if (!b || !chatId) throw new Error('Missing TELEGRAM_PRIVATE_CHAT_ID');
  const link = await b.createChatInviteLink(chatId, {
    member_limit: 1,
  });
  return link.invite_link;
}

