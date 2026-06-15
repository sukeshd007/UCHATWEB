/* src/components/layout/BottomNav.module.css */

.nav {
  display: none; /* Hidden on desktop — shown on mobile */
  grid-area: bottomnav;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  height: 60px;
  background: var(--nav-bg);
  border-top: 1px solid var(--nav-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding-bottom: env(safe-area-inset-bottom);
  align-items: center;
  justify-content: space-around;
}

@media (max-width: 768px) {
  .nav { display: flex; }
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--duration-fast);
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.itemActive { color: var(--brand-primary); }

.iconWrap {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: var(--brand-primary);
  border-radius: 50%;
}

.badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 15px;
  height: 15px;
  background: var(--like-color);
  color: white;
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 1.5px solid var(--bg-primary);
}

.label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
