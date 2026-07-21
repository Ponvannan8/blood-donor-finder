import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useEffect } from "react";
import { icons } from "../lib/mapIcons";

function ClickToPlace({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

/**
 * A small map that lets the person click anywhere, or drag the pin, to set
 * a lat/lng — a visual companion to the manual coordinate inputs, not a
 * replacement (typing still works, and "Use current location" still works).
 */
export default function LocationPickerMap({ position, onChange, height = 240 }) {
  const center = position ?? [20.5937, 78.9629]; // India, sensible default before any location is set
  const zoom = position ? 14 : 5;

  return (
    <div style={{ height, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange center={position} />
        <ClickToPlace onChange={onChange} />
        {position && (
          <Marker
            position={position}
            icon={icons.donor}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onChange(lat, lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
