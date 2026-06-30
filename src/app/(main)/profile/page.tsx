"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getProfileData, updateProfile, changePassword, upgradeToWriter } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import styles from "./profile.module.css";
import { Lock, Trophy, BookOpen, Clock, Users, Camera, Star } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Password State
  const [pwdEditing, setPwdEditing] = useState(false);
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");

  // Avatar Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const res = await getProfileData();
    if (res.user) {
      setData(res);
      setFormData({
        fullName: res.user.profile.fullName,
        username: res.user.profile.username,
        age: res.user.profile.age,
        country: res.user.profile.country,
        genreIds: res.user.profile.genres.map((g: any) => g.id)
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile(formData);
    if (res.error) {
      alert(res.error);
    } else {
      setEditing(false);
      fetchData(); // refresh
      router.refresh();
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (pwd.new !== pwd.confirm) {
      setPwdError("New passwords do not match.");
      return;
    }
    const res = await changePassword(pwd.current, pwd.new);
    if (res.error) {
      setPwdError(res.error);
    } else {
      setPwdEditing(false);
      setPwd({ current: "", new: "", confirm: "" });
      alert("Password changed successfully.");
    }
  };

  const toggleGenre = (genreId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter((id: string) => id !== genreId)
        : [...prev.genreIds, genreId]
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const resData = await res.json();
      if (res.ok) {
        await fetchData(); 
        router.refresh(); // Update server components (layout sidebar)
      } else {
        alert(resData.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpgrade = async () => {
    const confirm = window.confirm(
      "Are you sure you want to upgrade to a Writer account? You will unlock publishing tools and keep all your reading history and ratings."
    );
    if (!confirm) return;

    const res = await upgradeToWriter();
    if (res.error) {
      alert(res.error);
    } else {
      await updateSession({ role: "WRITER" });
      router.refresh();
      window.location.reload(); // Force full reload to update layouts
    }
  };

  if (loading) return <div className={styles.loading}>Loading profile...</div>;
  if (!data?.user) return <div className={styles.loading}>Profile not found.</div>;

  const { user, allGenres, rank } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatarWrapper}>
          <Avatar url={user.profile.avatarUrl} name={user.profile.username} size={80} />
          <button 
            className={styles.avatarEditBtn} 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Change Photo"
          >
            <Camera size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg, image/png" 
            style={{ display: "none" }} 
          />
        </div>
        <div>
          <h1 className={styles.title}>{user.profile.fullName}</h1>
          <p className={styles.subtitle}>@{user.profile.username} • {user.role}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          {/* Profile Details / Edit */}
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Personal Info</h2>
              {!editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
            </div>
            
            {editing ? (
              <form onSubmit={handleProfileSubmit} className={styles.form}>
                <Input label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
                <Input label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                <div className={styles.row}>
                  <Input type="number" label="Age" value={formData.age} onChange={(e) => setFormData({...formData, age: Number(e.target.value)})} required />
                  <Input label="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Genres of Interest</label>
                  <div className={styles.genresGrid}>
                    {allGenres.map((g: any) => (
                      <button
                        type="button"
                        key={g.id}
                        className={`${styles.genreBadge} ${formData.genreIds.includes(g.id) ? styles.genreActive : ""}`}
                        onClick={() => toggleGenre(g.id)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button type="submit">Save Changes</Button>
                  <Button type="button" variant="secondary" onClick={() => { setEditing(false); setFormData({...formData, genreIds: user.profile.genres.map((g:any)=>g.id)}); }}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className={styles.infoList}>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Age</span> <span className={styles.infoValue}>{user.profile.age}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>Country</span> <span className={styles.infoValue}>{user.profile.country}</span></div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Interests</span> 
                  <div className={styles.genreTags}>
                    {user.profile.genres.map((g: any) => <span key={g.id} className={styles.tag}>{g.name}</span>)}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Password Change */}
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><Lock size={20}/> Security</h2>
              {!pwdEditing && <Button variant="secondary" onClick={() => setPwdEditing(true)}>Change Password</Button>}
            </div>
            
            {pwdEditing && (
              <form onSubmit={handlePasswordSubmit} className={styles.form}>
                {pwdError && <p className={styles.error}>{pwdError}</p>}
                <Input type="password" label="Current Password" value={pwd.current} onChange={(e) => setPwd({...pwd, current: e.target.value})} required />
                <Input type="password" label="New Password" value={pwd.new} onChange={(e) => setPwd({...pwd, new: e.target.value})} required />
                <Input type="password" label="Confirm New Password" value={pwd.confirm} onChange={(e) => setPwd({...pwd, confirm: e.target.value})} required />
                <div className={styles.actions}>
                  <Button type="submit">Update Password</Button>
                  <Button type="button" variant="secondary" onClick={() => { setPwdEditing(false); setPwdError(""); }}>Cancel</Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div className={styles.rightCol}>
          {/* Writer Specific */}
          {user.role === "WRITER" && (
            <>
              {rank !== null ? (
                <Card className={styles.rankCard}>
                  <Trophy size={32} className={styles.rankIcon} />
                  <div>
                    <p className={styles.rankLabel}>Your Leaderboard Position</p>
                    <p className={styles.rankValue}>#{rank}</p>
                  </div>
                  <Link href="/leaderboard" className={styles.rankLink}>View Leaderboard</Link>
                </Card>
              ) : (
                <Card className={styles.rankCard} style={{ opacity: 0.8 }}>
                  <Trophy size={32} className={styles.rankIcon} color="var(--color-text-secondary)" />
                  <div>
                    <p className={styles.rankLabel}>Your Leaderboard Position</p>
                    <p className={styles.rankValue} style={{ fontSize: '1.2rem', marginTop: '4px', color: 'var(--color-text-secondary)' }}>Not yet ranked</p>
                  </div>
                  <Link href="/leaderboard" className={styles.rankLink}>View Leaderboard</Link>
                </Card>
              )}

              <Card className={styles.card}>
                <h2 className={styles.cardTitle}><BookOpen size={20}/> Published Stories</h2>
                {user.stories.length === 0 ? (
                  <p className={styles.emptyText}>You haven't published any stories yet.</p>
                ) : (
                  <ul className={styles.activityList}>
                    {user.stories.map((s: any) => (
                      <li key={s.id} className={styles.activityItem}>
                        <Link href={`/read/${s.id}`} className={styles.storyLink}>{s.title}</Link>
                        <span className={styles.storyViews}>{s.viewCount} views</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {/* Reader Specific */}
          {user.role === "READER" && (
            <>
              <Card className={styles.card} style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid var(--color-accent-maroon)" }}>
                <h2 className={styles.cardTitle}><Star size={20} color="var(--color-accent-maroon)" /> Want to be a writer?</h2>
                <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", marginBottom: "16px", lineHeight: "1.5" }}>
                  Unlock the ability to publish your own stories, track your reading stats, and build your audience. 
                  <strong> It's free and you'll keep all your existing reading history and follows.</strong>
                </p>
                <Button onClick={handleUpgrade} style={{ width: "100%" }}>Upgrade Account</Button>
              </Card>

              <Card className={styles.card}>
                <h2 className={styles.cardTitle}><Users size={20}/> Following Writers</h2>
                {user.following.length === 0 ? (
                  <p className={styles.emptyText}>You aren't following anyone yet.</p>
                ) : (
                  <ul className={styles.activityList}>
                    {user.following.map((f: any) => (
                      <li key={f.id} className={styles.activityItem}>
                        <span className={styles.username}>@{f.username}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className={styles.card}>
                <h2 className={styles.cardTitle}><Clock size={20}/> Reading History</h2>
                {user.readHistory.length === 0 ? (
                  <p className={styles.emptyText}>You haven't read any stories yet.</p>
                ) : (
                  <ul className={styles.activityList}>
                    {user.readHistory.map((r: any) => (
                      <li key={r.id} className={styles.activityItem}>
                        <Link href={`/read/${r.id}`} className={styles.storyLink}>{r.title}</Link>
                        <span className={styles.timestamp}>{new Date(r.updatedAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
