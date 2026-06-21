/* src/components/common/Avatar.module.css */

.wrapper {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 50%;
}

.img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-family: var(--font-display);
  user-select: none;
}

/* Instagram badge: no border ring, just the SVG floating over bottom-right */
.verified {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  /* tiny white halo so badge reads against any avatar color */
  filter: drop-shadow(0 0 1.5px white);
  z-index: 2;
}

.online {
  position: absolute;
  background: var(--online-color);
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
  z-index: 1;
}
