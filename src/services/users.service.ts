import type { User as TelegramUser } from "grammy/types";
import { prisma } from "../db.js";

export async function registerUserAndProject(from: TelegramUser) {
  const user = await prisma.user.upsert({
    where: { telegramUserId: BigInt(from.id) },
    update: {
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      language: from.language_code ?? "uk",
    },
    create: {
      telegramUserId: BigInt(from.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      language: from.language_code ?? "uk",
    },
  });

  const ownedCount = await prisma.project.count({
    where: { ownerId: user.id },
  });

  if (ownedCount === 0) {
    await prisma.project.create({
      data: {
        name: "Мій перший проєкт",
        timezone: process.env.DEFAULT_TIMEZONE ?? "Europe/Kyiv",
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
  }

  return user;
}
