import 'dotenv/config';
import express from 'express';
import { middleware, messagingApi } from '@line/bot-sdk';
import { handleEvent } from './handler.js';

const channelSecret = process.env.CHANNEL_SECRET;
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
const port = Number(process.env.PORT || 3000);

if (!channelSecret || !channelAccessToken) {
  console.error(
    '缺少 CHANNEL_SECRET 或 CHANNEL_ACCESS_TOKEN。請複製 .env.example 成 .env 並填入。',
  );
  process.exit(1);
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

const app = express();

app.get('/', (_req, res) => {
  res.status(200).send('line-janken ok');
});

app.post(
  '/webhook',
  middleware({ channelSecret }),
  async (req, res) => {
    try {
      const events = req.body.events ?? [];
      await Promise.all(events.map((event) => handleEvent(client, event)));
      res.status(200).end();
    } catch (error) {
      console.error('webhook error', error);
      res.status(500).end();
    }
  },
);

app.listen(port, () => {
  console.log(`line-janken listening on http://localhost:${port}`);
  console.log(`Webhook path: POST /webhook`);
});
