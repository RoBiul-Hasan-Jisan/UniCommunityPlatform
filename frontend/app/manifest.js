export default function manifest() {
  return {
    name: "UniConnect — University Student & Alumni Community",
    short_name: "UniConnect",
    description: "Connect, learn, and grow with students and alumni.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#F7F5EF",
    theme_color: "#12192B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
