import { Sidebar } from "@/components/Sidebar/Sidebar";
import styles from "./layout.module.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { NotificationBell } from "@/components/Notifications/NotificationBell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  let profile = null;
  if (session?.user) {
    profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    });
  }

  return (
    <div className={styles.layout}>
      <Sidebar 
        avatarUrl={profile?.avatarUrl} 
        username={profile?.username || session?.user?.email || "User"} 
      />
      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <NotificationBell />
          <ThemeToggle />
        </header>
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
