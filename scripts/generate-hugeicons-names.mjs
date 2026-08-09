// Regenerates the icon-name manifest and per-icon preview JSON files from
// the installed @hugeicons/core-free-icons package. Re-run this after
// upgrading that package so the icon picker stays in sync.
//
// Turbopack (Next 16's dev/build bundler) can't resolve dynamic
// `import()`s into a package's subpath export map (e.g.
// `import(`@hugeicons/core-free-icons/dist/esm/${name}.js`)` fails to
// build even though the literal-prefix form works fine with webpack) — so
// icon SVG data can't be lazily pulled straight from node_modules at
// runtime. Instead we pre-extract each icon's data (regex over the
// already-built ESM source, no code execution) into small static JSON
// files under public/hugeicons/, which the picker fetches by name.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(
  rootDir,
  "node_modules",
  "@hugeicons",
  "core-free-icons",
  "dist",
  "esm",
);
const namesOutPath = path.join(rootDir, "lib", "map", "hugeiconsNames.json");
const previewOutDir = path.join(rootDir, "public", "hugeicons");

const files = readdirSync(iconsDir).filter((file) => file.endsWith("Icon.js"));

mkdirSync(previewOutDir, { recursive: true });

const names = [];
for (const file of files) {
  const name = file.replace(/\.js$/, "");
  const source = readFileSync(path.join(iconsDir, file), "utf8");
  const match = source.match(/=\s*(\[[\s\S]*?\]);\s*\n\s*export default/);
  if (!match) continue;
  const svgData = JSON.parse(
    match[1]
      // the source is a JS array literal (unquoted keys) — turn it into JSON
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"'),
  );
  writeFileSync(path.join(previewOutDir, `${name}.json`), JSON.stringify(svgData));
  names.push(name);
}
names.sort((a, b) => a.localeCompare(b));

writeFileSync(namesOutPath, JSON.stringify(names) + "\n");
console.log(
  `Wrote ${names.length} icon names to ${path.relative(rootDir, namesOutPath)} and preview JSON to ${path.relative(rootDir, previewOutDir)}/`,
);
