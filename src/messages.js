import { HAND_LABEL } from './game.js';

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
 * 剪刀贏布時用 MP4（點擊播放）
 * @param {ReturnType<import('./game.js').resolveGame>} result
 */
function resultAnimation(result) {
  if (result.isDraw || !result.winningHand) {
    return null;
  }

  const used = new Set(result.handsUsed);
  if (result.winningHand === 'scissors' && used.has('paper')) {
    return {
      type: 'video',
      originalContentUrl: mediaUrl('scissors-beats-paper.mp4'),
      previewImageUrl: mediaUrl('scissors-beats-paper.jpg'),
    };
  }

  return null;
}

/**
 * GIF 測試用（官方規格為 JPEG/PNG；用 push 另發，失敗不影響結果）
 * @param {ReturnType<import('./game.js').resolveGame>} result
 */
export function gifTestMessage(result) {
  if (result.isDraw || !result.winningHand) {
    return null;
  }
  const used = new Set(result.handsUsed);
  if (result.winningHand === 'scissors' && used.has('paper')) {
    return {
      type: 'image',
      originalContentUrl: mediaUrl('scissors-beats-paper.gif'),
      previewImageUrl: mediaUrl('scissors-beats-paper.jpg'),
    };
  }
  return null;
}

/**
 * @param {ReturnType<import('./game.js').resolveGame>} result
 */
export function shouldTestGif(result) {
  return gifTestMessage(result) != null;
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
    altText: '選擇猜拳人數（1～10）',
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
          {
            type: 'text',
            text: '1 人＝跟 Bot 對戰；2～10 人＝群組互猜',
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md',
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
 */
export function resultMessages(game, result) {
  const lines = [...game.players.values()].map((p) => {
    return `${p.displayName}：${HAND_LABEL[p.hand]}`;
  });

  let summary;
  if (result.isDraw) {
    summary = '結果：平手！大家再來一局吧。';
  } else {
    const winnerNames = result.winners.map((w) => w.displayName).join('、');
    const handLabel = result.winningHand ? HAND_LABEL[result.winningHand] : '';
    summary = `勝利：${winnerNames}（${handLabel}）`;
  }

  const flex = {
    type: 'flex',
    altText: summary,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '猜拳結果',
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'text',
            text: lines.join('\n'),
            size: 'sm',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: summary,
            weight: 'bold',
            size: 'md',
            wrap: true,
            margin: 'md',
            color: result.isDraw ? '#888888' : '#1DB446',
          },
          {
            type: 'text',
            text: '輸入「猜拳」可再開一局',
            size: 'xs',
            color: '#aaaaaa',
            margin: 'md',
          },
        ],
      },
    },
  };

  const animation = resultAnimation(result);
  if (result.isDraw) {
    return [flex];
  }
  if (animation) {
    return [flex, animation];
  }
  return [
    flex,
    { type: 'sticker', packageId: '11537', stickerId: '52002735' },
  ];
}

export function helpMessage() {
  return {
    type: 'text',
    text: [
      '【猜拳 Bot 用法】',
      '1. 群組或私訊輸入：猜拳',
      '2. 選人數：1人vsBot，或 2～10 人互猜',
      '3. 點石頭／布／剪刀（多人模式先保密）',
      '4. 公布結果（剪刀贏布會測 GIF／MP4）',
      '',
      '其他指令：',
      '・結束猜拳／取消猜拳：取消目前這局',
      '・說明：顯示這段說明',
    ].join('\n'),
  };
}
