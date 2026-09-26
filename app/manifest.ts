import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Axtarış: Azərbaycan bazarında qiymətlər",
    short_name: "Axtarış",
    description:
      "Məhsulun adını yazın və Azərbaycan bazarında kimin neçə manata satdığını bir yerdə görün.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1230",
    theme_color: "#0a1230",
    icons: [
      { src: "/manifest-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
