import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";

export function registerAddChannelCommand(bot: Bot) {
  bot.command("addchannel", async (ctx) => {
    const username = process.env.BOT_USERNAME;
    if (!username) throw new Error("BOT_USERNAME is missing");

    const url =
      `https://t.me/${username}` +
      `?startchannel&admin=post_messages+edit_messages+delete_messages`;

    const keyboard = new InlineKeyboard()
      .url("Підключити канал", url)
      .row()
      .text("Перевірити підключення", "channels:refresh");

    await ctx.reply(
      "Натисніть кнопку, виберіть канал і підтвердьте права публікації, редагування та видалення.",
      { reply_markup: keyboard },
    );
  });
}
