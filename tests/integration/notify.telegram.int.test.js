import { jest } from '@jest/globals';

process.env.TELEGRAM_BOT_TOKEN = 'token';
process.env.TELEGRAM_CHAT_ID = '123';

const sendMessage = jest.fn().mockResolvedValue({});

class MockBot {
  constructor() {}
  sendMessage = sendMessage;
  createChatInviteLink = jest.fn().mockResolvedValue({ invite_link: 'link' });
}

await jest.unstable_mockModule('node-telegram-bot-api', () => ({
  default: MockBot
}));

const { sendTradeAlert } = await import('../../src/notify/telegram.js');

describe('Telegram notifications', () => {
  beforeEach(() => {
    sendMessage.mockClear();
  });

  test('sendTradeAlert formats and sends message', async () => {
    await sendTradeAlert('OPEN', { symbol: 'BTCUSDT', size: 1, entryPrice: 10000, ts: 0 });
    expect(sendMessage).toHaveBeenCalled();
    const [chatId, text] = sendMessage.mock.calls[0];
    expect(chatId).toBe('123');
    expect(text).toContain('OPEN');
    expect(text).toContain('BTCUSDT');
  });
});
