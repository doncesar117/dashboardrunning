import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 340,
            height: 340,
            borderRadius: 340,
            border: "44px solid #4CC230",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#CFF5B5",
            fontSize: 120,
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
