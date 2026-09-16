import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Project Pages URL is https://<user>.github.io/hifi-linear-psu-sim/
// `vite build` sets NODE_ENV=production; local `vite` / `vitest` keep base "/".
const base = process.env.NODE_ENV === "production" ? "/hifi-linear-psu-sim/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
