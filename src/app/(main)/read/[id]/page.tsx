"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStoryDetails, toggleFollow, submitReview, submitComment, incrementChapterView, logReadHistory } from "@/app/actions/read";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import styles from "./reader.module.css";
import { Star, MessageSquare, UserPlus, UserCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";

export default function StoryReader() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"REVIEWS" | "COMMENTS">("REVIEWS");
  
  // Review form
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Comment form
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchDetails = async () => {
    const res = await getStoryDetails(id as string);
    if (res.story) {
      setData(res);
      logReadHistory(res.story.id);
      if (res.userReview) {
        setRating(res.userReview.rating);
        setReviewText(res.userReview.text || "");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (data?.story?.format === "SERIALIZED" && data?.story?.chapters?.[activeChapterIdx]) {
      incrementChapterView(data.story.chapters[activeChapterIdx].id);
    }
  }, [activeChapterIdx, data?.story?.id]);

  if (loading) return <div className={styles.loading}>Loading story...</div>;
  if (!data?.story) return <div className={styles.loading}>Story not found.</div>;

  const { story, isFollowing } = data;
  const isSerialized = story.format === "SERIALIZED";
  const currentChapter = story.chapters[activeChapterIdx];

  // Filtering comments: If serialized, show chapter comments. If single, show story comments.
  const relevantComments = isSerialized
    ? story.comments.filter((c: any) => c.chapterId === currentChapter?.id)
    : story.comments.filter((c: any) => !c.chapterId);

  const handleFollow = async () => {
    setData({ ...data, isFollowing: !isFollowing }); // optimistic
    await toggleFollow(story.authorId);
    fetchDetails(); // refresh real state
  };

  const handleReviewSubmit = async () => {
    if (rating === 0) return alert("Please select a star rating");
    setSubmittingReview(true);
    await submitReview(story.id, rating, reviewText);
    setSubmittingReview(false);
    fetchDetails();
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await submitComment(
      commentText,
      isSerialized ? undefined : story.id,
      isSerialized ? currentChapter?.id : undefined
    );
    setCommentText("");
    setSubmittingComment(false);
    fetchDetails();
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{story.title}</h1>
          <div className={styles.headerRating}>
            <Star size={20} className={styles.starIconFilled} />
            <span className={styles.avgRating}>{story.avgRating > 0 ? story.avgRating : 'New'}</span>
            <span className={styles.reviewCount}>({story.reviews.length} reviews)</span>
          </div>
        </div>
        
        {story.subtitle && <p className={styles.subtitle}>{story.subtitle}</p>}
        
        <div className={styles.authorBar}>
          <div className={styles.authorInfo}>
            <Avatar url={story.author.profile.avatarUrl} name={story.author.profile.username} size={32} />
            <div className={styles.authorText}>
              <span className={styles.authorName}>By @{story.author.profile.username}</span>
              {story.coAuthors.length > 0 && (
                <span className={styles.coAuthorsList}>
                  & {story.coAuthors.map((ca: any) => `@${ca.user.profile.username}`).join(", ")}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant={isFollowing ? "ghost" : "primary"} 
            className={styles.followBtn}
            onClick={handleFollow}
          >
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? "Following" : "Follow Writer"}
          </Button>
        </div>
        
        <div className={styles.genreTags}>
          {story.genres.map((g: any) => (
            <span key={g.id} className={styles.genreTag}>{g.name}</span>
          ))}
          {story.tags && story.tags.map((t: any) => (
            <span key={t.id} className={styles.genreTag} style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>#{t.name}</span>
          ))}
        </div>
      </header>

      {/* Reader Layout */}
      <div className={styles.readerLayout}>
        {/* Sidebar for Serialized navigation */}
        {isSerialized && (
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Chapters</h3>
            <div className={styles.chapterList}>
              {story.chapters.map((chap: any, idx: number) => (
                <button
                  key={chap.id}
                  className={`${styles.chapterLink} ${idx === activeChapterIdx ? styles.activeChapter : ''}`}
                  onClick={() => setActiveChapterIdx(idx)}
                >
                  <span className={styles.chapterNum}>{idx + 1}.</span>
                  <span className={styles.chapterTitle}>{chap.title || `Chapter ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Content Area */}
        <main className={styles.contentArea}>
          <Card className={styles.readerCard}>
            {isSerialized && currentChapter && (
              <h2 className={styles.chapterHeader}>{currentChapter.title || `Chapter ${activeChapterIdx + 1}`}</h2>
            )}
            
            <div 
              className={`${styles.textContent} ${styles.unselectable}`}
              onContextMenu={(e) => e.preventDefault()}
            >
              {currentChapter ? (
                /<[a-z][\s\S]*>/i.test(currentChapter.content) ? (
                  <div dangerouslySetInnerHTML={{ __html: currentChapter.content }} />
                ) : (
                  currentChapter.content.split('\n').map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))
                )
              ) : (
                <p className={styles.emptyText}>No content available.</p>
              )}
            </div>

            {isSerialized && (
              <div className={styles.chapterNav}>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveChapterIdx(Math.max(0, activeChapterIdx - 1))}
                  disabled={activeChapterIdx === 0}
                >
                  <ChevronLeft size={16} /> Previous
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveChapterIdx(Math.min(story.chapters.length - 1, activeChapterIdx + 1))}
                  disabled={activeChapterIdx === story.chapters.length - 1}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </Card>

          {/* Interaction Zone */}
          <section className={styles.interactionZone}>
            <div className={styles.tabs}>
              <button 
                className={`${styles.tabBtn} ${activeTab === "REVIEWS" ? styles.activeTab : ''}`}
                onClick={() => setActiveTab("REVIEWS")}
              >
                <Star size={16} /> Story Reviews ({story.reviews.length})
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === "COMMENTS" ? styles.activeTab : ''}`}
                onClick={() => setActiveTab("COMMENTS")}
              >
                <MessageSquare size={16} /> {isSerialized ? 'Chapter' : 'Story'} Comments ({relevantComments.length})
              </button>
            </div>

            <Card className={styles.interactionCard}>
              {activeTab === "REVIEWS" ? (
                <div className={styles.reviewsArea}>
                  <div className={styles.reviewForm}>
                    <h4>{data.userReview ? "Update your review" : "Leave a review"}</h4>
                    <div className={styles.starWidget}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className={styles.starBtn}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          <Star 
                            size={24} 
                            className={(hoverRating || rating) >= star ? styles.starIconFilled : styles.starIconEmpty} 
                          />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      className={styles.reviewInput}
                      placeholder="What did you think of the story?"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <Button onClick={handleReviewSubmit} disabled={submittingReview}>
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>

                  <div className={styles.list}>
                    {story.reviews.map((rev: any) => (
                      <div key={rev.id} className={styles.listItem}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemUser}>
                            <Avatar url={rev.user.profile.avatarUrl} name={rev.user.profile.username} size={24} />
                            <strong>@{rev.user.profile.username}</strong>
                          </div>
                          <div className={styles.miniRating}>
                            <Star size={12} className={styles.starIconFilled} /> {rev.rating}
                          </div>
                        </div>
                        {rev.text && <p className={styles.itemText}>{rev.text}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.commentsArea}>
                  <div className={styles.commentForm}>
                    <Input 
                      placeholder={isSerialized ? "Comment on this chapter..." : "Comment on this story..."}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <Button onClick={handleCommentSubmit} disabled={submittingComment || !commentText.trim()}>
                      Post
                    </Button>
                  </div>
                  
                  <div className={styles.list}>
                    {relevantComments.map((comment: any) => (
                      <div key={comment.id} className={styles.listItem}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemUser}>
                            <Avatar url={comment.user.profile.avatarUrl} name={comment.user.profile.username} size={24} />
                            <strong>@{comment.user.profile.username}</strong>
                          </div>
                          <span className={styles.date}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className={styles.itemText}>{comment.text}</p>
                      </div>
                    ))}
                    {relevantComments.length === 0 && (
                      <p className={styles.emptyText}>No comments yet. Be the first to start the discussion!</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
