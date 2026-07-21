import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useEffect } from "react";
import { icons } from "../lib/mapIcons";

/**
 * Re-centers/zooms the map whenever `center` changes (e.g. user searches
 * from a new location) — react-leaflet doesn't do this automatically once
 * the map has already mounted.
 */
function RecenterOnChange({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

/**
 * markers: [{ id, lat, lng, icon: 'donor'|'donorUnavailable'|'request'|'bloodBank'|'hospital'|'you', popup?: string|node }]
 */
export default function MapView({
  center,
  zoom = 12,
  markers = [],
  radiusKm,
  height = 360,
}) {
  if (!center) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--clinical)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        Set a location to see the map.
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange center={center} zoom={zoom} />

        {radiusKm && <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#c81e3a", fillOpacity: 0.04, weight: 1 }} />}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons[m.icon] || icons.request}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
