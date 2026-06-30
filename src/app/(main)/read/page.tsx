"use client";

import { useState, useEffect, Suspense } from "react";
import { getPublishedStories } from "@/app/actions/read";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";
import styles from "./read.module.css";
import { Search, Star, BookOpen } from "lucide-react";
import Link from "next/link";

function ReadPageContent() {
  const searchParams = useSearchParams();
  const initGenre = searchParams.get("genre");
  const initTag = searchParams.get("tag");

  const [stories, setStories] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(initTag ? [initTag] : []);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    if (initGenre && genres.length > 0) {
      const g = genres.find(x => x.name === initGenre);
      if (g && !selectedGenres.includes(g.id)) {
        setSelectedGenres(prev => [...prev, g.id]);
      }
    }
  }, [initGenre, genres]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const res = await getPublishedStories(selectedGenres, selectedTags, search, sort);
      if (res.stories) setStories(res.stories);
      if (res.genres) setGenres(res.genres);
      setLoading(false);
    }, 300); // Debounce search

    return () => clearTimeout(delayDebounce);
  }, [search, selectedGenres, selectedTags, sort]);

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const addTagFilter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagSearch.trim()) {
      e.preventDefault();
      const newTag = tagSearch.trim();
      if (!selectedTags.includes(newTag)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      setTagSearch("");
    }
  };

  const removeTagFilter = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Discover Stories</h1>
        <p className={styles.subtitle}>Find your next favorite read from our community of writers.</p>
      </header>

      <section className={styles.controlsSection}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search titles or authors..." 
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className={styles.sortWrap}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={styles.sortSelect}>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="rated">Highest Rated</option>
          </select>
        </div>
      </section>

      <section className={styles.genresSection}>
        {genres.map(genre => (
          <button 
            key={genre.id} 
            className={`${styles.genrePill} ${selectedGenres.includes(genre.id) ? styles.activeGenre : ''}`}
            onClick={() => toggleGenre(genre.id)}
          >
            {genre.name}
          </button>
        ))}
      </section>

      <section className={styles.controlsSection} style={{ marginTop: '0', paddingTop: '0', borderTop: 'none' }}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Filter by tag (press Enter)..." 
            className={styles.searchInput}
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            onKeyDown={addTagFilter}
          />
        </div>
        
        {selectedTags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '16px' }}>
            {selectedTags.map(tag => (
              <span key={tag} className={`${styles.genrePill} ${styles.activeGenre}`}>
                #{tag}
                <button onClick={() => removeTagFilter(tag)} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className={styles.loading}>Loading stories...</div>
      ) : stories.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} className={styles.emptyIcon} />
          <h2>No stories found</h2>
          <p>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className={styles.storyGrid}>
          {stories.map(story => (
            <Link key={story.id} href={`/read/${story.id}`} className={styles.storyLink}>
              <Card className={styles.storyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.storyTitle}>{story.title}</h3>
                  <div className={styles.ratingBadge}>
                    <Star size={14} className={styles.starIcon} />
                    <span>{story.avgRating > 0 ? story.avgRating : 'New'}</span>
                  </div>
                </div>
                
                <p className={styles.authorLine}>
                  by @{story.author.profile.username}
                  {story.coAuthors.length > 0 && ` +${story.coAuthors.length}`}
                </p>

                <div className={styles.genreTags}>
                  {story.genres.map((g: any) => (
                    <span key={g.id} className={styles.genreTag}>{g.name}</span>
                  ))}
                  {story.tags && story.tags.map((t: any) => (
                    <span key={t.id} className={styles.genreTag} style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>#{t.name}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading page...</div>}>
      <ReadPageContent />
    </Suspense>
  );
}
