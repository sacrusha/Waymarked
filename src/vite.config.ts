import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig, type Plugin } from "vite";
import { attr } from "./app/html.ts";
import { loadTrail, resolveTrailDir } from "./build/trail.ts";

const srcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(srcDir, "..");
const trailDir = resolveTrailDir(repoRoot);
const VIRTUAL = "virtual:trail";
const RESOLVED = "\0" + VIRTUAL;

/** Serves the trail folder as the module `virtual:trail`, and names the page after the trail. */
function trailPlugin(): Plugin {
  return {
    name: "waymarked-trail",
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const t = loadTrail(trailDir);
      for (const w of t.warnings) this.warn(`${w} (fields the format doesn't know)`);
      const imports: string[] = [];
      const asset = (file: string) => {
        const name = `__img${imports.length}`;
        imports.push(`import ${name} from ${JSON.stringify(file.replace(/\\/g, "/"))};`);
        return `@@${name}@@`;
      };
      const { dir: _d, report: _r, warnings: _w, stylesheet, mark, cover, footer, ...rest } = t;
      // The trail's own look, after the engine's stylesheet (main.ts imports that first).
      if (stylesheet) imports.push(`import ${JSON.stringify(stylesheet.replace(/\\/g, "/"))};`);
      const brand = {
        mark: mark && (({ file, ...l }) => ({ ...l, url: asset(file) }))(mark),
        cover: cover && (({ file, ...im }) => ({ ...im, url: asset(file) }))(cover),
        footer: { text: footer.text, logos: footer.logos.map(({ file, ...l }) => ({ ...l, url: asset(file) })) },
      };
      const items = t.items.map(({ dir: _dir, images, audio, ...item }) => ({
        ...item,
        audio: Object.fromEntries(Object.entries(audio).map(([lang, { file, synthetic }]) => [lang, { synthetic, url: asset(file) }])),
        images: images.map(({ file, ...im }) => ({ ...im, url: asset(file) })),
      }));
      const json = JSON.stringify({ ...rest, ...brand, items }).replace(/"@@(__img\d+)@@"/g, "$1");
      return `${imports.join("\n")}\nexport default ${json};\n`;
    },
    transformIndexHtml(html) {
      const t = loadTrail(trailDir);
      const lang = t.languages[0];
      return html
        .replace(/<html lang="[^"]*"/, `<html lang="${attr(lang)}"`)
        .replace(/<title>[^<]*<\/title>/, `<title>${attr(t.items[0].title[lang])}</title>`)
        .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${attr(t.subtitle[lang] ?? "")}"`)
        .replace(/<meta name="theme-color" content="[^"]*"/, `<meta name="theme-color" content="${attr(t.theme.accentDark ?? "#ffffff")}"`)
        .replace("fill='%23333'", `fill='${encodeURIComponent(t.theme.accentDark ?? "#333")}'`);
    },
    // A change in the trail folder reloads the page with the folder read again.
    configureServer(server) {
      server.watcher.add(trailDir);
      const onChange = (file: string) => {
        if (relative(trailDir, file).startsWith("..")) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

// `npm run dev:https` (mode "https"): the same dev server over https with a
// self-signed certificate, on its own port, for phones on the home network.
// Location and the compass work only on secure pages, and a phone reaches
// this computer by its address, which plain http doesn't make secure. The
// certificate is made once and kept (src/node_modules/.vite-https/basic-ssl), so a
// phone warns about it once rather than at every start; a new one comes with
// a fresh node_modules or after 397 days. Its own cache, so it can run beside
// `npm run dev` without the two re-bundling each other's dependencies.
export default defineConfig(({ mode }) => ({
  root: srcDir,
  cacheDir: mode === "https" ? "node_modules/.vite-https" : undefined,
  // Relative asset paths: the build works at any address, e.g. a GitHub
  // Pages project site under /<repo>/.
  base: "./",
  plugins: [trailPlugin(), ...(mode === "https" ? [basicSsl({ name: "waymarked-dev", ttlDays: 397 })] : [])],
  server: {
    // Reachable from phones on the home network, not just this computer.
    host: true,
    port: mode === "https" ? 5443 : 5173,
    strictPort: mode === "https",
    // The engine and the trail folder, which WAYMARKED_TRAIL may name outside the repository.
    fs: { allow: [repoRoot, trailDir] },
  },
  preview: { host: true, port: 4173 },
  // Syntax lowered to the oldest browsers the map runs in (WebGL2: iOS 15,
  // docs/backlog.md, Stack); the default, baseline-widely-available, keeps
  // syntax (class static blocks) that Safari parses only from 16.4.
  worker: { format: "es" },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500, target: ["safari15", "chrome100", "firefox100"] },
}));
