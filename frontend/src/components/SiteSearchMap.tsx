import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteSearchFacility } from "../types";
import { PROGRAM_LABELS } from "../constants/programLabels";

const MILES_TO_METERS = 1609.34;

interface SiteSearchMapProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  facilities: SiteSearchFacility[];
}

function SiteSearchMap({ latitude, longitude, radius, facilities }: SiteSearchMapProps) {
  const pinned = facilities.filter(
    (facility): facility is SiteSearchFacility & { latitude: number; longitude: number } =>
      facility.latitude !== null && facility.longitude !== null
  );

  if (pinned.length === 0 && latitude === null) {
    return null;
  }

  const center: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : [
          pinned.reduce((sum, facility) => sum + facility.latitude, 0) / pinned.length,
          pinned.reduce((sum, facility) => sum + facility.longitude, 0) / pinned.length,
        ];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "400px", width: "100%", marginBottom: "1rem" }}
    >
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
