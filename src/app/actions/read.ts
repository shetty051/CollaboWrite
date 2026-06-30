"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createNotification } from "./notifications";

export async function getPublishedStories(genreFilter?: string[], tagFilter?: string[], search?: string, sort?: string) {
  const where: any = { status: "PUBLISHED" };

  if (genreFilter && genreFilter.length > 0) {
    where.genres = { some: { id: { in: genreFilter } } };
  }

  if (tagFilter && tagFilter.length > 0) {
    where.tags = { some: { name: { in: tagFilter } } };
  }

  if (search && search.trim() !== "") {
    where.OR = [
      { title: { contains: search } },
      { author: { profile: { username: { contains: search } } } }
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  
  if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  } else if (sort === "popular") {
    // using viewCount as a proxy for popularity for now, or could count comments/reviews
    orderBy = { viewCount: "desc" };
  } else if (sort === "rated") {
    // We would ideally sort by avg rating, but Prisma doesn't natively sort by aggregated fields across relations easily in standard findMany.
    // For now, we will fetch and sort in memory if requested, or just fallback to newest and sort the array.
    // To keep it simple, we'll fetch them, then sort in memory.
  }

  let stories = await prisma.story.findMany({
    where,
    include: {
      author: { select: { profile: true } },
      genres: true,
      tags: true,
      coAuthors: {
        where: { status: "ACCEPTED" },
        include: { user: { select: { profile: true } } }
      },
      reviews: { select: { rating: true } } // needed for rating
    },
    orderBy: sort !== "rated" ? orderBy : undefined
  });

  // Calculate average rating
  const mapped = stories.map(s => {
    const totalRating = s.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
    const avgRating = s.reviews.length > 0 ? (totalRating / s.reviews.length).toFixed(1) : 0;
    return { ...s, avgRating: Number(avgRating), reviewCount: s.reviews.length };
  });

  if (sort === "rated") {
    mapped.sort((a, b) => b.avgRating - a.avgRating);
  }

  const allGenres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return { stories: mapped, genres: allGenres };
}

export async function getStoryDetails(storyId: string) {
  const session = await getServerSession(authOptions);
  
  const story = await prisma.story.findUnique({
    where: { id: storyId, status: "PUBLISHED" },
    include: {
      author: { select: { id: true, profile: true } },
      genres: true,
      tags: true,
      coAuthors: {
        where: { status: "ACCEPTED" },
        include: { user: { select: { id: true, profile: true } } }
      },
      chapters: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" }
      },
      reviews: {
        include: { user: { select: { profile: true } } },
        orderBy: { createdAt: "desc" }
      },
      comments: {
        include: { user: { select: { profile: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!story) return { error: "Not found" };

  // Increment view count asynchronously
  prisma.story.update({
    where: { id: storyId },
    data: { viewCount: { increment: 1 } }
  }).then(async (updatedStory) => {
    // Milestone Check (e.g. every 50 views)
    if (updatedStory.viewCount > 0 && updatedStory.viewCount % 50 === 0) {
      await createNotification(
        updatedStory.authorId,
        "MILESTONE",
        `Congratulations! Your story "${updatedStory.title}" just hit ${updatedStory.viewCount} views!`,
        `/read/${storyId}`
      );
    }
  }).catch(console.error);

  let isFollowing = false;
  let userReview = null;

  if (session?.user?.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: story.authorId
        }
      }
    });
    isFollowing = !!follow;

    userReview = story.reviews.find((r: any) => r.userId === session.user.id);
  }

  const totalRating = story.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const avgRating = story.reviews.length > 0 ? (totalRating / story.reviews.length).toFixed(1) : 0;

  return { 
    story: { ...story, avgRating: Number(avgRating) }, 
    isFollowing,
    userReview 
  };
}

export async function submitReview(storyId: string, rating: number, text: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Upsert review
  const existing = await prisma.review.findFirst({
    where: { storyId, userId: session.user.id }
  });

  if (existing) {
    await prisma.review.update({
      where: { id: existing.id },
      data: { rating, text }
    });
  } else {
    await prisma.review.create({
      data: {
        storyId,
        userId: session.user.id,
        rating,
        text
      }
    });
    
    // Notify Author
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (story && story.authorId !== session.user.id) {
      await createNotification(
        story.authorId,
        "REVIEW",
        `Someone just reviewed your story "${story.title}" and gave it ${rating} stars!`,
        `/read/${storyId}`
      );
    }
  }

  return { success: true };
}

export async function submitComment(text: string, storyId?: string, chapterId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.comment.create({
    data: {
      text,
      userId: session.user.id,
      storyId: storyId || null,
      chapterId: chapterId || null
    }
  });

  // Notify Author
  let targetStoryId = storyId;
  if (!targetStoryId && chapterId) {
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    targetStoryId = chapter?.storyId;
  }
  
  if (targetStoryId) {
    const story = await prisma.story.findUnique({ where: { id: targetStoryId } });
    if (story && story.authorId !== session.user.id) {
      await createNotification(
        story.authorId,
        "COMMENT",
        `Someone commented on your story "${story.title}".`,
        `/read/${targetStoryId}`
      );
    }
  }

  return { success: true };
}

export async function toggleFollow(writerId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (session.user.id === writerId) return { error: "Cannot follow yourself" };

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: writerId
      }
    }
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { isFollowing: false };
  } else {
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: writerId
      }
    });

    const follower = await prisma.user.findUnique({ where: { id: session.user.id }, include: { profile: true } });
    await createNotification(
      writerId,
      "FOLLOW",
      `@${follower?.profile?.username} started following you!`,
      `/profile/${follower?.profile?.username}`
    );

    return { isFollowing: true };
  }
}

export async function incrementChapterView(chapterId: string) {
  try {
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { viewCount: { increment: 1 } }
    });
    return { success: true };
  } catch (e) {
    return { error: "Failed to increment chapter view" };
  }
}

export async function logReadHistory(storyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false };

  try {
    await prisma.readHistory.upsert({
      where: {
        userId_storyId: {
          userId: session.user.id,
          storyId: storyId
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        storyId: storyId
      }
    });
    return { success: true };
  } catch (e) {
    console.error("Failed to log read history", e);
    return { success: false };
  }
}

export async function getSpotlightData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Story of the Week (or All Time)
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    include: {
      author: { include: { profile: true } },
      genres: true,
      reviews: true
    }
  });

  let storyOfTheWeek = null;
  let isAllTimeStory = true;

  if (stories.length > 0) {
    let totalReviewSum = 0;
    let totalReviews = 0;
    stories.forEach(s => {
      s.reviews.forEach(r => {
        totalReviewSum += r.rating;
        totalReviews++;
      });
    });
    
    const C = totalReviews > 0 ? totalReviewSum / totalReviews : 3;
    const m = 2; // threshold

    const scoredStories = stories.map(s => {
      // 7-day stats
      const recentReviews = s.reviews.filter(r => r.createdAt >= sevenDaysAgo);
      const recentV = recentReviews.length;
      const recentR = recentV > 0 ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentV : 0;
      const recentScore = (recentV / (recentV + m)) * recentR + (m / (recentV + m)) * C;

      // All-time stats
      const allV = s.reviews.length;
      const allR = allV > 0 ? s.reviews.reduce((sum, r) => sum + r.rating, 0) / allV : 0;
      const allScore = (allV / (allV + m)) * allR + (m / (allV + m)) * C;

      return {
        ...s,
        recentScore,
        recentV,
        allScore,
        allR
      };
    });

    const recentCandidates = scoredStories.filter(s => s.recentV > 0).sort((a, b) => b.recentScore - a.recentScore);
    
    if (recentCandidates.length > 0) {
      storyOfTheWeek = recentCandidates[0];
      isAllTimeStory = false;
    } else {
      scoredStories.sort((a, b) => b.allScore - a.allScore);
      storyOfTheWeek = scoredStories[0];
    }
  }

  // 2. Trending Writer (or All Time)
  const writers = await prisma.user.findMany({
    where: { role: "WRITER" },
    include: {
      profile: true,
      followers: true
    }
  });

  let trendingWriter = null;
  let isAllTimeWriter = true;
  let writerStat = "";

  if (writers.length > 0) {
    const writerFollows = writers.map(w => {
      const recentFollows = w.followers.filter(f => f.createdAt >= sevenDaysAgo).length;
      const allFollows = w.followers.length;
      return { ...w, recentFollows, allFollows };
    });

    const recentCandidates = writerFollows.filter(w => w.recentFollows > 0).sort((a, b) => b.recentFollows - a.recentFollows);
    if (recentCandidates.length > 0) {
      trendingWriter = recentCandidates[0];
      isAllTimeWriter = false;
      writerStat = `+${trendingWriter.recentFollows} follower${trendingWriter.recentFollows !== 1 ? 's' : ''} this week`;
    } else {
      writerFollows.sort((a, b) => b.allFollows - a.allFollows);
      trendingWriter = writerFollows[0];
      writerStat = `Top followed all time (${trendingWriter.allFollows})`;
    }
  }

  return {
    story: storyOfTheWeek ? {
      id: storyOfTheWeek.id,
      title: storyOfTheWeek.title,
      author: storyOfTheWeek.author.profile?.username,
      avatarUrl: storyOfTheWeek.author.profile?.avatarUrl,
      genre: storyOfTheWeek.genres[0]?.name || "Uncategorized",
      rating: storyOfTheWeek.allR.toFixed(1),
      isAllTime: isAllTimeStory
    } : null,
    writer: trendingWriter ? {
      id: trendingWriter.id,
      username: trendingWriter.profile?.username,
      avatarUrl: trendingWriter.profile?.avatarUrl,
      stat: writerStat,
      isAllTime: isAllTimeWriter
    } : null
  };
}
