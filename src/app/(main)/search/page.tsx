"use client";

import { useState, useEffect } from "react";
import { globalSearch } from "@/app/actions/search";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Search, Star, PenTool, BookOpen, Hash } from "lucide-react";
import Link from "next/link";
import styles from "./search.module.css";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    stories: any[];
    writers: any[];
    tags: any[];
    genres: any[];
  }>({ stories: [], writers: [], tags: [], genres: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length === 0) {
        setResults({ stories: [], writers: [], tags: [], genres: [] });
        return;
      }
      setLoading(true);
      const res = await globalSearch(query);
      if (!res.error) {
        setResults(res as any);
      }
      setLoading(false);
    };

    const debounce = setTimeout(() => fetchResults(), 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const hasResults = results.stories.length > 0 || results.writers.length > 0 || results.tags.length > 0 || results.genres.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.searchWrap}>
          <Search size={24} className={styles.searchIcon} />
          <input
            autoFocus
            type="text"
            placeholder="Search stories, writers, tags, or genres..."
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.resultsContainer}>
        {loading && <p className={styles.loadingText}>Searching...</p>}
        
        {!loading && query.trim().length > 0 && !hasResults && (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <h2>No results found</h2>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}

        {!loading && hasResults && (
          <div className={styles.resultsGrid}>
            
            {/* WRITERS */}
            {results.writers.length > 0 && (
              <section className={styles.resultGroup}>
                <h3 className={styles.groupTitle}><PenTool size={18} /> Writers</h3>
                <div className={styles.writersList}>
                  {results.writers.map(writer => (
                    <Link key={writer.id} href={`/profile/${writer.profile.username}`} className={styles.writerCardLink}>
                      <Card className={styles.writerCard}>
                        <Avatar url={writer.profile.avatarUrl} name={writer.profile.username} size={48} />
                        <div className={styles.writerInfo}>
                          <h4 className={styles.writerName}>{writer.profile.fullName}</h4>
                          <p className={styles.writerUsername}>@{writer.profile.username}</p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* STORIES */}
            {results.stories.length > 0 && (
              <section className={styles.resultGroup}>
                <h3 className={styles.groupTitle}><BookOpen size={18} /> Stories</h3>
                <div className={styles.storiesList}>
                  {results.stories.map(story => (
                    <Link key={story.id} href={`/read/${story.id}`} className={styles.storyCardLink}>
                      <Card className={styles.storyCard}>
                        <div className={styles.storyHeader}>
                          <h4 className={styles.storyTitle}>{story.title}</h4>
                          <div className={styles.ratingBadge}>
                            <Star size={14} className={styles.starIcon} />
                            <span>{story.avgRating > 0 ? story.avgRating : 'New'}</span>
                          </div>
                        </div>
                        <p className={styles.authorLine}>by @{story.author.profile.username}</p>
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
              </section>
            )}

            {/* TAGS & GENRES */}
            {(results.tags.length > 0 || results.genres.length > 0) && (
              <section className={styles.resultGroup}>
                <h3 className={styles.groupTitle}><Hash size={18} /> Tags & Genres</h3>
                <div className={styles.tagsList}>
                  {results.genres.map(genre => (
                    <Link key={genre.id} href={`/read?genre=${encodeURIComponent(genre.name)}`} className={styles.genrePillLink}>
                      {genre.name}
                    </Link>
                  ))}
                  {results.tags.map(tag => (
                    <Link key={tag.id} href={`/read?tag=${encodeURIComponent(tag.name)}`} className={styles.tagPillLink}>
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
