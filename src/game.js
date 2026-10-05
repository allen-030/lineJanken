/** @typedef {'rock' | 'paper' | 'scissors'} Hand */

/** @typedef {'waiting_count' | 'choosing' | 'done'} GamePhase */

/**
 * @typedef {object} Player
 * @property {string} userId
 * @property {string} displayName
 * @property {Hand} hand
 */

/**
 * @typedef {object} Game
 * @property {string} id
 * @property {string} groupId
 * @property {GamePhase} phase
 * @property {number | null} maxPlayers
 * @property {Map<string, Player>} players
 * @property {number} createdAt
 */

const HANDS = /** @type {const} */ (['rock', 'paper', 'scissors']);

/** @type {Record<Hand, string>} */
const HAND_LABEL = {
  rock: '石頭 ✊',
  paper: '布 ✋',
  scissors: '剪刀 ✌️',
};

/** @type {Record<Hand, Hand>} */
const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

/** @type {Map<string, Game>} */
const gamesByGroup = new Map();

/** @type {Map<string, string>} */
const gameIdToGroup = new Map();

function createGameId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {string} groupId
 * @returns {Game}
 */
export function createGame(groupId) {
  const existing = gamesByGroup.get(groupId);
  if (existing && existing.phase !== 'done') {
    return existing;
  }

  const game = {
    id: createGameId(),
    groupId,
    phase: /** @type {GamePhase} */ ('waiting_count'),
    maxPlayers: null,
    players: new Map(),
    createdAt: Date.now(),
  };

  gamesByGroup.set(groupId, game);
  gameIdToGroup.set(game.id, groupId);
  return game;
}

/**
 * @param {string} groupId
 * @returns {Game | undefined}
 */
export function getGameByGroup(groupId) {
  return gamesByGroup.get(groupId);
}

/**
 * @param {string} gameId
 * @returns {Game | undefined}
 */
export function getGameById(gameId) {
  const groupId = gameIdToGroup.get(gameId);
  if (!groupId) return undefined;
  return gamesByGroup.get(groupId);
}

/**
 * @param {string} groupId
 */
export function clearGame(groupId) {
  const game = gamesByGroup.get(groupId);
  if (game) {
    gameIdToGroup.delete(game.id);
    gamesByGroup.delete(groupId);
  }
}

/**
 * @param {Game} game
 * @param {number} count
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function setMaxPlayers(game, count) {
  if (game.phase !== 'waiting_count') {
    return { ok: false, reason: '這局已經開始了，請先結束或重開。' };
  }
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return { ok: false, reason: '人數需為 1～10（1 人＝對戰 Bot）。' };
  }
  game.maxPlayers = count;
  game.phase = 'choosing';
  return { ok: true };
}

/**
 * 出拳＝入場：點石頭／布／剪刀時加入並鎖定出拳，不先公布拳種。
 * @param {Game} game
 * @param {string} userId
 * @param {string} displayName
 * @param {string} handRaw
 * @returns {{ ok: true, allChosen: boolean, chosenCount: number } | { ok: false, reason: string }}
 */
export function playHand(game, userId, displayName, handRaw) {
  if (game.phase !== 'choosing' || game.maxPlayers == null) {
    return { ok: false, reason: '目前不是出拳階段。' };
  }

  if (!HANDS.includes(/** @type {Hand} */ (handRaw))) {
    return { ok: false, reason: '無效的出拳。' };
  }

  const hand = /** @type {Hand} */ (handRaw);

  if (game.players.has(userId)) {
    return { ok: false, reason: '你已經出過拳了。' };
  }
  if (game.players.size >= game.maxPlayers) {
    return { ok: false, reason: '這局人數已滿。' };
  }

  game.players.set(userId, {
    userId,
    displayName,
    hand,
  });

  const chosenCount = game.players.size;
  const allChosen = chosenCount >= game.maxPlayers;
  if (allChosen) {
    game.phase = 'done';
  }

  return { ok: true, allChosen, chosenCount };
}

/**
 * 1 人模式：在玩家出拳後加入 Bot 隨機出拳。
 * @param {Game} game
 * @returns {Hand}
 */
export function addBotOpponent(game) {
  const hand = HANDS[Math.floor(Math.random() * HANDS.length)];
  game.players.set('BOT', {
    userId: 'BOT',
    displayName: 'Bot',
    hand,
  });
  return hand;
}

/**
 * @param {Game} game
 * @returns {{
 *   winners: Player[],
 *   losers: Player[],
 *   isDraw: boolean,
 *   winningHand: Hand | null,
 *   handsUsed: Hand[],
 * }}
 */
export function resolveGame(game) {
  const players = [...game.players.values()];
  const handsUsed = [...new Set(players.map((p) => p.hand))];

  if (handsUsed.length !== 2) {
    return {
      winners: [],
      losers: [],
      isDraw: true,
      winningHand: null,
      handsUsed,
    };
  }

  const [a, b] = handsUsed;
  const winningHand = BEATS[a] === b ? a : BEATS[b] === a ? b : null;

  if (!winningHand) {
    return {
      winners: [],
      losers: [],
      isDraw: true,
      winningHand: null,
      handsUsed,
    };
  }

  const winners = players.filter((p) => p.hand === winningHand);
  const losers = players.filter((p) => p.hand !== winningHand);

  return {
    winners,
    losers,
    isDraw: false,
    winningHand,
    handsUsed,
  };
}

export { HAND_LABEL, HANDS };
