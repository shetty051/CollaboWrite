"use client";

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/app/actions/leaderboard";
import { Card } from "@/components/ui/Card/Card";
import styles from "./leaderboard.module.css";
import { Trophy, Star, BookOpen, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const data = await getLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading leaderboard...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <Trophy size={36} className={styles.headerIcon} />
          <h1 className={styles.title}>Top Writers</h1>
        </div>
        <p className={styles.subtitle}>Discover the most acclaimed authors on CollaboWrite, ranked by reader feedback.</p>
      </header>

      <Card className={styles.tableCard}>
        {leaderboard.length === 0 ? (
          <div className={styles.emptyState}>
            No writers have published stories yet.
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rankCol}>Rank</th>
                  <th>Writer</th>
                  <th className={styles.numberCol}><BookOpen size={16} /> Published</th>
                  <th className={styles.numberCol}><Eye size={16} /> Total Reads</th>
                  <th className={styles.numberCol}><Star size={16} /> Rating Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((writer, index) => (
                  <tr key={writer.id} className={index < 3 ? styles.topRow : ""}>
                    <td className={styles.rankCol}>
                      {index === 0 && <span className={styles.goldMedal}>🥇 1</span>}
                      {index === 1 && <span className={styles.silverMedal}>🥈 2</span>}
                      {index === 2 && <span className={styles.bronzeMedal}>🥉 3</span>}
                      {index > 2 && <span>{index + 1}</span>}
                    </td>
                    <td className={styles.usernameCol}>
                      <Avatar url={writer.avatarUrl} name={writer.username} size={32} />
                      <div className={styles.writerInfo}>
                        <span>@{writer.username}</span>
                        <span className={styles.reviewCount}>({writer.totalReviews} reviews)</span>
                      </div>
                    </td>
                    <td className={styles.numberCol}>{writer.publishedCount}</td>
                    <td className={styles.numberCol}>{writer.totalReads.toLocaleString()}</td>
                    <td className={styles.numberCol}>
                      {writer.weightedRating !== null ? (
                        <span className={styles.ratingScore}>{writer.weightedRating.toFixed(2)}</span>
                      ) : (
                        <span className={styles.ratingScore} style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>Unrated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
