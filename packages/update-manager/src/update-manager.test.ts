import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { test, expect } from "bun:test";
import { UpdateManager } from "./index";

function run(cmd: string, cwd: string) {
  execSync(cmd, { cwd, stdio: "pipe" });
}

test("fetches updates and reapplies local changes", () => {
  const root = mkdtempSync(join(tmpdir(), "upd-"));
  const remote = join(root, "remote.git");
  run("git init --bare " + remote, root);

  const work = join(root, "work");
  run("git clone " + remote + " " + work, root);
  writeFileSync(join(work, "file.txt"), "v1");
  run("git add .", work);
  run('git commit -m "init"', work);
  run("git push origin master", work);

  const local = join(root, "local");
  run("git clone " + remote + " " + local, root);

  // create update in remote
  writeFileSync(join(work, "file.txt"), "v2");
  run("git add .", work);
  run('git commit -m "update"', work);
  run("git push", work);

  // modify local config (uncommitted)
  const configPath = join(local, "config.json");
  writeFileSync(configPath, "{\"local\":true}");

  const manager = new UpdateManager({ repo: local, branch: "master" });
  expect(manager.checkForUpdate()).toBe(true);
  manager.applyUpdate();

  const localHead = execSync("git rev-parse HEAD", { cwd: local }).toString();
  const remoteHead = execSync("git rev-parse HEAD", { cwd: work }).toString();
  expect(localHead).toBe(remoteHead);
  expect(readFileSync(configPath, "utf-8")).toContain("local");
});
