import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1230",
          color: "#eaf1ff",
          fontSize: 96,
          fontFamily: "Georgia, serif",
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
