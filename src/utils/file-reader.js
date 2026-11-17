import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Read an existing file only when its real path is inside the allowed root. */
export async function safeReadServerFile(baseDir, userPath) {
  if (typeof baseDir !== "string" || !baseDir.trim() || typeof userPath !== "string" || !userPath) {
    throw new TypeError("A non-empty base directory and file path are required.");
  }
  const base = await realpath(resolve(baseDir));
  const target = await realpath(resolve(base, userPath));
  const fromBase = relative(base, target);
  if (fromBase === ".." || fromBase.startsWith(`..${sep}`) || isAbsolute(fromBase)) {
    throw new Error("Security Error: Path traversal attempt detected.");
  }
  return readFile(target, "utf8");
}
