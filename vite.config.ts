import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "execution-gemini",
      fileName: () => "index.js",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@google/generative-ai",
        "execution",
        "@theunwalked/offrecord",
        "@theunwalked/spotclean",
        "node:crypto",
      ],
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [dts({ rollupTypes: true })],
});
