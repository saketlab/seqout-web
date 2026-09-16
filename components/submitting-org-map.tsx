"use client";

import {
  BASEMAP_MAX_ZOOM,
  getBasemapTileUrl,
  getLeafletPopupTheme,
  MAP_ATTRIBUTION_HTML,
} from "@/utils/chart-theme";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import { Fragment, type ReactNode } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { CenterInfo } from "./submitting-org-panel";

type Props = {
  markers: CenterInfo[];
};

export default function SubmittingOrgMap({ markers }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tileUrl = getBasemapTileUrl(isDark);
  const popupTheme = getLeafletPopupTheme(isDark);

  const center: [number, number] = [
    markers[0].latitude!,
    markers[0].longitude!,
  ];

  return (
    <MapContainer
      center={center}
      zoom={3}
      style={{
        height: "100%",
        minHeight: "300px",
        width: "100%",
        borderRadius: "8px",
      }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution={MAP_ATTRIBUTION_HTML}
        url={tileUrl}
        maxZoom={BASEMAP_MAX_ZOOM}
      />
      {markers.map((m, i) => {
        // archive text is submitter-authored; keep it out of innerHTML
        const lines: ReactNode[] = [];
        if (m.organization) lines.push(<strong>{m.organization}</strong>);
        if (m.department) lines.push(m.department);
        if (m.place_name) lines.push(m.place_name);
        const location = [m.city, m.state, m.country]
          .filter(Boolean)
          .join(", ");
        if (location) lines.push(location);
        if (m.postcode) lines.push(`Postal code: ${m.postcode}`);
        if (m.formatted_address) lines.push(m.formatted_address);
        lines.push(
          <span style={{ color: popupTheme.link }}>
            {m.latitude!.toFixed(6)}, {m.longitude!.toFixed(6)}
          </span>,
        );
        return (
          <CircleMarker
            key={i}
            center={[m.latitude!, m.longitude!]}
            radius={8}
            pathOptions={{
              fillColor: popupTheme.markerFill,
              fillOpacity: 0.9,
              color: popupTheme.markerBorder,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
                {lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
