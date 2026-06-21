/* src/components/layout/TopNav.module.css */

.nav {
  grid-area: topnav;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.logoIcon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  color: white;
}

.logoText {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.iconBtn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-secondary);
  transition: all var(--duration-fast);
}

.iconBtn:hover {
  background: var(--surface-2);
  color: var(--icon-primary);
}

.createBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--brand-gradient);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
  white-space: nowrap;
}

.createBtn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.notifBtn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-secondary);
  position: relative;
  transition: all var(--duration-fast);
}

.notifBtn:hover {
  background: var(--surface-2);
  color: var(--icon-primary);
}

.badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  background: var(--like-color);
  color: white;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg-primary);
}

.avatarLink {
  display: flex;
  align-items: center;
  border-radius: 50%;
  transition: opacity var(--duration-fast);
}

.avatarLink:hover { opacity: 0.85; }

/* Mobile: hide create text */
@media (max-width: 768px) {
  .nav { padding: 0 16px; }
  .logoText { display: none; }
  .createBtn span { display: none; }
  .createBtn { padding: 8px; border-radius: var(--radius-md); }
}
