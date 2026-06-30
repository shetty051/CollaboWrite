"use server";

import { prisma } from "@/lib/prisma";

export async function getLeaderboard() {
  // Fetch all users who have the role 'WRITER' (and actually have published stories)
  const writersRaw = await prisma.user.findMany({
    where: { role: "WRITER" },
    include: {
      profile: true,
      stories: {
        where: { status: "PUBLISHED" },
        include: {
          reviews: true,
          chapters: true
        }
      }
    }
  });

  // Calculate platform-wide metrics for Bayesian average
  let globalTotalRating = 0;
  let globalTotalReviews = 0;

  const writerStats = writersRaw.map(writer => {
    let totalReads = 0;
    let totalRating = 0;
    let totalReviews = 0;
    let publishedCount = writer.stories.length;

    writer.stories.forEach(story => {
      // reads = story viewCount + chapter viewCounts
      totalReads += story.viewCount;
      story.chapters.forEach(c => totalReads += c.viewCount);

      totalReviews += story.reviews.length;
      story.reviews.forEach(r => totalRating += r.rating);
    });

    globalTotalRating += totalRating;
    globalTotalReviews += totalReviews;

    const rawAvg = totalReviews > 0 ? totalRating / totalReviews : 0;

    return {
      id: writer.id,
      username: writer.profile?.username || "Unknown",
      avatarUrl: writer.profile?.avatarUrl || null,
      publishedCount,
      totalReads,
      totalReviews,
      rawAvg
    };
  });

  // Calculate C (mean rating across platform)
  const C = globalTotalReviews > 0 ? globalTotalRating / globalTotalReviews : 0;
  // Tuning parameter m (e.g., consider 3 reviews as a baseline threshold)
  const m = 3;

  // Calculate weighted rating and sort
  const leaderboard = writerStats
    .filter(w => w.publishedCount > 0) // only include writers with published works
    .map(w => {
      const v = w.totalReviews;
      const R = w.rawAvg;
      
      // Bayesian average, only applied if they have at least 1 review
      const weightedRating = v > 0 ? (v / (v + m)) * R + (m / (v + m)) * C : null;
      
      return {
        ...w,
        weightedRating: weightedRating !== null ? Number(weightedRating.toFixed(2)) : null
      };
    })
    .sort((a, b) => {
      // Unranked writers (null) go to the bottom
      if (a.weightedRating === null && b.weightedRating !== null) return 1;
      if (b.weightedRating === null && a.weightedRating !== null) return -1;
      
      // Sort by weighted rating descending
      if (a.weightedRating !== null && b.weightedRating !== null && b.weightedRating !== a.weightedRating) {
        return b.weightedRating - a.weightedRating;
      }
      
      // Tie-breaker: total reads
      return b.totalReads - a.totalReads;
    });

  return leaderboard;
}
