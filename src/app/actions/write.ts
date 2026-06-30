"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createNotification } from "./notifications";

export async function getStories() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const stories = await prisma.story.findMany({
    where: {
      OR: [
        { authorId: session.user.id },
        { coAuthors: { some: { userId: session.user.id, status: "ACCEPTED" } } }
      ]
    },
    include: {
      genres: true,
      chapters: {
        orderBy: { order: "asc" }
      },
      coAuthors: {
        include: { user: { include: { profile: true } } }
      },
      tags: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" }
  });

  return { stories, genres };
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return { users: [] };

  const users = await prisma.profile.findMany({
    where: {
      username: {
        contains: query
      }
    },
    take: 5,
    select: {
      userId: true,
      username: true,
      fullName: true
    }
  });

  return { users };
}

export async function saveStory(data: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { id, title, subtitle, format, status, genreIds, tagNames = [], chapters, coAuthorIds } = data;

  try {
    if (id) {
      const existing = await prisma.story.findUnique({
        where: { id },
        include: { coAuthors: true }
      });
      if (!existing) return { error: "Not found" };
      
      const isAuthor = existing.authorId === session.user.id;
      const isAcceptedCoAuthor = existing.coAuthors.some((ca: any) => ca.userId === session.user.id && ca.status === "ACCEPTED");
      
      if (!isAuthor && !isAcceptedCoAuthor) {
        return { error: "Forbidden" };
      }
    }

    const story = await prisma.story.upsert({
      where: { id: id || "new-story" }, // upsert needs a valid ID if checking existing, but we'll handle create/update conditionally
      update: {
        title,
        subtitle,
        format,
        status,
        genres: {
          set: genreIds.map((gId: string) => ({ id: gId }))
        },
        tags: {
          set: [],
          connectOrCreate: tagNames.map((name: string) => ({
            where: { name },
            create: { name }
          }))
        }
      },
      create: {
        title,
        subtitle,
        format,
        status,
        authorId: session.user.id,
        genres: {
          connect: genreIds.map((gId: string) => ({ id: gId }))
        },
        tags: {
          connectOrCreate: tagNames.map((name: string) => ({
            where: { name },
            create: { name }
          }))
        }
      }
    });

    // Handle chapters
    // Delete existing chapters not in the incoming list (if updating)
    if (id) {
      const incomingChapterIds = chapters.filter((c: any) => c.id).map((c: any) => c.id);
      await prisma.chapter.deleteMany({
        where: {
          storyId: story.id,
          id: { notIn: incomingChapterIds }
        }
      });
    }

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (chapter.id) {
        await prisma.chapter.update({
          where: { id: chapter.id },
          data: {
            title: chapter.title,
            content: chapter.content,
            order: i,
            status: chapter.status
          }
        });
      } else {
        await prisma.chapter.create({
          data: {
            storyId: story.id,
            title: chapter.title,
            content: chapter.content,
            order: i,
            status: chapter.status
          }
        });
      }
    }

    // Handle co-authors
    if (id) {
      // Fetch current invites
      const currentInvites = await prisma.coAuthorInvite.findMany({ where: { storyId: story.id } });
      const incomingIds = new Set(coAuthorIds);

      // Delete removed users
      for (const invite of currentInvites) {
        if (!incomingIds.has(invite.userId)) {
          await prisma.coAuthorInvite.delete({ where: { id: invite.id } });
        }
      }

      // Add new users
      const currentIds = new Set(currentInvites.map((i: any) => i.userId));
      for (const uId of coAuthorIds) {
        if (!currentIds.has(uId)) {
          await prisma.coAuthorInvite.create({
            data: { storyId: story.id, userId: uId as string, status: "PENDING" }
          });
          const authorProfile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
          await createNotification(
            uId as string,
            "INVITE",
            `@${authorProfile?.username} invited you to co-author "${story.title}"`,
            `/write`
          );
        }
      }
    } else {
      // New story, just create
      for (const uId of coAuthorIds) {
        await prisma.coAuthorInvite.create({
          data: { storyId: story.id, userId: uId as string, status: "PENDING" }
        });
        const authorProfile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
        await createNotification(
          uId as string,
          "INVITE",
          `@${authorProfile?.username} invited you to co-author "${story.title}"`,
          `/write`
        );
      }
    }

    return { success: true, storyId: story.id };
  } catch (error: any) {
    console.error("Save story error:", error);
    return { error: error.message };
  }
}

export async function getPendingInvites() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const invites = await prisma.coAuthorInvite.findMany({
    where: { userId: session.user.id, status: "PENDING" },
    include: {
      story: {
        select: { title: true, author: { select: { profile: true } } }
      }
    }
  });

  return { invites };
}

export async function respondToInvite(inviteId: string, accept: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const invite = await prisma.coAuthorInvite.findUnique({ 
    where: { id: inviteId },
    include: { story: true, user: { include: { profile: true } } }
  });

  if (!invite) return { error: "Invite not found" };

  if (accept) {
    await prisma.coAuthorInvite.update({
      where: { id: inviteId },
      data: { status: "ACCEPTED" }
    });
    await createNotification(
      invite.story.authorId,
      "INVITE",
      `@${invite.user.profile?.username} accepted your co-author invite for "${invite.story.title}"`,
      `/write`
    );
  } else {
    // Delete the invite if declined
    await prisma.coAuthorInvite.delete({
      where: { id: inviteId }
    });
    await createNotification(
      invite.story.authorId,
      "INVITE",
      `@${invite.user.profile?.username} declined your co-author invite for "${invite.story.title}"`,
      `/write`
    );
  }

  return { success: true };
}

export async function unpublishStory(storyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = await prisma.story.findUnique({
    where: { id: storyId },
    include: { coAuthors: true }
  });
  if (!existing) return { error: "Not found" };

  const isAuthor = existing.authorId === session.user.id;
  const isAcceptedCoAuthor = existing.coAuthors.some((ca: any) => ca.userId === session.user.id && ca.status === "ACCEPTED");

  if (!isAuthor && !isAcceptedCoAuthor) return { error: "Forbidden" };

  await prisma.story.update({
    where: { id: storyId },
    data: { status: "DRAFT" }
  });
  return { success: true };
}

export async function deleteStory(storyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = await prisma.story.findUnique({ where: { id: storyId } });
  if (!existing) return { error: "Not found" };
  if (existing.authorId !== session.user.id) return { error: "Forbidden" };

  await prisma.story.delete({ where: { id: storyId } });
  return { success: true };
}

export async function withdrawCoAuthorship(storyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.coAuthorInvite.deleteMany({
    where: {
      storyId: storyId,
      userId: session.user.id
    }
  });
  return { success: true };
}

export async function removeCoAuthor(storyId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = await prisma.story.findUnique({ where: { id: storyId } });
  if (!existing) return { error: "Not found" };
  if (existing.authorId !== session.user.id) return { error: "Forbidden" };

  await prisma.coAuthorInvite.deleteMany({
    where: {
      storyId: storyId,
      userId: userId
    }
  });
  return { success: true };
}
