"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createNotification(userId: string, type: string, message: string, link?: string) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link
      }
    });
  } catch (e) {
    console.error("Failed to create notification", e);
  }
}

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return { notifications };
}

export async function markAsRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true }
  });

  return { success: true };
}

export async function markAllAsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true }
  });

  return { success: true };
}
