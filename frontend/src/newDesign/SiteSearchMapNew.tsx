import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SiteSearchFacility, WaterBody } from "../types";
import { PROGRAM_LABELS } from "../constants/programLabels";
import { badgeStyle, tierForFacility } from "./badge";
import type { BadgeTier } from "./badge";

const MILES_TO_METERS = 1609.34;
const SINGLE_PIN_FALLBACK_MILES = 2;
const WATER_COLOR = "#1E88E5";

interface SiteSearchMapNewProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  facilities: SiteSearchFacility[];
  waterBodies?: WaterBody[];
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function SiteSearchMapNew({ latitude, longitude, radius, facilities, waterBodies = [] }: SiteSearchMapNewProps) {
  const pinned = useMemo(
    () =>
      facilities.filter(
        (facility): facility is SiteSearchFacility & { latitude: number; longitude: number } =>
          facility.latitude !== null && facility.longitude !== null
      ),
    [facilities]
  );

  const pinnedKey = useMemo(
    () => pinned.map((facility) => `${facility.registry_id}:${facility.latitude}:${facility.longitude}`).join("|"),
    [pinned]
  );

  const center: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : pinned.length > 0
        ? [
            pinned.reduce((sum, facility) => sum + facility.latitude, 0) / pinned.length,
            pinned.reduce((sum, facility) => sum + facility.longitude, 0) / pinned.length,
          ]
        : [0, 0];

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
    <div style={{ position: "relative" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "520px", width: "100%", borderRadius: "24px", overflow: "hidden" }}
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
        {pinned.map((facility) => {
          const style = badgeStyle(tierForFacility(facility));
          return (
            <CircleMarker
              key={facility.registry_id}
              center={[facility.latitude, facility.longitude]}
              radius={6}
              pathOptions={{ color: style.dot, fillColor: style.dot, fillOpacity: 0.85 }}
            >
              <Popup>
                <strong>{facility.name}</strong>
                <br />
                {facility.programs.map((program) => PROGRAM_LABELS[program] ?? program).join(", ")}
                <br />
                {facility.compliance_status ?? "No Violation Identified"}
              </Popup>
            </CircleMarker>
          );
        })}
        {waterBodies.map((water, wi) =>
          water.paths.map((path, pi) => {
            if (path.length === 0) return null;
            const key = `${water.name}-${wi}-${pi}`;
            const popup = (
              <Popup>
                <strong>{water.name}</strong>
                <br />
                {water.on_303d_list ? "303(d)-listed" : "Not on 303(d) list"} ·{" "}
                {water.has_tmdl ? "cleanup plan (TMDL) in place" : "no cleanup plan yet"}
              </Popup>
            );
            if (path.length === 1) {
              return (
                <CircleMarker
                  key={key}
                  center={path[0] as LatLngTuple}
                  radius={6}
                  pathOptions={{ color: WATER_COLOR, fillColor: WATER_COLOR, fillOpacity: 0.8 }}
                >
                  {popup}
                </CircleMarker>
              );
            }
            return (
              <Polyline
                key={key}
                positions={path as LatLngTuple[]}
                pathOptions={{ color: WATER_COLOR, weight: water.has_tmdl ? 3 : 4, dashArray: water.has_tmdl ? undefined : "6 4" }}
              >
                {popup}
              </Polyline>
            );
          })
        )}
      </MapContainer>
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 500,
          background: "rgba(255,255,255,0.9)",
          borderRadius: "16px",
          padding: "12px 14px",
          fontSize: "12px",
          color: "#3A473D",
          boxShadow: "0 6px 18px -10px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontWeight: 700, color: "#16382B", marginBottom: "8px", fontSize: "11px", letterSpacing: "0.05em" }}>
          LEGEND
        </div>
        {(["critical", "warning", "clean"] as BadgeTier[]).map((tier) => (
          <div key={tier} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "99px", background: badgeStyle(tier).dot }} />
            {tier === "critical" ? "Violation / Superfund" : tier === "warning" ? "Minor violation" : "No violation"}
          </div>
        ))}
        {waterBodies.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "3px", background: WATER_COLOR, display: "inline-block" }} />
            Impaired/threatened water
          </div>
        )}
      </div>
    </div>
  );
}

export default SiteSearchMapNew;
