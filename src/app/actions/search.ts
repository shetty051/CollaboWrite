"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function globalSearch(query: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!query || query.trim() === "") {
    return { stories: [], writers: [], tags: [], genres: [] };
  }

  const q = query.trim();

  // Search Stories
  const stories = await prisma.story.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: q } },
        { subtitle: { contains: q } }
      ]
    },
    include: {
      author: { select: { profile: true } },
      genres: true,
      tags: true,
      reviews: { select: { rating: true } }
    },
    take: 10
  });

  const formattedStories = stories.map(s => {
    const totalRating = s.reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = s.reviews.length > 0 ? (totalRating / s.reviews.length).toFixed(1) : 0;
    return { ...s, avgRating: Number(avgRating) };
  });

  // Search Writers
  const writers = await prisma.user.findMany({
    where: {
      role: "WRITER",
      profile: {
        OR: [
          { username: { contains: q } },
          { fullName: { contains: q } }
        ]
      }
    },
    include: { profile: true },
    take: 10
  });

  // Search Tags
  const tags = await prisma.tag.findMany({
    where: {
      name: { contains: q }
    },
    take: 10
  });

  // Search Genres
  const genres = await prisma.genre.findMany({
    where: {
      name: { contains: q }
    },
    take: 10
  });

  return { 
    stories: formattedStories, 
    writers, 
    tags, 
    genres 
  };
}
