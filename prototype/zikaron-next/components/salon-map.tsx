"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Salon } from "@/lib/types";

export interface MapSalon {
  salon: Salon;
  left: number;
}

const pin = (label: string, state: "open" | "full" | "active") =>
  L.divIcon({
    className: "",
    html: `<div class="salon-pin ${state === "full" ? "is-full" : ""} ${state === "active" ? "is-active" : ""}"><span>${label}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

// Only salons with real coordinates reach the map — invalid data can never crash the page.
const valid = (s: Salon) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180;

export default function SalonMap({ items, activeId, onSelect }: { items: MapSalon[]; activeId?: string; onSelect: (id: string) => void }) {
  const physical = items.filter((i) => !i.salon.digital && valid(i.salon));
  const points = physical.map((i) => [i.salon.lat, i.salon.lng] as [number, number]);
  return (
    <MapContainer center={[31.9, 34.85]} zoom={8} minZoom={7} scrollWheelZoom className="size-full" attributionControl>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {physical.map(({ salon, left }) => (
        <Marker
          key={salon.id}
          position={[salon.lat, salon.lng]}
          icon={pin(left > 0 ? String(left) : "מלא", salon.id === activeId ? "active" : left > 0 ? "open" : "full")}
          eventHandlers={{ click: () => onSelect(salon.id) }}
          title={`הסלון של ${salon.hostName}`}
        />
      ))}
    </MapContainer>
  );
}
