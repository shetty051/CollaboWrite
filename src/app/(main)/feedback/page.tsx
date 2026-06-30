"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import styles from "./feedback.module.css";
import { MessageSquare, Star, CheckCircle } from "lucide-react";

export default function FeedbackPage() {
  const [category, setCategory] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return alert("Please enter a message");

    setSubmitting(true);
    const res = await submitFeedback(category, message, rating);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      setMessage("");
      setRating(0);
      setCategory("Suggestion");
    } else {
      alert("Something went wrong. Please try again.");
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <Card className={styles.successCard}>
          <CheckCircle size={48} className={styles.successIcon} />
          <h2>Thank you for your feedback!</h2>
          <p>Your input helps us make CollaboWrite better for everyone.</p>
          <Button onClick={() => setSuccess(false)}>Submit another</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <MessageSquare size={32} className={styles.headerIcon} />
          <h1 className={styles.title}>Send Feedback</h1>
        </div>
        <p className={styles.subtitle}>Let us know how we can improve your reading experience.</p>
      </header>

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category</label>
            <select 
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Suggestion">Suggestion</option>
              <option value="Bug">Report a Bug</option>
              <option value="General">General Feedback</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Message</label>
            <textarea 
              className={styles.textarea}
              placeholder="What's on your mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Overall Experience (Optional)</label>
            <div className={styles.starWidget}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={styles.starBtn}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star 
                    size={28} 
                    className={(hoverRating || rating) >= star ? styles.starIconFilled : styles.starIconEmpty} 
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <button 
                type="button" 
                className={styles.clearRatingBtn} 
                onClick={() => setRating(0)}
              >
                Clear rating
              </button>
            )}
          </div>

          <Button type="submit" disabled={submitting || !message.trim()} className={styles.submitBtn}>
            {submitting ? "Sending..." : "Submit Feedback"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
