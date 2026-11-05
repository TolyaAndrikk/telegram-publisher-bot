import "dotenv/config";

const token = process.env.BOT_TOKEN;
const baseUrl = process.env.WEBHOOK_BASE_URL;
const secret = process.env.WEBHOOK_SECRET;

if (!token || !baseUrl || !secret) {
  throw new Error("BOT_TOKEN, WEBHOOK_BASE_URL or WEBHOOK_SECRET is missing");
}

const response = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: `${baseUrl}/telegram/webhook`,
      secret_token: secret,
      allowed_updates: [
        "message",
        "callback_query",
        "my_chat_member",
        "channel_post",
        "edited_channel_post",
        "pre_checkout_query"
      ],
      drop_pending_updates: false
    }),
  },
);

console.log(await response.json());
