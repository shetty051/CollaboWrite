"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getRecentAccountDetails() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true },
  });

  if (!user) return null;

  return {
    email: user.email,
    name: user.profile?.fullName || "New User",
    avatarUrl: user.profile?.avatarUrl || null,
    username: user.profile?.username || "",
  };
}
