"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { signUpAction } from "@/app/actions/auth";
import { getRecentAccountDetails } from "@/app/actions/auth-recent";
import styles from "./page.module.css";
import { BookOpen, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";

type RecentAccount = {
  email: string;
  name: string;
  avatarUrl: string | null;
  username: string;
};

const RECENT_ACCOUNTS_KEY = "collabowrite_recent_accounts";

function AuthForm() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode');
  
  const [isLogin, setIsLogin] = useState(initialMode === 'signup' ? false : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ACCOUNTS_KEY);
      if (stored) {
        setRecentAccounts(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading recent accounts", e);
    }
  }, []);

  const saveRecentAccount = async () => {
    try {
      const details = await getRecentAccountDetails();
      if (details) {
        let stored: RecentAccount[] = [];
        const raw = localStorage.getItem(RECENT_ACCOUNTS_KEY);
        if (raw) stored = JSON.parse(raw);
        
        // Remove existing entry for this email if it exists
        stored = stored.filter(a => a.email !== details.email);
        
        // Add to front
        stored.unshift(details);
        
        // Limit to 4
        if (stored.length > 4) stored = stored.slice(0, 4);
        
        localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(stored));
      }
    } catch (e) {
      console.error("Failed to save recent account", e);
    }
  };

  const removeRecentAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentAccounts.filter(a => a.email !== emailToRemove);
    setRecentAccounts(updated);
    localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(updated));
  };

  const handleRecentClick = (acc: RecentAccount) => {
    setEmail(acc.email);
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (res?.error) {
          setError(`Login failed: ${res.error}`);
          setLoading(false);
        } else {
          await saveRecentAccount();
          window.location.href = "/home";
        }
      } else {
        const res = await signUpAction(new FormData(e.target as HTMLFormElement));
        if (res.error) {
          setError(`Signup error: ${res.error}`);
          setLoading(false);
        } else {
          const signInRes = await signIn("credentials", {
            redirect: false,
            email,
            password,
          });
          if (signInRes?.error) {
            setError(`Signin error after signup: ${signInRes.error}`);
            setLoading(false);
            return;
          }
          await saveRecentAccount();
          window.location.href = "/onboarding/role";
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(`Fatal error: ${err?.message || String(err)}`);
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.authCard}>
        <div className={styles.header}>
          <BookOpen size={40} className={styles.logoIcon} />
          <h1 className={styles.title}>{isLogin ? "Welcome Back" : "Create an Account"}</h1>
          <p className={styles.subtitle}>
            {isLogin ? "Log in to continue your story." : "Join our collaborative storytelling community."}
          </p>
        </div>

        {isLogin && recentAccounts.length > 0 && (
          <div className={styles.recentAccounts}>
            <p className={styles.recentTitle}>Recent Accounts</p>
            <div className={styles.recentList}>
              {recentAccounts.map(acc => (
                <div key={acc.email} className={styles.recentCard} onClick={() => handleRecentClick(acc)}>
                  <Avatar url={acc.avatarUrl} name={acc.username || acc.name} size={40} />
                  <span className={styles.recentName}>{acc.name}</span>
                  <button 
                    className={styles.recentRemove} 
                    onClick={(e) => removeRecentAccount(acc.email, e)}
                    title="Remove from recent"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            ref={passwordInputRef}
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" variant="primary" disabled={loading} className={styles.submitBtn}>
            {loading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.toggleText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className={styles.toggleBtn}
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
