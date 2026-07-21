import L from "leaflet";

/**
 * Leaflet's default marker images don't resolve correctly through Vite's
 * bundler without extra config. Simpler and more on-brand: build markers
 * as inline SVG divIcons using our own palette instead of image assets.
 */
function pinSvg(color, pulse) {
  return `
    <div style="position: relative; width: 26px; height: 34px;">
      ${
        pulse
          ? `<div style="position:absolute; top:20px; left:5px; width:16px; height:16px; border-radius:50%; background:${color}; opacity:0.35; animation: map-pulse 1.6s ease-out infinite;"></div>`
          : ""
      }
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
        <circle cx="13" cy="13" r="5.5" fill="white"/>
      </svg>
    </div>
    <style>
      @keyframes map-pulse {
        0% { transform: scale(0.6); opacity: 0.5; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    </style>
  `;
}

function makeIcon(color, { pulse = false, size = [26, 34] } = {}) {
  return L.divIcon({
    html: pinSvg(color, pulse),
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });
}

// Palette matches src/styles/tokens.css
export const icons = {
  donor: makeIcon("#c81e3a"), // crimson — available donor
  donorUnavailable: makeIcon("#9aa3b2"), // muted — donor not currently available
  request: makeIcon("#14181f"), // ink — a patient/hospital blood request
  bloodBank: makeIcon("#e8a33d"), // amber — blood bank
  hospital: makeIcon("#0e7c7b"), // teal — hospital
  you: makeIcon("#0e7c7b", { pulse: true }), // teal with a pulse ring — "you are here"
};
