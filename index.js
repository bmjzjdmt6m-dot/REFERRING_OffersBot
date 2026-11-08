
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('BOT_TOKEN is missing');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const freeUsers = new Set();
const offers = new Map();
let nextId = 1;

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '👋 Добро пожаловать в REFERRING Offers!\n\n' +
    '🎁 NFT Offer Manager\n\n' +
    'Доступные команды:\n' +
    '/negative — бесплатный доступ\n' +
    '/q ссылка цена(stars) — тестовый оффер в Stars\n' +
    '/q ссылка цена(Gram) — тестовый оффер в Gram\n' +
    '/offers — история офферов',
    {
      reply_markup: {
        keyboard: [
          [{ text: '🎁 Мои офферы' }],
          [{ text: '➕ Создать оффер' }]
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.onText(/\/negative/, (msg) => {
  freeUsers.add(msg.from.id);
  bot.sendMessage(msg.chat.id, '✅ Бесплатный доступ активирован!');
});

bot.onText(/\/offers/, (msg) => {
  const list = [...offers.values()]
    .filter(o => o.userId === msg.from.id);

  if (!list.length) {
    return bot.sendMessage(msg.chat.id, 'У тебя пока нет офферов.');
  }

  bot.sendMessage(msg.chat.id, list.map(o =>
    `#${o.id}\n${o.url}\n${o.amount} ${o.currency}\nСтатус: ${o.status}`
  ).join('\n\n'));
});

bot.onText(/\/q\s+(\S+)\s+(\d+(?:\.\d+)?)\s*\((stars|gram)\)/i,
  (msg, match) => {
    if (!freeUsers.has(msg.from.id)) {
      return bot.sendMessage(msg.chat.id,
        '🔒 Сначала активируй доступ: /negative'
      );
    }

    const url = match[1];
    const amount = Number(match[2]);
    const currency = match[3].toLowerCase() === 'stars'
      ? 'Stars'
      : 'Gram';

    if (!/^https?:\/\/\S+$/i.test(url) || amount <= 0) {
      return bot.sendMessage(msg.chat.id, '❌ Проверь ссылку и сумму.');
    }

    const id = nextId++;

    offers.set(id, {
      id,
      userId: msg.from.id,
      url,
      amount,
      currency,
      status: 'Тестовый оффер создан'
    });

    bot.sendMessage(msg.chat.id,
      `🧪 ТЕСТОВЫЙ NFT OFFER\n\n` +
      `🎁 NFT: ${url}\n` +
      `💰 Цена: ${amount} ${currency}\n` +
      `🆔 ID: ${id}\n\n` +
      `⚠️ Демонстрационный оффер. Реальная сделка не создаётся.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Проверить тест', callback_data: `check_${id}` }],
            [{ text: '❌ Закрыть', callback_data: `close_${id}` }]
          ]
        }
      }
    );
  }
);

bot.on('message', (msg) => {
  if (msg.text === '🎁 Мои офферы') {
    bot.sendMessage(msg.chat.id, '/offers');
  }

  if (msg.text === '➕ Создать оффер') {
    bot.sendMessage(msg.chat.id,
      'Отправь команду:\n/q ссылка цена(stars)\n\n' +
      'Например:\n/q https://t.me/nft/12345 500(stars)'
    );
  }
});

bot.on('callback_query', (query) => {
  const [action, idText] = query.data.split('_');
  const offer = offers.get(Number(idText));

  if (!offer || offer.userId !== query.from.id) {
    return bot.answerCallbackQuery(query.id, {
      text: 'Оффер не найден'
    });
  }

  if (action === 'check') {
    offer.status = 'Тестовая проверка выполнена';
    bot.answerCallbackQuery(query.id, {
      text: 'Проверка выполнена!'
    });
  }

  if (action === 'close') {
    offer.status = 'Закрыт';
    bot.answerCallbackQuery(query.id, {
      text: 'Оффер закрыт'
    });
  }
});

console.log('REFERRING Offers Bot started');
