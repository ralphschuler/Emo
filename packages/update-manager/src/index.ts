import { execSync } from "node:child_process";

export interface UpdateManagerOptions {
  repo: string;
  remote?: string;
  branch?: string;
  intervalMs?: number;
  onUpdateApplied?: () => void;
}

export class UpdateManager {
  private timer?: NodeJS.Timer;
  constructor(private opts: UpdateManagerOptions) {}

  start() {
    const interval = this.opts.intervalMs ?? 5 * 60 * 1000;
    this.timer = setInterval(() => {
      if (this.checkForUpdate()) {
        this.applyUpdate();
      }
    }, interval);
    return this.timer;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  checkForUpdate(): boolean {
    const { branch = "main", remote = "origin" } = this.opts;
    this.git(["fetch", remote]);
    const local = this.git(["rev-parse", branch]).trim();
    const remoteHash = this.git(["rev-parse", `${remote}/${branch}`]).trim();
    return local !== remoteHash;
  }

  applyUpdate() {
    const { branch = "main", remote = "origin" } = this.opts;
    const hasChanges = this.git(["status", "--porcelain"]).trim().length > 0;
    if (hasChanges) {
      this.git(["stash", "--include-untracked"]);
    }
    this.git(["pull", remote, branch]);
    if (hasChanges) {
      try {
        this.git(["stash", "pop"]);
      } catch {
        // ignore if stash pop fails
      }
    }
    this.opts.onUpdateApplied?.();
  }

  private git(args: string[]): string {
    return execSync(`git ${args.join(" ")}`, {
      cwd: this.opts.repo,
      stdio: "pipe",
      encoding: "utf-8",
    });
  }
}
