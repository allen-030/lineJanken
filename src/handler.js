import {
  addBotOpponent,
  clearGame,
  createGame,
  getGameByGroup,
  getGameById,
  playHand,
  resolveGame,
  setMaxPlayers,
} from './game.js';
import {
  chooseMessage,
  chooseProgressMessage,
  countSelectMessage,
  gifTestMessage,
  helpMessage,
  resultMessages,
  shouldTestGif,
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
 * @param {import('@line/bot-sdk').webhook.Source} source
 * @returns {string | null}
 */
function getRoomKey(source) {
  if (source.type === 'group') return source.groupId;
  if (source.type === 'room') return source.roomId;
  if (source.type === 'user' && source.userId) return `user:${source.userId}`;
  return null;
}

/**
 * pushMessage 的 to：群組／房間用原 ID，私訊去掉 user: 前綴
 * @param {string} roomKey
 */
function pushTargetFromRoomKey(roomKey) {
  return roomKey.startsWith('user:') ? roomKey.slice('user:'.length) : roomKey;
}

/**
 * @param {import('@line/bot-sdk').messagingApi.MessagingApiClient} client
 * @param {string} userId
 * @param {string} roomKey
 */
async function getDisplayName(client, userId, roomKey) {
  try {
    if (roomKey.startsWith('user:')) {
      const profile = await client.getProfile(userId);
      return profile.displayName || '玩家';
    }
    if (!roomKey.startsWith('user:')) {
      const profile = await client.getGroupMemberProfile(roomKey, userId);
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
  const roomKey = getRoomKey(event.source);

  if (isHelpCommand(text)) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [helpMessage()],
    });
  }

  if (!roomKey) {
    return null;
  }

  if (isCancelCommand(text)) {
    const existing = getGameByGroup(roomKey);
    if (!existing || existing.phase === 'done') {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '目前沒有進行中的猜拳。' }],
      });
    }
    clearGame(roomKey);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '已取消這局猜拳。' }],
    });
  }

  if (!isStartCommand(text)) {
    return null;
  }

  const existing = getGameByGroup(roomKey);
  if (existing && existing.phase !== 'done') {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: '已有一局進行中。要重開請先輸入「取消猜拳」。',
        },
      ],
    });
  }

  const game = createGame(roomKey);
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

  const roomKey = game.groupId;

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
      messages: [chooseMessage(game.id, count)],
    });
  }

  if (action === 'choose') {
    const displayName = await getDisplayName(client, userId, roomKey);
    const result = playHand(game, userId, displayName, params.hand);
    if (!result.ok) {
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: result.reason }],
      });
    }

    if (!result.allChosen) {
      const names = [...game.players.values()].map((p) => p.displayName);
      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          { type: 'text', text: '先出拳頭，剪刀、石頭' },
          chooseProgressMessage(
            result.chosenCount,
            /** @type {number} */ (game.maxPlayers),
            names,
          ),
        ],
      });
    }

    if (game.maxPlayers === 1) {
      addBotOpponent(game);
    }

    const outcome = resolveGame(game);
    const messages = resultMessages(game, outcome);
    clearGame(roomKey);

    await client.replyMessage({
      replyToken: event.replyToken,
      messages,
    });

    // GIF 測試：另用 push，失敗不影響主結果
    if (shouldTestGif(outcome)) {
      const gif = gifTestMessage(outcome);
      if (gif) {
        try {
          await client.pushMessage({
            to: pushTargetFromRoomKey(roomKey),
            messages: [
              { type: 'text', text: '【GIF 測試】若這則後面沒圖或失敗，代表 LINE 不吃 GIF。' },
              gif,
            ],
          });
        } catch (error) {
          console.error('gif test push failed', error);
          try {
            await client.pushMessage({
              to: pushTargetFromRoomKey(roomKey),
              messages: [
                {
                  type: 'text',
                  text: '【GIF 測試失敗】LINE 拒絕了 GIF 圖片訊息（多半只允許 JPEG/PNG）。',
                },
              ],
            });
          } catch (pushError) {
            console.error('gif failure notice push failed', pushError);
          }
        }
      }
    }

    return null;
  }

  return null;
}
