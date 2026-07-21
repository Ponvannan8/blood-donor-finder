/**
 * The app's signature element: a heartbeat trace.
 * Used sparingly — as a section divider, and as a "live" indicator
 * next to a donor's availability status. Never purely decorative:
 * on the availability badge, the animation only plays when the donor
 * is actually marked available.
 */
export default function PulseDivider({ animated = true, color = "var(--crimson)", height = 40 }) {
  return (
    <svg
      viewBox="0 0 300 40"
      height={height}
      width="100%"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M0 20 H90 L100 20 L108 6 L118 34 L128 20 L136 20 L145 20 H300"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          animated
            ? {
                strokeDasharray: 420,
                strokeDashoffset: 420,
                animation: "pulse-draw 2.4s ease-in-out infinite",
              }
            : undefined
        }
      />
      <style>{`
        @keyframes pulse-draw {
          0% { stroke-dashoffset: 420; }
          55% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
