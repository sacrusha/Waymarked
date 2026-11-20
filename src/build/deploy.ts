// npm run deploy: builds the site and publishes it to Cloudflare Pages, as
// secrets/cloudflare.env names it (secrets/README.md says why and how).

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { resolveTrailDir } from "./trail.ts";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(srcDir, "..");
const envFile = join(repoRoot, "secrets", "cloudflare.env");
const wrangler = join(srcDir, "node_modules", "wrangler", "bin", "wrangler.js");

const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

if (!existsSync(envFile)) fail(`No ${envFile}: secrets/README.md says what goes into it.`);
const file = parseEnv(readFileSync(envFile, "utf8"));
const required = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_PAGES_PROJECT"];
for (const v of required) if (!file[v]) fail(`${v} is not set in ${envFile} (secrets/README.md).`);

// The file alone decides where the site goes and which trail it is: values
// these names have in the shell, left from other work, are dropped.
for (const v of [...required, "THEMENWEG_TRAIL"]) delete process.env[v];
Object.assign(process.env, file);
const project = file.CLOUDFLARE_PAGES_PROJECT as string;

let trailDir = "";
try {
  trailDir = resolveTrailDir(repoRoot);
} catch (e) {
  fail(`${(e as Error).message} (THEMENWEG_TRAIL is read from ${envFile} here)`);
}

const git = (cwd: string, ...args: string[]) => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) fail(`git ${args.join(" ")} in ${cwd} failed: ${r.stderr || r.error?.message}`);
  return r.stdout.trimEnd();
};
for (const dir of [srcDir, trailDir]) {
  const changes = git(dir, "status", "--porcelain", "--", ".");
  if (changes) fail(`Uncommitted changes in ${dir}; only committed work is deployed:\n${changes}`);
}
const commit = git(repoRoot, "rev-parse", "HEAD");

const run = (label: string, cmd: string, args: string[], opts: SpawnSyncOptions = {}) => {
  console.log(`\n=== ${label}`);
  const r = spawnSync(cmd, args, { cwd: srcDir, stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
// npm is npm.cmd on Windows, which only a shell starts.
run("Check", "npm run check", [], { shell: true });
run("Build", "npm run build", [], { shell: true });

console.log(`\n=== Pages project "${project}"`);
const list = spawnSync(process.execPath, [wrangler, "pages", "project", "list", "--json"], { cwd: srcDir, encoding: "utf8" });
let projects: Record<string, string>[] = [];
try {
  projects = JSON.parse(list.stdout);
} catch {
  fail(`Couldn't read the account's Pages projects:\n${list.stdout}${list.stderr}`);
}
if (!projects.some((p) => (p["Project Name"] ?? p.name) === project)) {
  run("Creating it", process.execPath, [wrangler, "pages", "project", "create", project, "--production-branch", "main"]);
}
run(`Deploying ${trailDir} at ${commit.slice(0, 7)}`, process.execPath, [
  wrangler, "pages", "deploy", "dist", "--project-name", project, "--branch", "main", "--commit-dirty=true",
]);
console.log(`\nDone: https://${project}.pages.dev, unless Cloudflare gave the project another address (above, and in its dashboard).`);
