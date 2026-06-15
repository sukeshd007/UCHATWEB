// src/components/posts/PostSkeleton.jsx
import styles from './PostSkeleton.module.css';

export default function PostSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar} />
        <div className={styles.info}>
          <div className={`${styles.line} ${styles.name}`} />
          <div className={`${styles.line} ${styles.handle}`} />
        </div>
      </div>
      <div className={styles.media} />
      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          <div className={styles.actionBtn} />
          <div className={styles.actionBtn} />
          <div className={styles.actionBtn} />
        </div>
      </div>
      <div className={styles.content}>
        <div className={`${styles.line} ${styles.caption1}`} />
        <div className={`${styles.line} ${styles.caption2}`} />
      </div>
    </div>
  );
}
