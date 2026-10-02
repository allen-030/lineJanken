# LINE 群組猜拳 Bot（簡單版）

免費試做：LINE Messaging API + 本機。支援 **2～10 人**。

## 玩法

1. 把 Bot（官方帳號）加進群組  
2. 群裡輸入 `猜拳`  
3. 選人數（2～10）  
4. 點「加入猜拳」直到滿員  
5. 點石頭／布／剪刀（群組不會立刻看到你出什麼）  
6. 全員出完 → 公布結果 + 貼圖  

其他指令：`取消猜拳`、`說明`

---

## 本機啟動指令（Windows PowerShell）

假設專案在桌面 `lineJanken`，用**兩個終端視窗**。

### 終端 A：啟動 Bot

```powershell
cd $env:USERPROFILE\Desktop\lineJanken
npm install
npm start
```

看到類似下面就代表成功：

```text
line-janken listening on http://localhost:3000
Webhook path: POST /webhook
```

### 終端 B：對外公開（ngrok）

若還沒裝 ngrok（PowerShell 出現「無法辨識 ngrok」）：

```powershell
winget install --id Ngrok.Ngrok -e --accept-source-agreements --accept-package-agreements
```

裝完後**關掉終端再開一個新的**，再到 https://dashboard.ngrok.com/ 註冊／登入 → 複製 Authtoken，執行一次：

```powershell
ngrok config add-authtoken 你的_authtoken
```

然後：

```powershell
ngrok http 3000
```

複製畫面上的 HTTPS 網址，例如：

```text
https://xxxx.ngrok-free.app
```

Webhook 要填（注意後面一定要加 `/webhook`）：

```text
https://xxxx.ngrok-free.app/webhook
```

---

## 填 LINE Webhook

1. 開 [LINE Official Account Manager](https://manager.line.biz/) → 你的帳號 → **設定 → Messaging API**  
   或從該頁點進 **LINE Developers Console**  
2. 填 **Webhook URL** = 上面的 `https://.../webhook`  
3. 開啟 **Use webhook** / 使用 Webhook  
4. 按 **Verify**（驗證）  
5. 建議關閉官方帳號的「聊天／自動回應」，避免跟 Bot 搶回覆  

---

## 環境變數 `.env`

若還沒建過：

```powershell
cd $env:USERPROFILE\Desktop\lineJanken
copy .env.example .env
notepad .env
```

內容：

```env
CHANNEL_SECRET=你的_channel_secret
CHANNEL_ACCESS_TOKEN=你的_channel_access_token
PORT=3000
```

- `CHANNEL_SECRET`：Messaging API 頁的 Channel secret  
- `CHANNEL_ACCESS_TOKEN`：LINE Developers → Messaging API → Issue  

**不要把 `.env` 傳到聊天或上傳到 Git。**

---

## 加進群組測試

1. 手機 LINE 找到官方帳號（例如「做好玩的」）  
2. 目標群組 → 邀請 → 把官方帳號加進去  
3. 確認**終端 A、終端 B 都還開著**  
4. 群裡輸入：`猜拳`  

---

## 常用指令速查

| 做什麼 | 指令 |
|--------|------|
| 進專案 | `cd $env:USERPROFILE\Desktop\lineJanken` |
| 安裝依賴 | `npm install` |
| 開 Bot | `npm start` |
| 對外網址 | `ngrok http 3000` |
| 編輯金鑰 | `notepad .env` |

---

## 目前限制（簡單版）

- 對局存在記憶體：伺服器重啟會清空進行中局  
- 同一群一次一局  
- `npm start` 與 `ngrok` 都要保持開啟，Bot 才會回訊息  
- 出拳用 ✊✋✌️；結果貼圖用官方 Bot 可用貼圖  
