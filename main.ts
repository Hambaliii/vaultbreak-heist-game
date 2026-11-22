import { fileURLToPath } from "node:url";
import { mkdirSync, cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// @ts-ignore - vendor file is supplied outside the build sessions
import { buildDossier } from "./vendor/makefun-game.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });

cpSync(join(root, "game"), join(outputDir, "game"), { recursive: true });

const screenshotsSource = join(root, "screenshots");
if (existsSync(screenshotsSource)) {
  cpSync(screenshotsSource, join(outputDir, "screenshots"), { recursive: true });
}

const bytes: Uint8Array = await buildDossier(root, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, "dossier.json"), Buffer.from(bytes));
