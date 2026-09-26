import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
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
          fontSize: 270,
          fontFamily: "Georgia, serif",
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 }
  );
}
