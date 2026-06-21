/* src/components/posts/PostCard.module.css */

.card {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: border-color var(--duration-fast);
}

.card:hover { border-color: var(--border-default); }

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.authorLink {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  flex: 1;
  min-width: 0;
}

.authorInfo {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.displayName {
  font-size: var(--text-sm);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  truncate: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.verifiedBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: var(--verified-color);
  color: white;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  flex-shrink: 0;
}

.meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.timestamp {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.menuBtn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--duration-fast);
}
.menuBtn:hover { background: var(--surface-2); color: var(--text-primary); }

/* Media */
.media {
  position: relative;
  overflow: hidden;
  background: var(--surface-2);
  cursor: pointer;
  aspect-ratio: 1 / 1;
}

.mediaSlider {
  display: flex;
  height: 100%;
  transition: transform 0.35s var(--ease-smooth);
  will-change: transform;
}

.mediaSlide {
  flex: 0 0 100%;
  height: 100%;
}

.mediaItem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.carouselBtn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: background var(--duration-fast);
  z-index: 2;
}

.carouselBtn:hover { background: rgba(0,0,0,0.85); }

.carouselPrev { left: 10px; }
.carouselNext { right: 10px; }

.dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  z-index: 2;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transition: all var(--duration-fast);
  border: none;
  cursor: pointer;
}

.dotActive {
  background: white;
  width: 18px;
  border-radius: 3px;
}

.heartOverlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  pointer-events: none;
  z-index: 3;
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.4));
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 4px;
}

.actionsLeft {
  display: flex;
  align-items: center;
  gap: 2px;
}

.actionBtn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-primary);
  transition: all var(--duration-fast);
  -webkit-tap-highlight-color: transparent;
}

.actionBtn:hover { background: var(--surface-2); }
.actionBtn:active { transform: scale(0.9); }

.liked { color: var(--like-color) !important; }
.saved { color: var(--text-primary); }

/* Content */
.likes {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 16px 4px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.caption {
  padding: 0 16px 4px;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-primary);
}

.captionUsername {
  font-weight: 600;
  text-decoration: none;
  color: var(--text-primary);
  margin-right: 4px;
}

.captionUsername:hover { text-decoration: underline; }

.moreBtn {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: 500;
}

.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 16px 4px;
}

.hashtag {
  font-size: var(--text-xs);
  color: var(--brand-secondary);
  font-weight: 500;
  cursor: pointer;
}

.hashtag:hover { text-decoration: underline; }

.viewComments {
  padding: 2px 16px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  display: block;
  text-align: left;
  width: 100%;
}

.viewComments:hover { color: var(--text-secondary); }

.time {
  display: block;
  padding: 2px 16px 14px;
  font-size: var(--text-xs);
  color: var(--text-disabled);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
