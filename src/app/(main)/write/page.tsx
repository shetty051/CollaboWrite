"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getStories, getPendingInvites, respondToInvite, unpublishStory, deleteStory, withdrawCoAuthorship, removeCoAuthor } from "@/app/actions/write";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import StoryEditor from "./StoryEditor";
import styles from "./write.module.css";
import { Plus, Clock, Book, Bell, Check, X, MoreVertical } from "lucide-react";

export default function WritePage() {
  const { data: session } = useSession();
  const [stories, setStories] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [managingStory, setManagingStory] = useState<any | null>(null);
  
  // SPA State
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const fetchStoriesAndGenres = async () => {
    setLoading(true);
    
    const [storiesRes, invitesRes] = await Promise.all([
      getStories(),
      getPendingInvites()
    ]);

    if (storiesRes.stories) setStories(storiesRes.stories);
    if (storiesRes.genres) setGenres(storiesRes.genres);
    if (invitesRes.invites) setInvites(invitesRes.invites);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchStoriesAndGenres();
  }, []);

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    await respondToInvite(inviteId, accept);
    fetchStoriesAndGenres(); // refresh list
  };

  const handleBack = () => {
    setActiveStory(null);
    setIsCreatingNew(false);
    fetchStoriesAndGenres(); // Refresh list after potential edits
  };

  const toggleMenu = (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === storyId ? null : storyId);
  };

  const handleAction = async (e: React.MouseEvent, action: string, story: any) => {
    e.stopPropagation();
    setActiveMenu(null);
    
    if (action === "unpublish") {
      await unpublishStory(story.id);
      fetchStoriesAndGenres();
    } else if (action === "delete") {
      if (window.confirm("Are you sure you want to permanently delete this story and all its chapters? This cannot be undone.")) {
        await deleteStory(story.id);
        fetchStoriesAndGenres();
      }
    } else if (action === "withdraw") {
      if (window.confirm("Are you sure you want to withdraw from this story? You will lose edit access.")) {
        await withdrawCoAuthorship(story.id);
        fetchStoriesAndGenres();
      }
    } else if (action === "manage") {
      setManagingStory(story);
    }
  };

  const handleRemoveCoAuthor = async (userId: string) => {
    if (managingStory && window.confirm("Are you sure you want to remove this co-author?")) {
      await removeCoAuthor(managingStory.id, userId);
      // update local state so UI refreshes without heavy refetch
      setManagingStory({
        ...managingStory,
        coAuthors: managingStory.coAuthors.filter((ca: any) => ca.userId !== userId)
      });
      fetchStoriesAndGenres();
    }
  };

  const handleNewStory = () => {
    setActiveStory(null);
    setIsCreatingNew(true);
  };

  const handleEditStory = (story: any) => {
    setActiveStory(story);
    setIsCreatingNew(false);
  };

  if (isCreatingNew || activeStory) {
    return <StoryEditor 
      initialData={activeStory} 
      genres={genres}
      onBack={handleBack} 
    />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Stories</h1>
          <p className={styles.subtitle}>Manage your drafts and published works.</p>
        </div>
        <Button onClick={handleNewStory} variant="primary" className={styles.newBtn}>
          <Plus size={20} /> New Story
        </Button>
      </header>

      {invites.length > 0 && (
        <section className={styles.invitesSection}>
          <h2 className={styles.invitesTitle}><Bell size={20} /> Pending Invites ({invites.length})</h2>
          <div className={styles.invitesList}>
            {invites.map(invite => (
              <Card key={invite.id} className={styles.inviteCard}>
                <div className={styles.inviteInfo}>
                  <p>
                    <strong>@{invite.story.author.profile.username}</strong> invited you to co-author <strong>"{invite.story.title}"</strong>
                  </p>
                </div>
                <div className={styles.inviteActions}>
                  <Button variant="ghost" onClick={() => handleInviteResponse(invite.id, false)} className={styles.declineBtn}>
                    <X size={16} /> Decline
                  </Button>
                  <Button variant="primary" onClick={() => handleInviteResponse(invite.id, true)}>
                    <Check size={16} /> Accept
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p>Loading your stories...</p>
      ) : stories.length === 0 ? (
        <Card className={styles.emptyState}>
          <Book size={48} className={styles.emptyIcon} />
          <h2>No stories yet</h2>
          <p>Start your creative journey by writing your first story.</p>
          <Button onClick={handleNewStory} variant="primary">
            Create Story
          </Button>
        </Card>
      ) : (
        <div className={styles.storyList}>
          {stories.map(story => (
            <Card key={story.id} className={styles.storyCard} onClick={() => handleEditStory(story)}>
              <div className={styles.storyCardHeader}>
                <h3 className={styles.storyTitle}>{story.title}</h3>
                <div className={styles.badgesWrapper}>
                  {story.authorId !== session?.user?.id && (
                    <span className={`${styles.statusBadge} ${styles.coAuthorBadge}`}>Co-Author</span>
                  )}
                  <span className={`${styles.statusBadge} ${story.status === 'PUBLISHED' ? styles.published : styles.draft}`}>
                    {story.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                  
                  <div className={styles.menuContainer}>
                    <button className={styles.menuBtn} onClick={(e) => toggleMenu(e, story.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === story.id && (
                      <div className={styles.dropdownMenu}>
                        {story.status === 'PUBLISHED' && (
                          <button onClick={(e) => handleAction(e, 'unpublish', story)}>Unpublish</button>
                        )}
                        {story.authorId === session?.user?.id ? (
                          <>
                            {story.coAuthors && story.coAuthors.length > 0 && (
                              <button onClick={(e) => handleAction(e, 'manage', story)}>Manage Co-Authors</button>
                            )}
                            <button className={styles.dangerText} onClick={(e) => handleAction(e, 'delete', story)}>Delete</button>
                          </>
                        ) : (
                          <button className={styles.dangerText} onClick={(e) => handleAction(e, 'withdraw', story)}>Withdraw</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={styles.storyMeta}>
                <span className={styles.formatLabel}>
                  {story.format === 'SERIALIZED' ? 'Serialized' : 'Single Story'}
                </span>
                
                {story.genres.length > 0 && (
                  <div className={styles.genreTags}>
                    {story.genres.map((g: any) => (
                      <span key={g.id} className={styles.genreTag}>{g.name}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.storyFooter}>
                <Clock size={14} />
                <span>Last updated: {new Date(story.updatedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {managingStory && (
        <div className={styles.modalOverlay} onClick={() => setManagingStory(null)}>
          <Card className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Manage Co-Authors</h2>
              <button onClick={() => setManagingStory(null)} className={styles.closeModalBtn}><X size={20}/></button>
            </div>
            <p className={styles.modalSubtitle}>Story: {managingStory.title}</p>
            
            <div className={styles.manageList}>
              {managingStory.coAuthors.length === 0 ? (
                <p>No active co-authors.</p>
              ) : (
                managingStory.coAuthors.map((ca: any) => (
                  <div key={ca.userId} className={styles.manageRow}>
                    <span>@{ca.user.profile.username} ({ca.status})</span>
                    <Button variant="ghost" onClick={() => handleRemoveCoAuthor(ca.userId)} className={styles.dangerText}>
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
