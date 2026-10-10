import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

type RuntimeState = Record<string, unknown[]>;

const configuredPath = process.env.THIRDPLACE_DATA_FILE;
const memoryOnly = configuredPath === ":memory:"
  || (!configuredPath && process.argv.some((value) => /(?:\.test\.mjs|payments-smoke)/.test(value)));

const defaultPath = basename(process.cwd()).toLowerCase() === "api"
  ? resolve(process.cwd(), ".data", "runtime.json")
  : resolve(process.cwd(), "apps", "api", ".data", "runtime.json");

const statePath = process.env.THIRDPLACE_DATA_FILE || defaultPath;
let loaded: RuntimeState | undefined;

function load(): RuntimeState {
  if (loaded) return loaded;
  if (memoryOnly || !existsSync(statePath)) return (loaded = {});
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    return (loaded = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as RuntimeState : {});
  } catch {
    console.warn("[storage] Runtime data could not be read; starting with seed data.");
    return (loaded = {});
  }
}

/** Small durable JSON boundary for the prototype. Production can replace this module with a database. */
export function storedCollection<T>(key: string, seed: T[]): T[] {
  const state = load();
  if (!Array.isArray(state[key])) state[key] = structuredClone(seed) as unknown[];
  return state[key] as T[];
}

export function saveRuntimeState(): void {
  if (memoryOnly) return;
  const state = load();
  mkdirSync(dirname(statePath), { recursive: true });
  const temporary = `${statePath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(temporary, statePath);
}
