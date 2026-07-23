import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteSearchFacility } from "../types";
import { PROGRAM_LABELS } from "../constants/programLabels";

const MILES_TO_METERS = 1609.34;
const SINGLE_PIN_FALLBACK_MILES = 2;

interface SiteSearchMapProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  facilities: SiteSearchFacility[];
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function SiteSearchMap({ latitude, longitude, radius, facilities }: SiteSearchMapProps) {
  // Only recompute when the facilities data itself changes (a real new search
  // result), not on every parent re-render (e.g. typing into an unrelated input).
  const pinned = useMemo(
    () =>
      facilities.filter(
        (facility): facility is SiteSearchFacility & { latitude: number; longitude: number } =>
          facility.latitude !== null && facility.longitude !== null
      ),
    [facilities]
  );

  // Stable, primitive derived key summarizing the pinned coordinates so bounds
  // can be memoized on primitives instead of the `pinned` array reference.
  const pinnedKey = useMemo(
    () => pinned.map((facility) => `${facility.registry_id}:${facility.latitude}:${facility.longitude}`).join("|"),
    [pinned]
  );

  // Note: `pinned.length === 0` here only guards against a division by zero
  // when neither an address nor any pinned facilities are available; in that
  // case the component returns null below and this fallback center is unused.
  const center: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : pinned.length > 0
        ? [
            pinned.reduce((sum, facility) => sum + facility.latitude, 0) / pinned.length,
            pinned.reduce((sum, facility) => sum + facility.longitude, 0) / pinned.length,
          ]
        : [0, 0];

  // Keyed on primitives only (latitude, longitude, radius, pinnedKey) so this
  // does not produce a new object identity on unrelated re-renders, which
  // would otherwise re-trigger FitBounds's effect and reset the user's pan/zoom.
  // Must be called unconditionally (before the early return below) to satisfy
  // the Rules of Hooks.
  const bounds: LatLngBoundsExpression = useMemo(
    () =>
      latitude !== null && longitude !== null
        ? L.latLng(latitude, longitude).toBounds(radius * MILES_TO_METERS * 2)
        : pinned.length > 1
          ? L.latLngBounds(pinned.map((facility) => [facility.latitude, facility.longitude]))
          : L.latLng(center[0], center[1]).toBounds(SINGLE_PIN_FALLBACK_MILES * MILES_TO_METERS * 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latitude, longitude, radius, pinnedKey]
  );

  if (pinned.length === 0 && latitude === null) {
    return null;
  }

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "400px", width: "100%", marginBottom: "1rem" }}
    >
      <FitBounds bounds={bounds} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {latitude !== null && longitude !== null && (
        <>
          <CircleMarker
            center={[latitude, longitude]}
            radius={8}
            pathOptions={{ color: "#2c6fbb", fillColor: "#2c6fbb", fillOpacity: 1 }}
          >
            <Popup>Searched address</Popup>
          </CircleMarker>
          <Circle
            center={[latitude, longitude]}
            radius={radius * MILES_TO_METERS}
            pathOptions={{ color: "#2c6fbb", fillOpacity: 0.05 }}
          />
        </>
      )}
      {pinned.map((facility) => (
        <CircleMarker
          key={facility.registry_id}
          center={[facility.latitude, facility.longitude]}
          radius={6}
          pathOptions={{
            color: facility.significant_violation ? "#c0392b" : "#2e8b57",
            fillColor: facility.significant_violation ? "#c0392b" : "#2e8b57",
            fillOpacity: 0.8,
          }}
        >
          <Popup>
            <strong>{facility.name}</strong>
            <br />
            {facility.programs.map((program) => PROGRAM_LABELS[program] ?? program).join(", ")}
            <br />
            {facility.compliance_status ?? "No Violation Identified"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export default SiteSearchMap;
