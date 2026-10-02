/** @typedef {'rock' | 'paper' | 'scissors'} Hand */

/** @typedef {'waiting_count' | 'joining' | 'choosing' | 'done'} GamePhase */

/**
 * @typedef {object} Player
 * @property {string} userId
 * @property {string} displayName
 * @property {Hand | null} hand
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
    return { ok: false, reason: '這局已經開始選人數了，請先結束或重開。' };
  }
  if (!Number.isInteger(count) || count < 2 || count > 10) {
    return { ok: false, reason: '人數需為 2～10。' };
  }
  game.maxPlayers = count;
  game.phase = 'joining';
  return { ok: true };
}

/**
 * @param {Game} game
 * @param {string} userId
 * @param {string} displayName
 * @returns {{ ok: true, ready: boolean } | { ok: false, reason: string }}
 */
export function joinGame(game, userId, displayName) {
  if (game.phase !== 'joining' || game.maxPlayers == null) {
    return { ok: false, reason: '目前不是加入階段。' };
  }
  if (game.players.has(userId)) {
    return { ok: false, reason: '你已經加入了。' };
  }
  if (game.players.size >= game.maxPlayers) {
    return { ok: false, reason: '人數已滿。' };
  }

  game.players.set(userId, {
    userId,
    displayName,
    hand: null,
  });

  const ready = game.players.size >= game.maxPlayers;
  if (ready) {
    game.phase = 'choosing';
  }
  return { ok: true, ready };
}

/**
 * @param {Game} game
 * @param {string} userId
 * @param {string} handRaw
 * @returns {{ ok: true, allChosen: boolean } | { ok: false, reason: string }}
 */
export function chooseHand(game, userId, handRaw) {
  if (game.phase !== 'choosing') {
    return { ok: false, reason: '目前不是出拳階段。' };
  }
  if (!game.players.has(userId)) {
    return { ok: false, reason: '你不在這局玩家名單中。' };
  }

  if (!HANDS.includes(/** @type {Hand} */ (handRaw))) {
    return { ok: false, reason: '無效的出拳。' };
  }

  const hand = /** @type {Hand} */ (handRaw);
  const player = game.players.get(userId);
  if (!player) {
    return { ok: false, reason: '找不到玩家。' };
  }
  if (player.hand != null) {
    return { ok: false, reason: '你已經出過拳了。' };
  }

  player.hand = hand;

  const allChosen = [...game.players.values()].every((p) => p.hand != null);
  if (allChosen) {
    game.phase = 'done';
  }
  return { ok: true, allChosen };
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
  const handsUsed = [...new Set(players.map((p) => /** @type {Hand} */ (p.hand)))];

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
