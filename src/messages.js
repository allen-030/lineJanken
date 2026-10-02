import { HAND_LABEL } from './game.js';

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
        displayText: `選 ${n} 人猜拳`,
      },
    });
  }

  // Flex 一列最多不好塞滿 9 顆，改用兩欄排版
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
            text: '先選這局要幾個人玩（2～10）',
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
 * @param {string} gameId
 * @param {number} maxPlayers
 * @param {string[]} joinedNames
 */
export function joinMessage(gameId, maxPlayers, joinedNames) {
  const list =
    joinedNames.length === 0
      ? '還沒有人加入'
      : joinedNames.map((n, i) => `${i + 1}. ${n}`).join('\n');

  return {
    type: 'flex',
    altText: `猜拳招募中（${joinedNames.length}/${maxPlayers}）`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `招募中 ${joinedNames.length}/${maxPlayers}`,
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: list,
            size: 'sm',
            color: '#444444',
            wrap: true,
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '加入猜拳',
              data: `action=join&gameId=${gameId}`,
              displayText: '我要加入猜拳',
            },
          },
        ],
      },
    },
  };
}

/**
 * @param {string} gameId
 * @param {string[]} playerNames
 */
export function chooseMessage(gameId, playerNames) {
  return {
    type: 'flex',
    altText: '請出拳！剪刀石頭布',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '請出拳',
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'text',
            text: `玩家：${playerNames.join('、')}`,
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'text',
            text: '只有名單內的人可出拳，選了之後群組不會立刻看到你出什麼。',
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
              displayText: '已出拳（保密）',
            },
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '布 ✋',
              data: `action=choose&gameId=${gameId}&hand=paper`,
              displayText: '已出拳（保密）',
            },
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '剪刀 ✌️',
              data: `action=choose&gameId=${gameId}&hand=scissors`,
              displayText: '已出拳（保密）',
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
    const hand = p.hand ? HAND_LABEL[p.hand] : '？';
    return `${p.displayName}：${hand}`;
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

  // 官方免費貼圖：用 celebratory / fun size 增加熱鬧感（非專用猜拳貼圖）
  const sticker = result.isDraw
    ? { type: 'sticker', packageId: '11537', stickerId: '52002750' }
    : { type: 'sticker', packageId: '11537', stickerId: '52002735' };

  return [flex, sticker];
}

export function helpMessage() {
  return {
    type: 'text',
    text: [
      '【猜拳 Bot 用法】',
      '1. 在群組輸入：猜拳',
      '2. 選擇人數（2～10）',
      '3. 大家點「加入猜拳」',
      '4. 滿員後點石頭／布／剪刀',
      '5. 全員出完自動公布結果',
      '',
      '其他指令：',
      '・結束猜拳／取消猜拳：取消目前這局',
      '・說明：顯示這段說明',
    ].join('\n'),
  };
}
