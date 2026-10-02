import {
  chooseHand,
  clearGame,
  createGame,
  getGameByGroup,
  getGameById,
  joinGame,
  resolveGame,
  setMaxPlayers,
} from './game.js';
import {
  chooseMessage,
  chooseProgressMessage,
  countSelectMessage,
  helpMessage,
  joinMessage,
  resultMessages,
} from './messages.js';

/**
 * @param {string} data
 * @returns {Record<string, string>}
 */
function parsePostback(data) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of data.split('&')) {
    const [k, v] = part.split('=');
    if (k) out[k] = decodeURIComponent(v ?? '');
  }
  return out;
}

/**
 * @param {import('@line/bot-sdk').messagingApi.MessagingApiClient} client
 * @param {string} userId
 */
async function getDisplayName(client, userId, groupId) {
  try {
    if (groupId) {
      const profile = await client.getGroupMemberProfile(groupId, userId);
      return profile.displayName || '玩家';
    }
  } catch {
    // fall through
  }
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName || '玩家';
  } catch {
    return '玩家';
  }
}

/**
 * @param {string} text
 */
function isStartCommand(text) {
  const t = text.trim().toLowerCase();
  return t === '猜拳' || t === 'janken' || t === '/janken' || t === '/猜拳';
}

/**
 * @param {string} text
 */
function isCancelCommand(text) {
  const t = text.trim();
  return t === '結束猜拳' || t === '取消猜拳' || t === '取消';
}

/**
 * @param {string} text
 */
function isHelpCommand(text) {
  const t = text.trim();
  return t === '說明' || t === 'help' || t === '幫助';
}

/**
 * @param {import('@line/bot-sdk').messagingApi.MessagingApiClient} client
 * @param {import('@line/bot-sdk').WebhookEvent} event
 */
export async function handleEvent(client, event) {
  if (event.type === 'message' && event.message.type === 'text') {
    return handleText(client, event);
  }
  if (event.type === 'postback') {
    return handlePostback(client, event);
  }
  return null;
}

/**
 * @param {import('@line/bot-sdk').messagingApi.MessagingApiClient} client
 * @param {import('@line/bot-sdk').MessageEvent} event
 */
async function handleText(client, event) {
  const text = event.message.text;
  const source = event.source;
  const groupId =
    source.type === 'group'
      ? source.groupId
      : source.type === 'room'
        ? source.roomId
        : null;

  if (isHelpCommand(text)) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [helpMessage()],
    });
  }

  if (!groupId) {
    if (isStartCommand(text)) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: '請把我加進 LINE 群組後，在群裡輸入「猜拳」。',
          },
        ],
      });
    }
    return null;
  }

  if (isCancelCommand(text)) {
    const existing = getGameByGroup(groupId);
    if (!existing || existing.phase === 'done') {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '目前沒有進行中的猜拳。' }],
      });
    }
    clearGame(groupId);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '已取消這局猜拳。' }],
    });
  }

  if (!isStartCommand(text)) {
    return null;
  }

  const existing = getGameByGroup(groupId);
  if (existing && existing.phase !== 'done') {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: '這個群已有一局進行中。要重開請先輸入「取消猜拳」。',
        },
      ],
    });
  }

  const game = createGame(groupId);
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [countSelectMessage(game.id)],
  });
}

/**
 * @param {import('@line/bot-sdk').messagingApi.MessagingApiClient} client
 * @param {import('@line/bot-sdk').PostbackEvent} event
 */
async function handlePostback(client, event) {
  const params = parsePostback(event.postback.data);
  const action = params.action;
  const gameId = params.gameId;
  const userId = event.source.userId;

  if (!userId || !gameId || !action) {
    return null;
  }

  const game = getGameById(gameId);
  if (!game) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '這局已結束或不存在，請重新輸入「猜拳」。' }],
    });
  }

  const groupId = game.groupId;

  if (action === 'set_count') {
    const count = Number(params.count);
    const result = setMaxPlayers(game, count);
    if (!result.ok) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: result.reason }],
      });
    }
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [joinMessage(game.id, count, [])],
    });
  }

  if (action === 'join') {
    const displayName = await getDisplayName(client, userId, groupId);
    const result = joinGame(game, userId, displayName);
    if (!result.ok) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: result.reason }],
      });
    }

    const names = [...game.players.values()].map((p) => p.displayName);

    if (!result.ready) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          joinMessage(game.id, /** @type {number} */ (game.maxPlayers), names),
        ],
      });
    }

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [chooseMessage(game.id, names)],
    });
  }

  if (action === 'choose') {
    const result = chooseHand(game, userId, params.hand);
    if (!result.ok) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: result.reason }],
      });
    }

    if (!result.allChosen) {
      const chosen = [...game.players.values()].filter((p) => p.hand != null).length;
      const total = game.players.size;
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [chooseProgressMessage(chosen, total)],
      });
    }

    const outcome = resolveGame(game);
    const messages = resultMessages(game, outcome);
    clearGame(groupId);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages,
    });
  }

  return null;
}
