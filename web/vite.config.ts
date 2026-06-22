import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" keeps asset + data fetch paths relative so the static build works
// whether served from a domain root or a sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
