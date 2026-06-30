"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <WifiOff size={80} className={styles.icon} />
      <h1 className={styles.title}>You are offline</h1>
      <p className={styles.subtitle}>
        It looks like you've lost your internet connection. 
        Please check your network and try again.
      </p>
      <Button onClick={() => window.location.reload()} variant="primary" className={styles.btn}>
        Retry
      </Button>
    </div>
  );
}
