import { reverseOutcome } from './game.js';

function publicBaseUrl() {
  return (process.env.BASE_URL || 'https://linejanken.onrender.com').replace(/\/$/, '');
}

/**
 * @param {string} fileName
 */
function mediaUrl(fileName) {
  return `${publicBaseUrl()}/media/${fileName}`;
}

/**
 * 對應 mp4 資料夾：
 * 剪刀打布 / 布打石頭 / 石頭打剪刀
 * 石頭打剪刀 30% 會再播「石頭打剪刀2」（兩支）
 *
 * @param {import('./game.js').Hand} winningHand
 * @param {Set<import('./game.js').Hand>} used
 * @returns {string[]}
 */
function pickWinStems(winningHand, used) {
  switch (winningHand) {
    case 'scissors':
      return used.has('paper') ? ['scissors-beats-paper'] : [];
    case 'paper':
      return used.has('rock') ? ['paper-beats-rock'] : [];
    case 'rock':
      if (!used.has('scissors')) {
        return [];
      }
      if (Math.random() < 0.8) {
        return ['rock-beats-scissors', 'rock-beats-scissors-2'];
      }
      return ['rock-beats-scissors'];
    default: {
      const _never = winningHand;
      void _never;
      return [];
    }
  }
}

/**
 * @param {string} stem
 */
function videoMessage(stem) {
  return {
    type: 'video',
    originalContentUrl: mediaUrl(`${stem}.mp4`),
    previewImageUrl: mediaUrl(`${stem}.jpg`),
  };
}

/**
 * @param {ReturnType<import('./game.js').resolveGame>} result
 */
function resultVideos(result) {
  if (result.isDraw || !result.winningHand) {
    return [];
  }
  return pickWinStems(result.winningHand, new Set(result.handsUsed)).map(
    (stem) => videoMessage(stem),
  );
}

/**
 * @param {string} gameId
 */
export function countSelectMessage(gameId) {
  const buttons = [];
  for (let n = 1; n <= 10; n += 1) {
    buttons.push({
      type: 'button',
      style: n === 1 ? 'primary' : 'secondary',
      height: 'sm',
      action: {
        type: 'postback',
        label: n === 1 ? '1人vsBot' : `${n} 人`,
        data: `action=set_count&gameId=${gameId}&count=${n}`,
      },
    });
  }

  /** @type {object[]} */
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      margin: i === 0 ? 'md' : 'sm',
      contents: buttons.slice(i, i + 3).map((btn) => ({
        ...btn,
        flex: 1,
      })),
    });
  }

  return {
    type: 'flex',
    altText: '選擇猜拳人數',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '猜拳',
            weight: 'bold',
            size: 'xl',
          },
          ...rows,
        ],
      },
    },
  };
}

/**
 * @param {number} chosen
 * @param {number} total
 * @param {string[]} lockedNames
 */
export function chooseProgressMessage(chosen, total, lockedNames = []) {
  const list =
    lockedNames.length === 0
      ? '還沒有人出拳'
      : lockedNames.map((n, i) => `${i + 1}. ${n}`).join('\n');

  return {
    type: 'flex',
    altText: `出拳中 ${chosen}/${total}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `出拳中 ${chosen}/${total}`,
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: list,
            size: 'sm',
            color: '#444444',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'text',
            text: '拳種先保密，人齊後一起公布',
            size: 'xs',
            color: '#888888',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * @param {string} gameId
 * @param {number} maxPlayers
 */
export function chooseMessage(gameId, maxPlayers) {
  const isVsBot = maxPlayers === 1;
  return {
    type: 'flex',
    altText: isVsBot ? '跟 Bot 猜拳，請出拳' : `請出拳！共 ${maxPlayers} 人`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: isVsBot ? '跟 Bot 對戰' : '先出拳頭，剪刀、石頭',
            weight: 'bold',
            size: 'xl',
            wrap: true,
          },
          {
            type: 'text',
            text: isVsBot
              ? '選好拳種後，Bot 會立刻出拳並公布結果。'
              : `這局 ${maxPlayers} 人。點選後先保密，人齊再一起公布。`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'text',
            text: isVsBot
              ? '私訊或群組都可以測。'
              : '全員出完後，一次公布每人出什麼。',
            size: 'xs',
            color: '#888888',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '石頭 ✊',
              data: `action=choose&gameId=${gameId}&hand=rock`,
            },
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '布 ✋',
              data: `action=choose&gameId=${gameId}&hand=paper`,
            },
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '剪刀 ✌️',
              data: `action=choose&gameId=${gameId}&hand=scissors`,
            },
          },
        ],
      },
    },
  };
}

/**
 * @param {import('./game.js').Game} game
 * @param {ReturnType<import('./game.js').resolveGame>} result
 * @returns {{ videos: object[], result: object }}
 */
export function resultMessages(game, result) {
  const videos = resultVideos(result);
  const shown = videos.length >= 2 ? reverseOutcome(game, result) : result;

  const winnerNames = shown.winners.map((w) => w.displayName).join('\n');
  const summary = shown.isDraw
    ? '平手'
    : `勝者 ${shown.winners.map((w) => w.displayName).join('、')}`;

  const flex = shown.isDraw
    ? {
        type: 'flex',
        altText: summary,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#1A1A1A',
            paddingAll: '20px',
            contents: [
              {
                type: 'text',
                text: 'DRAW',
                weight: 'bold',
                size: 'sm',
                color: '#888888',
                align: 'center',
              },
              {
                type: 'text',
                text: '平手',
                weight: 'bold',
                size: 'xxl',
                color: '#EEEEEE',
                align: 'center',
                margin: 'lg',
              },
            ],
          },
        },
      }
    : {
        type: 'flex',
        altText: summary,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#140000',
            paddingAll: '20px',
            contents: [
              {
                type: 'text',
                text: 'WINNER',
                weight: 'bold',
                size: 'sm',
                color: '#FF2D2D',
                align: 'center',
              },
              {
                type: 'text',
                text: winnerNames || '勝者',
                weight: 'bold',
                size: 'xxl',
                color: '#FFD400',
                align: 'center',
                wrap: true,
                margin: 'lg',
              },
            ],
          },
        },
      };

  return {
    videos,
    result: flex,
  };
}

export function twistMessage() {
  return {
    type: 'text',
    text: '嗯？',
  };
}

export function helpMessage() {
  return {
    type: 'text',
    text: [
      '【猜拳 Bot 用法】',
      '1. 群組或私訊輸入：猜拳',
      '2. 選人數：1人vsBot，或 2～10 人',
      '3. 點石頭／布／剪刀',
      '4. 先出獲勝影片，數秒後公布結果',
      '',
      '其他指令：',
      '・結束猜拳／取消猜拳：取消目前這局',
      '・說明：顯示這段說明',
    ].join('\n'),
  };
}
