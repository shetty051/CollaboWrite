"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import Link from "next/link";
import styles from "./NotificationBell.module.css";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const res = await getNotifications();
    if (res.notifications) {
      setNotifications(res.notifications);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button 
        className={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={32} className={styles.emptyIcon} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`${styles.notification} ${notif.isRead ? styles.read : styles.unread}`}
                  onClick={() => handleNotificationClick(notif)}
                  role={notif.link ? "button" : "listitem"}
                >
                  <div className={styles.content}>
                    <p className={styles.message}>{notif.message}</p>
                    <span className={styles.time}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!notif.isRead && (
                    <button 
                      className={styles.markReadBtn} 
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                    >
                      <span className={styles.dot}></span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
