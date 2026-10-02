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
 * 依勝負對應自訂動畫（目前有：剪刀打布）
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
 * @param {string} gameId
 */
export function countSelectMessage(gameId) {
  const buttons = [];
  for (let n = 2; n <= 10; n += 1) {
    buttons.push({
      type: 'button',
      style: n === 2 ? 'primary' : 'secondary',
      height: 'sm',
      action: {
        type: 'postback',
        label: `${n} 人`,
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
    altText: '選擇猜拳人數（2～10）',
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
            text: '先選這局要幾個人玩（2～10），再直接出拳',
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
  return {
    type: 'flex',
    altText: `請出拳！共 ${maxPlayers} 人`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '先出拳頭，剪刀、石頭、布',
            weight: 'bold',
            size: 'xl',
            wrap: true,
          },
          {
            type: 'text',
            text: `這局 ${maxPlayers} 人。點選後先保密，人齊再一起公布。`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'text',
            text: '全員出完後，一次公布每人出什麼。',
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

  const revealText = {
    type: 'text',
    text: ['一起開拳！', ...lines, '', summary].join('\n'),
  };

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
    return [revealText, flex];
  }
  if (animation) {
    return [revealText, flex, animation];
  }
  return [
    revealText,
    flex,
    { type: 'sticker', packageId: '11537', stickerId: '52002735' },
  ];
}

export function helpMessage() {
  return {
    type: 'text',
    text: [
      '【猜拳 Bot 用法】',
      '1. 在群組輸入：猜拳',
      '2. 選擇人數（2～10）',
      '3. 大家直接點石頭／布／剪刀（拳種先保密）',
      '4. 人齊後一次公布：誰出什麼',
      '',
      '其他指令：',
      '・結束猜拳／取消猜拳：取消目前這局',
      '・說明：顯示這段說明',
    ].join('\n'),
  };
}
