/* src/components/posts/PostSkeleton.module.css */
.card {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}
.info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.line { border-radius: 4px; }
.name { height: 13px; width: 120px; }
.handle { height: 11px; width: 80px; }
.avatar, .media, .line, .actionBtn { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.media { aspect-ratio: 1/1; }
.actions { display: flex; padding: 10px 12px; gap: 8px; }
.actionGroup { display: flex; gap: 4px; }
.actionBtn { width: 36px; height: 36px; border-radius: var(--radius-md); }
.content { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.caption1 { height: 12px; width: 80%; }
.caption2 { height: 12px; width: 60%; }
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
