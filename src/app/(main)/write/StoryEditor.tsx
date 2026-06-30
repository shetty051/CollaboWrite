"use client";

import { useState, useEffect } from "react";
import { saveStory, searchUsers } from "@/app/actions/write";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";
import { RichTextEditor } from "@/components/ui/RichTextEditor/RichTextEditor";
import styles from "./write.module.css";
import { ArrowLeft, X, Plus, Trash2 } from "lucide-react";

export default function StoryEditor({ initialData, genres, onBack }: { initialData: any, genres: any[], onBack: () => void }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || "");
  const [format, setFormat] = useState(initialData?.format || "SINGLE");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialData?.genres?.map((g: any) => g.id) || []
  );

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags?.map((t: any) => t.name) || []
  );
  const [customTagInput, setCustomTagInput] = useState("");
  
  const presetTags = ["Slow burn", "Enemies to lovers", "Unreliable narrator", "Plot twist", "Found family", "Multiple POV"];

  // Co-authors
  const [coAuthors, setCoAuthors] = useState<any[]>(
    initialData?.coAuthors?.map((ca: any) => ca.user) || []
  );
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Chapters
  const [chapters, setChapters] = useState<any[]>(
    initialData?.chapters || [{ title: "", content: "", status: "DRAFT" }]
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (userSearch.length >= 2) {
        const res = await searchUsers(userSearch);
        if (res.users) setSearchResults(res.users);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [userSearch]);

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const toggleTag = (name: string) => {
    setSelectedTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const addCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const newTag = customTagInput.trim();
      if (!selectedTags.includes(newTag)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      setCustomTagInput("");
    }
  };

  const addCoAuthor = (user: any) => {
    if (!coAuthors.find(u => u.id === user.userId)) {
      setCoAuthors([...coAuthors, { id: user.userId, profile: { username: user.username } }]);
    }
    setUserSearch("");
    setSearchResults([]);
  };

  const removeCoAuthor = (id: string) => {
    setCoAuthors(coAuthors.filter(u => u.id !== id));
  };

  const addChapter = () => {
    setChapters([...chapters, { title: "", content: "", status: "DRAFT" }]);
  };

  const updateChapter = (index: number, field: string, value: string) => {
    const newChapters = [...chapters];
    newChapters[index] = { ...newChapters[index], [field]: value };
    setChapters(newChapters);
  };

  const removeChapter = (index: number) => {
    if (chapters.length === 1) return; // Prevent removing last chapter
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    setSaving(true);
    
    // For single stories, apply the story status to the single chapter
    const finalChapters = format === "SINGLE" 
      ? [{ ...chapters[0], status }] 
      : chapters;

    const payload = {
      id: initialData?.id,
      title,
      subtitle,
      format,
      status, // The global story status
      genreIds: selectedGenres,
      tagNames: selectedTags,
      coAuthorIds: coAuthors.map(u => u.id),
      chapters: finalChapters
    };

    const res = await saveStory(payload);
    setSaving(false);
    if (res.success) {
      onBack();
    } else {
      alert("Error saving story: " + res.error);
    }
  };

  return (
    <div className={styles.editorPage}>
      <header className={styles.editorHeader}>
        <button onClick={onBack} className={styles.backBtn}>
          <ArrowLeft size={20} /> Back to stories
        </button>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => handleSave("DRAFT")} disabled={saving || !title}>
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button variant="primary" onClick={() => handleSave("PUBLISHED")} disabled={saving || !title}>
            {saving ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </header>

      <div className={styles.editorContent}>
        {/* Metadata Section */}
        <Card className={styles.metadataCard}>
          <Input 
            label="Story Title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Enter an engaging title..." 
            required 
          />
          <Input 
            label="Subtitle (Optional)" 
            value={subtitle} 
            onChange={(e) => setSubtitle(e.target.value)} 
            placeholder="A brief tagline..." 
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Format</label>
            <div className={styles.formatToggle}>
              <button 
                className={`${styles.formatBtn} ${format === 'SINGLE' ? styles.active : ''}`}
                onClick={() => setFormat('SINGLE')}
              >
                Single Story
              </button>
              <button 
                className={`${styles.formatBtn} ${format === 'SERIALIZED' ? styles.active : ''}`}
                onClick={() => setFormat('SERIALIZED')}
              >
                Serialized (Chapters)
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Genres</label>
            <div className={styles.genresGrid}>
              {genres.map(genre => (
                <label key={genre.id} className={`${styles.genrePill} ${selectedGenres.includes(genre.id) ? styles.selected : ''}`}>
                  <input 
                    type="checkbox" 
                    className={styles.hiddenCheckbox}
                    checked={selectedGenres.includes(genre.id)}
                    onChange={() => toggleGenre(genre.id)}
                  />
                  {genre.name}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tags</label>
            <div className={styles.genresGrid}>
              {presetTags.map(tag => (
                <label key={tag} className={`${styles.genrePill} ${selectedTags.includes(tag) ? styles.selected : ''}`}>
                  <input 
                    type="checkbox" 
                    className={styles.hiddenCheckbox}
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
            
            <div className={styles.customTagWrap} style={{ marginTop: '12px' }}>
              <div className={styles.genresGrid} style={{ marginBottom: selectedTags.filter(t => !presetTags.includes(t)).length > 0 ? '8px' : '0' }}>
                {selectedTags.filter(t => !presetTags.includes(t)).map(tag => (
                  <span key={tag} className={`${styles.genrePill} ${styles.selected}`}>
                    {tag}
                    <button onClick={() => toggleTag(tag)} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <Input 
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={addCustomTag}
                placeholder="Type a custom tag and press Enter..."
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Co-Authors (Optional)</label>
            <div className={styles.coAuthorsWrap}>
              {coAuthors.map(u => (
                <span key={u.id} className={styles.coAuthorChip}>
                  @{u.profile?.username}
                  <button onClick={() => removeCoAuthor(u.id)}><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className={styles.searchWrapper}>
              <Input 
                value={userSearch} 
                onChange={(e) => setUserSearch(e.target.value)} 
                placeholder="Search by username..." 
              />
              {searchResults.length > 0 && (
                <div className={styles.dropdown}>
                  {searchResults.map(user => (
                    <button key={user.userId} onClick={() => addCoAuthor(user)} className={styles.dropdownItem}>
                      <span className={styles.ddUsername}>@{user.username}</span>
                      <span className={styles.ddName}>{user.fullName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Editor Body */}
        {format === "SINGLE" ? (
          <div className={styles.bodyCard}>
            <RichTextEditor 
              value={chapters[0]?.content || ""}
              onChange={(html) => updateChapter(0, "content", html)}
              placeholder="Write your story here..."
            />
          </div>
        ) : (
          <div className={styles.chaptersList}>
            {chapters.map((chapter, index) => (
              <Card key={index} className={styles.chapterCard}>
                <div className={styles.chapterHeader}>
                  <Input 
                    label={`Chapter ${index + 1} Title`}
                    value={chapter.title || ""}
                    onChange={(e) => updateChapter(index, "title", e.target.value)}
                    placeholder="E.g., The Beginning"
                  />
                  <div className={styles.chapterActions}>
                    <select 
                      className={styles.statusSelect}
                      value={chapter.status}
                      onChange={(e) => updateChapter(index, "status", e.target.value)}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                    {chapters.length > 1 && (
                      <button onClick={() => removeChapter(index)} className={styles.deleteBtn}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <RichTextEditor 
                    value={chapter.content || ""}
                    onChange={(html) => updateChapter(index, "content", html)}
                    placeholder="Chapter content..."
                  />
                </div>
              </Card>
            ))}
            
            <Button variant="ghost" onClick={addChapter} className={styles.addChapterBtn}>
              <Plus size={20} /> Add Chapter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
