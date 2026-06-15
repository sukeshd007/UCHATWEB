/* src/components/layout/SideNav.module.css */

.nav {
  grid-area: sidenav;
  position: sticky;
  top: 60px;
  height: calc(100dvh - 60px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 12px 20px;
  border-right: 1px solid var(--border-subtle);
  overflow-y: auto;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--duration-fast);
  position: relative;
}

.item:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.itemActive {
  color: var(--brand-primary);
  background: rgba(124, 58, 237, 0.08);
}

.iconWrap {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.activeIndicator {
  position: absolute;
  inset: -4px;
  border-radius: 8px;
  background: rgba(124, 58, 237, 0.12);
  z-index: -1;
}

.label {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.adminItem {
  margin-top: 8px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 12px;
}

.adminItem .label { color: var(--warning-color); }
.adminItem:hover .label { color: var(--warning-color); }

/* Footer */
.footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--surface-1);
}

.userInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.userText {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.userName {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.userHandle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logoutBtn {
  padding: 6px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: all var(--duration-fast);
}

.logoutBtn:hover {
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.08);
}

/* Tablet: icon only */
@media (max-width: 1024px) {
  .label { display: none; }
  .nav { padding: 12px 8px 20px; }
  .item { padding: 10px; justify-content: center; }
  .userInfo > *:last-child { display: none; }
  .userText { display: none; }
  .footer { padding: 8px; justify-content: center; }
}

/* Mobile: hidden (bottom nav used instead) */
@media (max-width: 768px) {
  .nav { display: none; }
}
