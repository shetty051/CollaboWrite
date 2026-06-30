"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setRoleAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/Card/Card";
import styles from "./page.module.css";
import { BookOpen, PenTool } from "lucide-react";

export default function RoleSelectionPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRoleSelection = async (role: "READER" | "WRITER") => {
    if (!session?.user?.id) return;
    setLoading(role);
    
    const res = await setRoleAction(session.user.id, role);
    if (res.success) {
      await update({ role, onboardingStep: "PROFILE_SETUP" });
      router.push("/onboarding/profile");
      router.refresh();
    } else {
      setLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to CollaboWrite!</h1>
          <p className={styles.subtitle}>How do you plan to use the platform?</p>
        </div>

        <div className={styles.cardsGrid}>
          <button 
            className={`${styles.roleButton} ${loading === "READER" ? styles.loading : ""}`}
            onClick={() => handleRoleSelection("READER")}
            disabled={loading !== null}
          >
            <Card className={styles.roleCard}>
              <BookOpen size={48} className={styles.icon} />
              <h2>I'm a Reader</h2>
              <p>Discover, read, rate, and review stories. Follow your favorite writers.</p>
            </Card>
          </button>

          <button 
            className={`${styles.roleButton} ${loading === "WRITER" ? styles.loading : ""}`}
            onClick={() => handleRoleSelection("WRITER")}
            disabled={loading !== null}
          >
            <Card className={styles.roleCard}>
              <PenTool size={48} className={styles.icon} />
              <h2>I'm a Writer</h2>
              <p>Write, publish, co-author stories, and track their performance.</p>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}
