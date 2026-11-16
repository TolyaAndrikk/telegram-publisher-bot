import "dotenv/config";
import { Bot, Keyboard } from "grammy";
import { ownerOnly } from "./auth.js";
import { registerUserAndProject } from "./services/users.service.js";
import { registerAddChannelCommand } from "./commands/addchannel.js";
import { prisma } from "./db.js";

const token = "8948654514:AAGIAeputDILGeStvM9IpNsyEdrtcFz4SnA";
export const bot = new Bot(token);

// Тимчасовий словник для збереження стану користувачів
const userState = new Map<number, string>();

bot.command("start", async (ctx) => {
  if (!ctx.from) return;
  await registerUserAndProject(ctx.from);

  const keyboard = new Keyboard()
    .text("Створити пост")
    .text("Створити з AI")
    .row()
    .text("Контент-план")
    .text("Канали")
    .row()
    .text("Налаштування")
    .resized();

  await ctx.reply(
    "Вітаю! Це тестова версія бота для керування публікаціями.",
    { reply_markup: keyboard },
  );
});

// --- ОБРОБНИКИ КНОПОК ГОЛОВНОГО МЕНЮ ---

bot.hears("Створити пост", async (ctx) => {
  if (!ctx.from) return;
  userState.set(ctx.from.id, "WAITING_FOR_POST_TEXT");
  await ctx.reply("📝 Надішли текст для нового поста, і я збережу його в систему!");
});

bot.hears("Створити з AI", async (ctx) => {
  if (!ctx.from) return;
  userState.set(ctx.from.id, "WAITING_FOR_AI_PROMPT");
  await ctx.reply("🤖 Напиши коротко тему або ідею, про що має бути пост, і я згенерую текст за допомогою AI!");
});

bot.hears("Контент-план", async (ctx) => {
  await ctx.reply("📅 Твій поточний контент-план порожній. Тут згодом будуть заплановані пости.");
});

bot.hears("Канали", async (ctx) => {
  await ctx.reply("📢 Список підключених каналів. Використай команду /addchannel, щоб додати новий канал.");
});

bot.hears("Налаштування", async (ctx) => {
  await ctx.reply("⚙️ Налаштування бота: тут ти зможеш змінити параметри проєкту та часовий пояс.");
});

// --- ВИПРАВЛЕНІ ТА ДОДАНІ КОМАНДИ ---

// 1. Команда /newpost (тепер працює так само як кнопка створення поста)
bot.command("newpost", async (ctx) => {
  if (!ctx.from) return;
  userState.set(ctx.from.id, "WAITING_FOR_POST_TEXT");
  await ctx.reply("📝 Надішли текст для нового поста, і я збережу його в систему!");
});

// 2. Команда /whoami (показує Telegram ID)
bot.command("whoami", async (ctx) => {
  await ctx.reply(`Ваш Telegram ID: ${ctx.from?.id ?? "невідомий"}`);
});

// 3. Реєстрація команди /addchannel через імпортовану функцію
registerAddChannelCommand(bot);


// --- ОБРОБНИК ТЕКСТУ (ДЛЯ СТВОРЕННЯ ПОСТУ ТА AI) ---
bot.on("message:text", async (ctx) => {
  if (!ctx.from) return;

  const state = userState.get(ctx.from.id);
  if (!state) return; // Якщо немає активного стану, нічого не робимо

  const inputMessage = ctx.message.text;

  try {
    let postText = inputMessage;

    // Якщо стан очікування теми для AI
    if (state === "WAITING_FOR_AI_PROMPT") {
      await ctx.reply("⏳ Генерую текст за допомогою штучного інтелекту, зачекай хвилиночку...");
      
      // Тут у майбутньому можна підключити реальний API (OpenAI / Gemini)
      postText = `🔥 [Згенеровано AI на тему: "${inputMessage}"]\n\nЦе якісний згенерований текст поста, який адаптований для публікації в Telegram!`;
    }

    // Шукаємо користувача в базі даних за Telegram ID
    const dbUser = await prisma.user.findFirst({
      where: { telegramUserId: BigInt(ctx.from.id) } as any,
    });

    if (dbUser) {
      let projectId = (dbUser as any).currentProjectId || (dbUser as any).current_project_id;

      // Якщо у користувача не вибрано проєкт, знайдемо або створимо його
      if (!projectId) {
        const anyProject = await prisma.project.findFirst();
        if (anyProject) {
          projectId = anyProject.id;
        } else {
          const newProject = await prisma.project.create({
            data: {
              name: "Мій проєкт",
            } as any,
          });
          projectId = newProject.id;
        }
      }

      // Генеруємо унікальний publicId
      const publicId = Math.random().toString(36).substring(2, 10);

      // Зберігаємо пост у базу даних та виводимо в консоль для перевірки
      const createdPost = await prisma.post.create({
        data: {
          publicId: publicId,
          text: postText,
          contentType: "TEXT",
          status: "DRAFT",
          options: {},
          project: {
            connect: { id: projectId },
          },
          author: {
            connect: { id: (dbUser as any).id },
          },
        } as any,
      });

      console.log("УСПІШНО СТВОРЕНО ПОСТ У БАЗІ:", createdPost);

      await ctx.reply(`✅ Пост успішно збережено як чорновик!\n\nТекст:\n"${postText}"`);
    } else {
      await ctx.reply("⚠️ Помилка: тебе немає в базі даних. Напиши /start");
    }
  } catch (error) {
    console.error("Помилка при збереженні поста:", error);
    await ctx.reply("❌ Сталася помилка при збереженні поста в базу даних.");
  } finally {
    // Очищаємо стан у будь-якому випадку після виконання
    userState.delete(ctx.from.id);
  }
});


bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "/start - головне меню",
      "/newpost - створити новий пост",
      "/whoami - показати ваш Telegram ID",
      "/addchannel - підключити канал",
      "/posttest - тестова публікація",
      "/help - допомога",
    ].join("\n"),
  );
});

bot.command("posttest", ownerOnly, async (ctx) => {
  const channelId = process.env.TEST_CHANNEL_ID;

  if (!channelId) {
    await ctx.reply("TEST_CHANNEL_ID is missing in .env");
    return;
  }

  const sent = await bot.api.sendMessage(
    channelId,
    `Тестова публікація: ${new Date().toISOString()}`,
  );

  await ctx.reply(`Готово. Telegram message_id: ${sent.message_id}`);
});

bot.on("channel_post", async (ctx) => {
  console.log("Channel title:", ctx.chat.title);
  console.log("Channel chat ID:", ctx.chat.id);
});

bot.on("my_chat_member", async (ctx) => {
  console.log("Bot membership changed in chat:", ctx.chat.id, ctx.chat.title);
  console.log("New status:", ctx.myChatMember.new_chat_member.status);
});

bot.catch((error) => {
  console.error("Bot error:", error.error);
});

if (process.env.NODE_ENV !== "production") {
  // Реєструємо команди в меню Telegram
  await bot.api.setMyCommands([
    { command: "start", description: "Запустити бота" },
    { command: "newpost", description: "Створити новий пост" },
    { command: "whoami", description: "Показати мій Telegram ID" },
    { command: "addchannel", description: "Підключити канал" },
    { command: "posttest", description: "Тестова публікація" },
    { command: "help", description: "Допомога" },
  ]);

  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running in long polling mode`);
    },
  });

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
}