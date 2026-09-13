import { OG, ogBackground, ogGlow } from "@/utils/constants";
import { projectOgContentType, projectOgSize } from "@/lib/project-og";
import { ImageResponse } from "next/og";

export const sectionOgSize = projectOgSize;
export const sectionOgContentType = projectOgContentType;

export type SectionOgColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type SectionOgPoint = { lat: number; lng: number; n: number };

/** Scatters points across the card by their own bounding box, not a real map projection. */
function layoutPoints(points: SectionOgPoint[], width: number, height: number) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 2);
  const lngSpan = Math.max(Math.max(...lngs) - Math.min(...lngs), 2);
  const minLat = Math.min(...lats);
  const minLng = Math.min(...lngs);
  const padX = width * 0.12;
  const padY = height * 0.12;
  const maxN = Math.max(...points.map((p) => p.n));
  return points.map((p) => ({
    x: padX + ((p.lng - minLng) / lngSpan) * (width - 2 * padX),
    y: padY + (1 - (p.lat - minLat) / latSpan) * (height - 2 * padY),
    r: 3 + Math.sqrt(p.n / maxN) * 14,
  }));
}

export function generateSectionOgImage({
  badge,
  title,
  subtitle,
  footer,
  colors,
  points,
}: {
  badge: string;
  title: string;
  subtitle: string;
  footer: string;
  colors: SectionOgColors;
  points?: SectionOgPoint[];
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          color: OG.dark.fg,
          background: ogBackground(colors.secondary),
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: ogGlow(colors.primary),
            opacity: 0.3,
            display: "flex",
          }}
        />

        {points && points.length > 0 ? (
          <svg
            width={sectionOgSize.width}
            height={sectionOgSize.height}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {layoutPoints(points, sectionOgSize.width, sectionOgSize.height).map(
              (d, i) => (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill={colors.accent}
                  fillOpacity={0.32}
                />
              ),
            )}
          </svg>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: "12px",
              fontSize: 32,
              fontWeight: 700,
              backgroundColor: colors.primary,
              color: OG.dark.fg,
              boxShadow: `0 4px 20px ${colors.primary}40`,
            }}
          >
            {badge}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: OG.dark.muted,
              display: "flex",
            }}
          >
            seqout
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: "100%",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 60,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: OG.dark.fg,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              display: "flex",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: colors.accent,
              display: "flex",
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: OG.dark.subtle,
              marginTop: 8,
              display: "flex",
            }}
          >
            {footer}
          </div>
        </div>
      </div>
    ),
    sectionOgSize,
  );
}
