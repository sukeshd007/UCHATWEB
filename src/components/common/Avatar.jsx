// src/components/common/Avatar.jsx
import { useState } from 'react';
import styles from './Avatar.module.css';

const sizeMap = {
  20:  { fontSize: 8,  badge: 10, badgeOffset: -2 },
  24:  { fontSize: 10, badge: 11, badgeOffset: -2 },
  28:  { fontSize: 11, badge: 12, badgeOffset: -2 },
  32:  { fontSize: 13, badge: 13, badgeOffset: -2 },
  36:  { fontSize: 14, badge: 14, badgeOffset: -2 },
  40:  { fontSize: 16, badge: 16, badgeOffset: -3 },
  48:  { fontSize: 18, badge: 18, badgeOffset: -3 },
  56:  { fontSize: 22, badge: 20, badgeOffset: -3 },
  64:  { fontSize: 26, badge: 22, badgeOffset: -4 },
  80:  { fontSize: 32, badge: 26, badgeOffset: -4 },
  100: { fontSize: 40, badge: 30, badgeOffset: -5 },
  120: { fontSize: 48, badge: 34, badgeOffset: -5 },
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getColor = (name) => {
  const colors = [
    '#7C3AED', '#2563EB', '#059669', '#DC2626',
    '#D97706', '#7C3AED', '#0891B2', '#BE185D'
  ];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

// Instagram-accurate verified badge — starburst shape with white checkmark
const InstagramVerifiedBadge = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    {/* Starburst / notched badge shape — 8 points like Instagram */}
    <path
      d="M20 2
         L23.5 7.5 L30 6 L29.5 12.5 L36 15 L33 21
         L38 26 L32.5 29.5 L33 36 L26.5 35
         L24 41 L20 37.5 L16 41 L13.5 35
         L7 36 L7.5 29.5 L2 26 L7 21
         L4 15 L10.5 12.5 L10 6 L16.5 7.5 Z"
      fill="#1877F2"
    />
    {/* White checkmark — matches Instagram proportions */}
    <path
      d="M13.5 20.5 L18 25.5 L27 15"
      stroke="white"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Avatar({ src, name, size = 40, verified = false, online = false, className = '', onClick }) {
  const [imgError, setImgError] = useState(false);
  const dims = sizeMap[size] || sizeMap[40];
  const color = getColor(name);

  return (
    <div
      className={`${styles.wrapper} ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={styles.img}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div
          className={styles.fallback}
          style={{ background: color, fontSize: dims.fontSize }}
          aria-label={name || 'User'}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Online indicator */}
      {online && (
        <div
          className={styles.online}
          style={{
            width: Math.max(8, size * 0.22),
            height: Math.max(8, size * 0.22),
            bottom: dims.badgeOffset,
            right: dims.badgeOffset,
          }}
        />
      )}

      {/* Instagram-style verified badge */}
      {verified && !online && (
        <div
          className={styles.verified}
          style={{
            width: dims.badge,
            height: dims.badge,
            bottom: dims.badgeOffset,
            right: dims.badgeOffset,
          }}
        >
          <InstagramVerifiedBadge size={dims.badge} />
        </div>
      )}
    </div>
  );
}
