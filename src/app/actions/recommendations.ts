"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getReaderRecommendations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { stories: [], hasHistory: false };

  const userId = session.user.id;

  // 1. Fetch user profile, read history, and high reviews
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: { genres: true }
      },
      readHistory: {
        include: {
          story: {
            include: { genres: true, tags: true }
          }
        }
      },
      reviews: {
        where: { rating: { gte: 4 } },
        include: {
          story: {
            include: { genres: true, tags: true }
          }
        }
      }
    }
  });

  if (!user) return { stories: [], hasHistory: false };

  const hasHistory = user.readHistory.length > 0;
  const readStoryIds = new Set(user.readHistory.map(h => h.storyId));
  const reviewStoryIds = new Set(user.reviews.map(r => r.storyId));
  const excludeStoryIds = Array.from(new Set([...readStoryIds, ...reviewStoryIds]));

  // 2. Build frequency maps
  const genreScores: Record<string, number> = {};
  const tagScores: Record<string, number> = {};

  // Baseline from profile genres (weight 3)
  if (user.profile?.genres) {
    user.profile.genres.forEach(g => {
      genreScores[g.id] = (genreScores[g.id] || 0) + 3;
    });
  }

  // From read history (weight 1)
  user.readHistory.forEach(h => {
    h.story.genres.forEach(g => {
      genreScores[g.id] = (genreScores[g.id] || 0) + 1;
    });
    h.story.tags.forEach(t => {
      tagScores[t.id] = (tagScores[t.id] || 0) + 1;
    });
  });

  // From high reviews (weight 2)
  user.reviews.forEach(r => {
    r.story.genres.forEach(g => {
      genreScores[g.id] = (genreScores[g.id] || 0) + 2;
    });
    r.story.tags.forEach(t => {
      tagScores[t.id] = (tagScores[t.id] || 0) + 2;
    });
  });

  // 3. Fetch candidate stories
  // Exclude stories the user has already read or authored
  const candidates = await prisma.story.findMany({
    where: {
      status: "PUBLISHED",
      authorId: { not: userId },
      id: { notIn: excludeStoryIds }
    },
    include: {
      author: { include: { profile: true } },
      genres: true,
      tags: true,
      reviews: { select: { rating: true } }
    }
  });

  // 4. Score and sort candidates
  const scoredCandidates = candidates.map(story => {
    let score = 0;
    
    // Add points for matching genres
    story.genres.forEach(g => {
      if (genreScores[g.id]) score += genreScores[g.id];
    });

    // Add points for matching tags
    story.tags.forEach(t => {
      if (tagScores[t.id]) score += tagScores[t.id];
    });

    // Calculate avg rating
    const totalRating = story.reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = story.reviews.length > 0 ? (totalRating / story.reviews.length) : 0;
    
    // Add avg rating as a slight boost / tiebreaker
    score += avgRating * 0.5;

    return {
      ...story,
      avgRating: Number(avgRating.toFixed(1)),
      score
    };
  });

  // Sort by score desc, then by date desc as a tiebreaker
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const topRecommendations = scoredCandidates.slice(0, 4);

  // Format identical to Home page's formattedStories
  const formattedStories = topRecommendations.map(story => ({
    id: story.id,
    title: story.title,
    author: story.author.profile?.username || "Unknown",
    avatarUrl: story.author.profile?.avatarUrl,
    genre: story.genres[0]?.name || "Uncategorized",
    tags: story.tags || [],
    rating: story.avgRating
  }));

  return { 
    stories: formattedStories, 
    hasHistory 
  };
}
