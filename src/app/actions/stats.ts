"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getStatsData(storyId: string | null = null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  // Base where clause to get stories the user owns or is co-authoring
  let whereClause: any = {
    OR: [
      { authorId: userId },
      { coAuthors: { some: { userId, status: "ACCEPTED" } } }
    ]
  };

  if (storyId) {
    whereClause.id = storyId;
  }

  // Fetch stories with related reviews, chapters, and comments (for demographics)
  const stories = await prisma.story.findMany({
    where: whereClause,
    include: {
      chapters: { orderBy: { order: 'asc' } },
      reviews: {
        include: { user: { include: { profile: { include: { genres: true } } } } },
        orderBy: { createdAt: 'asc' }
      },
      comments: {
        include: { user: { include: { profile: { include: { genres: true } } } } }
      }
    }
  });

  if (stories.length === 0) {
    return { empty: true };
  }

  // 1. Summary Metrics
  let totalViews = 0;
  let totalReviews = 0;
  let ratingSum = 0;
  let allReviews: any[] = [];
  let allComments: any[] = [];

  stories.forEach(story => {
    totalViews += story.viewCount;
    story.chapters.forEach(chap => { totalViews += chap.viewCount; });
    
    totalReviews += story.reviews.length;
    story.reviews.forEach(rev => {
      ratingSum += rev.rating;
      allReviews.push(rev);
    });
    
    story.comments.forEach(com => {
      allComments.push(com);
    });
  });

  const avgRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : 0;
  
  let sentiment = "N/A";
  if (totalReviews > 0) {
    const avg = Number(avgRating);
    if (avg >= 4) sentiment = "Positive";
    else if (avg >= 2.5) sentiment = "Mixed";
    else sentiment = "Negative";
  }

  // 2. Ratings & Reviews Trend
  // Group by Date string (YYYY-MM-DD)
  const trendsMap = new Map<string, { sum: number, count: number }>();
  allReviews.forEach(rev => {
    const date = new Date(rev.createdAt).toISOString().split('T')[0];
    const current = trendsMap.get(date) || { sum: 0, count: 0 };
    trendsMap.set(date, { sum: current.sum + rev.rating, count: current.count + 1 });
  });

  const ratingsTrend = Array.from(trendsMap.entries()).map(([date, data]) => ({
    date,
    avgRating: Number((data.sum / data.count).toFixed(1)),
    reviews: data.count
  })).sort((a, b) => a.date.localeCompare(b.date));

  // 3. Views Chart
  let viewsChart = [];
  if (storyId && stories.length === 1 && stories[0].format === "SERIALIZED") {
    // Chapter Drop-off
    viewsChart = stories[0].chapters.map((chap, idx) => ({
      name: `Ch ${idx + 1}`,
      views: chap.viewCount
    }));
  } else {
    // All Stories or Single Story total
    viewsChart = stories.map(story => {
      const chapterViews = story.chapters.reduce((sum, chap) => sum + chap.viewCount, 0);
      return {
        name: story.title.length > 15 ? story.title.substring(0, 15) + '...' : story.title,
        views: story.viewCount + chapterViews
      };
    });
  }

  // 4. Demographics
  // Get unique users who interacted
  const uniqueUsers = new Map();
  allReviews.forEach(rev => {
    if (rev.user.profile) uniqueUsers.set(rev.userId, rev.user.profile);
  });
  allComments.forEach(com => {
    if (com.user.profile) uniqueUsers.set(com.userId, com.user.profile);
  });

  const countryCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  uniqueUsers.forEach(profile => {
    countryCounts[profile.country] = (countryCounts[profile.country] || 0) + 1;
    profile.genres.forEach((g: any) => {
      genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
    });
  });

  const countryDemo = Object.entries(countryCounts).map(([name, value]) => ({ name, value }));
  const genreDemo = Object.entries(genreCounts).map(([name, value]) => ({ name, value }));

  // Dropdown options
  const allStoriesRaw = await prisma.story.findMany({
    where: whereClause,
    select: { id: true, title: true }
  });

  const storiesTable = stories.map(story => {
    const chapterViews = story.chapters.reduce((sum, chap) => sum + chap.viewCount, 0);
    const revCount = story.reviews.length;
    const revSum = story.reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = revCount > 0 ? (revSum / revCount).toFixed(1) : "0";
    return {
      id: story.id,
      title: story.title,
      format: story.format,
      status: story.status,
      views: story.viewCount + chapterViews,
      reviews: revCount,
      avgRating: Number(avg)
    };
  });

  return {
    empty: false,
    summary: {
      totalViews,
      totalReviews,
      avgRating: Number(avgRating),
      sentiment
    },
    ratingsTrend,
    viewsChart,
    demographics: {
      countries: countryDemo,
      genres: genreDemo
    },
    storyOptions: allStoriesRaw,
    storiesTable
  };
}
