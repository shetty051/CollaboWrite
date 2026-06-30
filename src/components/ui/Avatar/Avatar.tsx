"use client";

import { useState } from "react";
import styles from "./Avatar.module.css";
import { X } from "lucide-react";

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: number;
  disableExpand?: boolean;
}

export function Avatar({ url, name = "User", size = 40, disableExpand = false }: AvatarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  const handleContainerClick = (e: React.MouseEvent) => {
    if (disableExpand) return;
    
    // Only expand if there's actually an image, or expand initials too? 
    // The user said "shows the profile picture at a larger size". 
    // We can just expand both for consistency.
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(false);
  };

  return (
    <>
      <div 
        className={`${styles.avatarContainer} ${!disableExpand ? styles.clickable : ''}`} 
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        onClick={disableExpand ? undefined : handleContainerClick}
        title={disableExpand ? undefined : `View ${name}'s Avatar`}
      >
        {url ? (
          <img 
            src={url} 
            alt={name} 
            className={styles.image}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {isExpanded && (
        <div className={styles.modalOverlay} onClick={handleClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={handleClose} title="Close">
              <X size={24} />
            </button>
            <div className={styles.largeAvatarWrapper}>
              {url ? (
                <img 
                  src={url} 
                  alt={name} 
                  className={styles.largeImage}
                />
              ) : (
                <div className={styles.largeInitials}>
                  {initial}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
