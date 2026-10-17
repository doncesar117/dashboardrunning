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
          background: "#0E140F",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 120,
            border: "16px solid #4CC230",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#CFF5B5",
            fontSize: 42,
            fontWeight: 800,
          }}
        >
          km
        </div>
      </div>
    ),
    size
  );
}
