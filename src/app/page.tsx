"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { BookOpen } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <BookOpen size={48} className={styles.logoIcon} />
          </div>
          <h1 className={styles.title}>CollaboWrite</h1>
          <p className={styles.subtitle}>
            A cozy corner for writers and readers to connect, co-author, and share stories.
          </p>
        </div>

        <div className={styles.showcase}>
          <Card className={styles.demoCard}>
            <h2 className={styles.cardTitle}>Join the Community</h2>
            <p className={styles.cardText}>
              Start writing your next masterpiece or discover your new favorite author today.
            </p>
            
            <div className={styles.buttonGroup}>
              <Button 
                variant="primary" 
                type="button" 
                onClick={() => router.push('/auth?mode=signup')}
              >
                Get Started
              </Button>
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => router.push('/auth?mode=login')}
              >
                Log In
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
