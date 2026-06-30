"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { setupProfileAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./page.module.css";

type Genre = { id: string; name: string };

export default function ProfileForm({ genres }: { genres: Genre[] }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!session?.user?.id) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      fullName: formData.get("fullName") as string,
      username: formData.get("username") as string,
      age: formData.get("age") as string,
      country: formData.get("country") as string,
      genres: selectedGenres,
    };

    if (selectedGenres.length === 0) {
      setError("Please select at least one genre.");
      setLoading(false);
      return;
    }

    const res = await setupProfileAction(session.user.id, data);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      await update({ onboardingStep: "COMPLETED" });
      router.push("/home");
      router.refresh();
    }
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const isWriter = session?.user?.role === "WRITER";

  return (
    <Card className={styles.formCard}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input label="Full Name" name="fullName" required placeholder="Jane Doe" />
        <Input label="Username (Unique)" name="username" required placeholder="janedoe" />
        
        <div className={styles.row}>
          <Input label="Age" name="age" type="number" required placeholder="25" min="13" />
          <Input label="Country" name="country" required placeholder="United States" />
        </div>

        <div className={styles.genresSection}>
          <label className={styles.label}>Genres of Interest</label>
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

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" variant="primary" className={styles.submitBtn} disabled={loading}>
          {loading ? "Saving..." : isWriter ? "Write your first story" : "Read your first story"}
        </Button>
      </form>
    </Card>
  );
}
