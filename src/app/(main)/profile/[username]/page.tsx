"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicProfile } from "@/app/actions/profile";
import { Card } from "@/components/ui/Card/Card";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Star, BookOpen, PenTool } from "lucide-react";
import Link from "next/link";
import styles from "./publicProfile.module.css";

export default function PublicProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await getPublicProfile(username as string);
      if (!res.error) {
        setData(res);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  if (loading) return <div className={styles.loading}>Loading profile...</div>;
  if (!data) return <div className={styles.loading}>User not found.</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Avatar url={data.user.avatarUrl} name={data.user.username} size={100} />
        <div className={styles.userInfo}>
          <h1 className={styles.fullName}>{data.user.fullName}</h1>
          <p className={styles.username}>@{data.user.username}</p>
          <div className={styles.meta}>
            <span className={styles.roleTag}>
              {data.user.role === "WRITER" ? <PenTool size={14} /> : <BookOpen size={14} />}
              {data.user.role === "WRITER" ? "Writer" : "Reader"}
            </span>
            <span>Joined {new Date(data.user.joinedAt).toLocaleDateString()}</span>
            <span>{data.user.followersCount} Followers</span>
          </div>
        </div>
      </header>

      <section className={styles.storiesSection}>
        <h2 className={styles.sectionTitle}>
          Published Stories ({data.stories.length})
        </h2>
        
        {data.stories.length === 0 ? (
          <p className={styles.emptyText}>This user hasn't published any stories yet.</p>
        ) : (
          <div className={styles.storiesGrid}>
            {data.stories.map((story: any) => (
              <Link key={story.id} href={`/read/${story.id}`} className={styles.storyCardLink}>
                <Card className={styles.storyCard}>
                  <div className={styles.storyHeader}>
                    <h3 className={styles.storyTitle}>{story.title}</h3>
                    <div className={styles.ratingBadge}>
                      <Star size={14} className={styles.starIcon} />
                      <span>{story.avgRating > 0 ? story.avgRating : 'New'}</span>
                    </div>
                  </div>
                  <div className={styles.tagsWrap}>
                    {story.genres.map((g: any) => (
                      <span key={g.id} className={styles.genrePill}>{g.name}</span>
                    ))}
                    {story.tags.map((t: any) => (
                      <span key={t.id} className={styles.tagPill}>#{t.name}</span>
                    ))}
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
