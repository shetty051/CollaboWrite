"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function submitFeedback(category: string, message: string, rating: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.siteFeedback.create({
      data: {
        userId: session.user.id,
        category,
        message,
        rating: rating > 0 ? rating : null
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to submit feedback", error);
    return { error: "Failed to submit feedback" };
  }
}
