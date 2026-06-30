import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import styles from "./page.module.css";

export const dynamic = 'force-dynamic';

export default async function ProfileSetupPage() {
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete Your Profile</h1>
          <p className={styles.subtitle}>Tell us a bit about yourself to personalize your experience.</p>
        </div>
        <ProfileForm genres={genres} />
      </div>
    </div>
  );
}
