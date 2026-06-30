"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  Home, 
  PenTool, 
  BookOpen, 
  BarChart2, 
  MessageSquare, 
  Trophy, 
  User,
  LogOut,
  Menu,
  X,
  Search
} from "lucide-react";
import { useState } from "react";
import styles from "./Sidebar.module.css";
import { Avatar } from "@/components/ui/Avatar/Avatar";

interface SidebarProps {
  avatarUrl?: string | null;
  username?: string;
}

export function Sidebar({ avatarUrl, username }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isWriter = session?.user?.role === "WRITER";

  const writerLinks = [
    { href: "/search", label: "Search", icon: Search },
    { href: "/home", label: "Home", icon: Home },
    { href: "/read", label: "Read", icon: BookOpen },
    { href: "/write", label: "Write", icon: PenTool },
    { href: "/stats", label: "Stats", icon: BarChart2 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const readerLinks = [
    { href: "/search", label: "Search", icon: Search },
    { href: "/home", label: "Home", icon: Home },
    { href: "/read", label: "Read", icon: BookOpen },
    { href: "/feedback", label: "Feedback", icon: MessageSquare },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const links = isWriter ? writerLinks : readerLinks;

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button className={styles.mobileToggle} onClick={toggleSidebar} aria-label="Toggle Menu">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <Link href="/home" className={styles.header} onClick={() => setIsOpen(false)}>
          <BookOpen className={styles.logoIcon} size={32} />
          <h2 className={styles.logoText}>CollaboWrite</h2>
        </Link>

        <nav className={styles.nav}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userSection}>
            <Link href="/profile" className={styles.avatarLink} onClick={() => setIsOpen(false)} title="Go to Profile">
              <Avatar url={avatarUrl} name={username} size={32} disableExpand={true} />
            </Link>
            <button className={styles.logoutBtn} onClick={() => signOut()}>
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile when sidebar is open */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}
    </>
  );
}
