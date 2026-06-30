import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSpotlightData } from "@/app/actions/read";
import { getReaderRecommendations } from "@/app/actions/recommendations";
import styles from "./page.module.css";
import { Card } from "@/components/ui/Card/Card";
import { BookOpen, Star, PenTool, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";

const WRITER_VIDEOS = [
  { id: "4PqGPZtyFtw", title: "Writer Video 1" },
  { id: "RSoRzTtwgP4", title: "Writer Video 2" },
  { id: "JwhouCNq-Fc", title: "Writer Video 3" },
  { id: "gQ58-GPaj2k", title: "Writer Video 4" },
  { id: "L-_RsshM54o", title: "Writer Video 5" },
  { id: "hZRQ2GzWdXw", title: "Writer Video 6" }
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  const latestStories = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    include: { 
      author: { include: { profile: true } },
      genres: true,
      tags: true,
      reviews: true
    },
    orderBy: { createdAt: "desc" },
    take: 4
  });

  const formattedStories = latestStories.map(story => {
    const avgRating = story.reviews.length > 0 
      ? parseFloat((story.reviews.reduce((sum, r) => sum + r.rating, 0) / story.reviews.length).toFixed(1))
      : 0;
    return {
      id: story.id,
      title: story.title,
      author: story.author.profile?.username || "Unknown",
      avatarUrl: story.author.profile?.avatarUrl,
      genre: story.genres[0]?.name || "Uncategorized",
      tags: story.tags || [],
      rating: avgRating
    };
  });

  const isWriter = session.user.role === "WRITER";
  const username = profile?.username || session.user.email;
  
  let spotlightData = null;
  let finalStories = formattedStories;
  let hasReadHistory = false;

  if (!isWriter) {
    spotlightData = await getSpotlightData();
    const recData = await getReaderRecommendations();
    finalStories = recData.stories;
    hasReadHistory = recData.hasHistory;
  }

  let feedSectionTitle = "Recommended for you";
  if (isWriter) {
    feedSectionTitle = "Stories from other writers";
  } else if (hasReadHistory) {
    feedSectionTitle = "Based on what you've read";
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Welcome back, {username}!</h1>
        <p className={styles.roleTag}>
          {isWriter ? <PenTool size={16} /> : <BookOpen size={16} />}
          {isWriter ? "Writer" : "Reader"} Account
        </p>
      </header>

      {isWriter ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Improve Your Craft</h2>
          <div className={styles.videoGrid}>
            {WRITER_VIDEOS.map(video => (
              <Card key={video.id} className={styles.videoCard}>
                <div className={styles.videoWrapper}>
                  <iframe 
                    src={`https://www.youtube.com/embed/${video.id}`} 
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className={styles.iframe}
                  ></iframe>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Community Spotlight</h2>
          <div className={styles.spotlightGrid}>
            <Card className={styles.spotlightCard}>
              <div className={styles.spotlightHeader}>
                <Trophy size={20} className={styles.spotlightIcon} />
                <h3>{spotlightData?.story?.isAllTime ? "Top Story (All Time)" : "Story of the Week"}</h3>
              </div>
              {spotlightData?.story ? (
                <div className={styles.spotlightContent}>
                  <h4 className={styles.spotlightTitle}>{spotlightData.story.title}</h4>
                  <div className={styles.storyAuthorWrapper}>
                    <Avatar url={spotlightData.story.avatarUrl} name={spotlightData.story.author} size={24} />
                    <p className={styles.spotlightAuthor}>by @{spotlightData.story.author}</p>
                  </div>
                  <div className={styles.spotlightMeta}>
                    <span className={styles.storyGenre}>{spotlightData.story.genre}</span>
                    <span className={styles.storyRating}>
                      <Star size={14} className={styles.starIcon} />
                      {spotlightData.story.rating}
                    </span>
                  </div>
                  <Link href={`/read/${spotlightData.story.id}`} className={styles.spotlightLink}>Read Now</Link>
                </div>
              ) : (
                <p className={styles.emptySpotlight}>No stories published yet.</p>
              )}
            </Card>

            <Card className={styles.spotlightCard}>
              <div className={styles.spotlightHeader}>
                <TrendingUp size={20} className={styles.spotlightIcon} />
                <h3>{spotlightData?.writer?.isAllTime ? "Top Writer (All Time)" : "Trending Writer"}</h3>
              </div>
              {spotlightData?.writer ? (
                <div className={styles.spotlightContent}>
                  <div className={styles.storyAuthorWrapper}>
                    <Avatar url={spotlightData.writer.avatarUrl} name={spotlightData.writer.username} size={32} />
                    <h4 className={styles.spotlightTitle}>@{spotlightData.writer.username}</h4>
                  </div>
                  <p className={styles.spotlightStat}>{spotlightData.writer.stat}</p>
                  <Link href={`/profile`} className={styles.spotlightLink}>View Leaderboard</Link>
                </div>
              ) : (
                <p className={styles.emptySpotlight}>No writers active yet.</p>
              )}
            </Card>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{feedSectionTitle}</h2>
        {finalStories.length === 0 ? (
          <p style={{color: 'var(--color-text-secondary)', fontStyle: 'italic'}}>No stories found.</p>
        ) : (
          <div className={styles.storyGrid}>
            {finalStories.map(story => (
              <Link key={story.id} href={`/read/${story.id}`} className={styles.storyLink}>
                <Card className={styles.storyCard}>
                  <div className={styles.storyContent}>
                    <h3 className={styles.storyTitle}>{story.title}</h3>
                    <div className={styles.storyAuthorWrapper}>
                      <Avatar url={story.avatarUrl} name={story.author} size={20} />
                      <p className={styles.storyAuthor}>by @{story.author}</p>
                    </div>
                    <div className={styles.storyMeta}>
                      <span className={styles.storyGenre}>{story.genre}</span>
                      {story.tags.slice(0, 2).map((t: any) => (
                        <span key={t.id} className={styles.storyGenre} style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>#{t.name}</span>
                      ))}
                      <span className={styles.storyRating}>
                        <Star size={14} className={styles.starIcon} />
                        {story.rating > 0 ? story.rating : 'New'}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
