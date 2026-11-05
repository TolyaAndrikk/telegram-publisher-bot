import "dotenv/config";
import Fastify from "fastify";
import type { Update } from "grammy/types";
import { bot } from "./bot.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

app.post("/telegram/webhook", async (request, reply) => {
  const receivedSecret = request.headers["x-telegram-bot-api-secret-token"];

  if (receivedSecret !== process.env.WEBHOOK_SECRET) {
    return reply.code(401).send({ ok: false });
  }

  const update = request.body as Update;
  await bot.handleUpdate(update);
  return reply.code(200).send({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ host: "0.0.0.0", port });
console.log(`Webhook server is running on port ${port}`);
