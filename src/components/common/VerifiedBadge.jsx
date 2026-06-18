// Shared Instagram-style verified badge SVG — use everywhere
export const VerifiedBadge = ({ size = 18, style = {} }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 40 40" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...style }}
  >
    <path
      d="M20 2 L23.5 7.5 L30 6 L29.5 12.5 L36 15 L33 21 L38 26 L32.5 29.5 L33 36 L26.5 35 L24 41 L20 37.5 L16 41 L13.5 35 L7 36 L7.5 29.5 L2 26 L7 21 L4 15 L10.5 12.5 L10 6 L16.5 7.5 Z"
      fill="#1877F2"
    />
    <path
      d="M13.5 20.5 L18 25.5 L27 15"
      stroke="white" strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);
