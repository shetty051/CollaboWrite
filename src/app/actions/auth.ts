"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function signUpAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        onboardingStep: "ROLE_SELECTION",
      },
    });

    return { success: true, userId: user.id };
  } catch (error: any) {
    console.error("signUpAction error:", error);
    return { error: `Server error: ${error?.message || String(error)}` };
  }
}

export async function setRoleAction(userId: string, role: string) {
  if (role !== "READER" && role !== "WRITER") {
    return { error: "Invalid role" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      onboardingStep: "PROFILE_SETUP",
    },
  });

  return { success: true };
}

export async function setupProfileAction(userId: string, data: any) {
  // data should contain fullName, username, age, country, and genreIds
  const { fullName, username, age, country, genres } = data;

  const existingUsername = await prisma.profile.findUnique({
    where: { username },
  });

  if (existingUsername) {
    return { error: "Username is already taken" };
  }

  await prisma.profile.create({
    data: {
      userId,
      fullName,
      username,
      age: parseInt(age),
      country,
      genres: {
        connect: genres.map((id: string) => ({ id })),
      },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingStep: "COMPLETED" },
  });

  return { success: true };
}
