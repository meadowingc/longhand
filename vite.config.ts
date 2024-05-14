import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import replace from "@rollup/plugin-replace";
import { execSync } from "child_process";

let commitHash = "dev";
if (process.env.NODE_ENV === "production") {
  commitHash = execSync("git rev-parse HEAD").toString().trim();
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    replace({
      __commitHash__: commitHash.substring(0, 7),
      preventAssignment: true,
    }),
  ],
});
