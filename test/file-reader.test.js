import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { safeReadServerFile } from "../src/utils/file-reader.js";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "cmg-file-reader-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = join(root, "data");
  const sibling = join(root, "database");
  await mkdir(base);
  await mkdir(sibling);
  await writeFile(join(base, "allowed.txt"), "allowed");
  await writeFile(join(sibling, "private.txt"), "outside");
  return { root, base, sibling };
}

test("reads a file inside the allowed root as an ES module", async (t) => {
  const { base } = await fixture(t);
  assert.equal(await safeReadServerFile(base, "allowed.txt"), "allowed");
});

test("rejects a sibling path sharing the allowed directory prefix", async (t) => {
  const { base } = await fixture(t);
  await assert.rejects(safeReadServerFile(base, "../database/private.txt"), /Path traversal/);
});

test("rejects an absolute path outside the allowed root", async (t) => {
  const { base, sibling } = await fixture(t);
  await assert.rejects(safeReadServerFile(base, join(sibling, "private.txt")), /Path traversal/);
});

test("rejects symlinks pointing outside the allowed root", { skip: process.platform === "win32" }, async (t) => {
  const { base, sibling } = await fixture(t);
  await symlink(sibling, join(base, "escape"), "dir");
  await assert.rejects(safeReadServerFile(base, "escape/private.txt"), /Path traversal/);
});

test("allows a symlink whose real target remains inside the root", { skip: process.platform === "win32" }, async (t) => {
  const { base } = await fixture(t);
  await symlink(join(base, "allowed.txt"), join(base, "alias.txt"));
  assert.equal(await safeReadServerFile(base, "alias.txt"), "allowed");
});

test("propagates a missing-file error without reading another file", async (t) => {
  const { base } = await fixture(t);
  await assert.rejects(safeReadServerFile(base, "missing.txt"), { code: "ENOENT" });
});

test("rejects invalid configuration inputs", async () => {
  await assert.rejects(safeReadServerFile("", "allowed.txt"), TypeError);
  await assert.rejects(safeReadServerFile("/tmp", null), TypeError);
});
