import type { Context, NextFunction } from "grammy";

const ownerId = Number(process.env.OWNER_TELEGRAM_ID);

export async function ownerOnly(ctx: Context, next: NextFunction) {
  if (!ctx.from || ctx.from.id !== ownerId) {
    await ctx.reply("У вас немає доступу до цієї дії.");
    return;
  }

  await next();
}
