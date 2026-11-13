// @effect-diagnostics nodeBuiltinImport:off - Runs the shell script against disposable local git repositories.
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect, it } from "vite-plus/test";

const script = NodePath.join(import.meta.dirname, "sync-fork.sh");

function fixture(withWorkflow: boolean) {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "sync-fork-test-"));
  const seed = NodePath.join(root, "seed");
  const fork = NodePath.join(root, "fork.git");
  const upstream = NodePath.join(root, "upstream.git");
  const bin = NodePath.join(root, "bin");
  const localScript = NodePath.join(seed, "scripts/sync-fork.sh");
  const cloneArgs = NodePath.join(root, "clone-args");
  const realGit = NodeChildProcess.execFileSync("sh", ["-c", "command -v git"], {
    encoding: "utf8",
  }).trim();
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    FORK_REPO: fork,
    UPSTREAM_REPO: upstream,
    REAL_GIT: realGit,
    CLONE_ARGS: cloneArgs,
    TMPDIR: root,
  };
  const git = (cwd: string, ...args: string[]) =>
    NodeChildProcess.execFileSync(realGit, ["-c", "core.hooksPath=/dev/null", ...args], {
      cwd,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const write = (path: string, content: string) => {
    const target = NodePath.join(seed, path);
    NodeFS.mkdirSync(NodePath.join(target, ".."), { recursive: true });
    NodeFS.writeFileSync(target, content);
  };
  try {
    NodeFS.mkdirSync(seed);
    NodeFS.mkdirSync(bin);
    NodeFS.writeFileSync(
      NodePath.join(bin, "git"),
      `#!/bin/sh
for arg do
  if [ "$arg" = clone ]; then
    printf '%s\\n' "$@" > "$CLONE_ARGS"
    break
  fi
done
exec "$REAL_GIT" "$@"
`,
      { mode: 0o755 },
    );
    NodeFS.writeFileSync(
      NodePath.join(bin, "gh"),
      `#!/bin/sh
case "$1" in
  repo) printf 'fixture/fork\n' ;;
  api) printf '%s\tmain\t%s\ttrunk\n' "$FORK_REPO" "$UPSTREAM_REPO" ;;
  *) exit 1 ;;
esac
`,
      { mode: 0o755 },
    );
    git(seed, "init", "-b", "trunk");
    write("modified.txt", "base\n");
    write("deleted.txt", "delete me\n");
    write("old name.txt", "rename me\n");
    write("upstream.txt", "base\n");
    write(".github/workflows/upstream.yml", "upstream workflow\n");
    git(seed, "add", ".");
    git(seed, "commit", "-m", "base");
    git(root, "clone", "--bare", seed, upstream);
    git(seed, "checkout", "-b", "main");
    write("modified.txt", "fork wins\n");
    write("literal [file]\nname.txt", "fork addition\n");
    git(seed, "rm", "deleted.txt");
    git(seed, "mv", "old name.txt", "new name.txt");
    git(seed, "rm", "-r", ".github/workflows");
    if (withWorkflow) {
      write(".github/workflows/sync-fork.yml", "old CI sync\n");
      write("scripts/sync-fork.sh", "old script\n");
    }
    git(seed, "add", ".");
    git(seed, "commit", "-m", "fork changes");
    git(root, "clone", "--bare", "--single-branch", "--branch", "main", seed, fork);
    git(seed, "checkout", "trunk");
    write("modified.txt", "upstream loses\n");
    write("upstream.txt", "upstream update\n");
    write(".github/workflows/new.yml", "new upstream workflow\n");
    git(seed, "add", ".");
    git(seed, "commit", "-m", "upstream update");
    git(seed, "push", upstream, "trunk");
    git(seed, "checkout", "main");
    write("remote-only.txt", "latest fork main\n");
    git(seed, "add", ".");
    git(seed, "commit", "-m", "remote fork update");
    git(seed, "push", fork, "main");
    git(seed, "reset", "--hard", "HEAD^");
    git(seed, "checkout", "-b", "local-work");
    git(seed, "remote", "add", "origin", fork);
    write("modified.txt", "uncommitted local work\n");
    write("scripts/sync-fork.sh", NodeFS.readFileSync(script, "utf8"));
    return {
      root,
      seed,
      fork,
      upstream,
      bin,
      env,
      git,
      cloneArgs,
      dryRunInTerminal: () =>
        NodeChildProcess.spawnSync(
          "script",
          HostProcess.Platform.defaultValue() === "darwin"
            ? ["-q", "/dev/null", "bash", localScript, "--repo", "fixture/fork", "--dry-run"]
            : ["-q", "-e", "-c", 'bash "$SYNC_SCRIPT" --repo fixture/fork --dry-run', "/dev/null"],
          {
            cwd: root,
            env: {
              ...env,
              SYNC_SCRIPT: localScript,
              GIT_PAGER: "printf 'UNEXPECTED_GIT_PAGER\\n'; cat",
            },
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf8",
          },
        ),
      run: (args: string[] = []) =>
        NodeChildProcess.spawnSync("bash", [localScript, "--repo", "fixture/fork", ...args], {
          cwd: root,
          env,
          encoding: "utf8",
        }),
      [Symbol.dispose]: () => NodeFS.rmSync(root, { recursive: true, force: true }),
    };
  } catch (error) {
    NodeFS.rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

it.each([true, false])(
  "syncs fork files and preserves itself with existing workflows: %s",
  (withWorkflow) => {
    using f = fixture(withWorkflow);
    const before = f.git(f.fork, "rev-parse", "main");
    const localHead = f.git(f.seed, "rev-parse", "HEAD");
    const localStatus = f.git(f.seed, "status", "--porcelain");
    const dryRun = f.dryRunInTerminal();
    expect(dryRun.status, dryRun.stderr).toBe(0);
    expect(dryRun.stdout).toContain("nothing was pushed");
    expect(dryRun.stdout + dryRun.stderr).not.toContain("UNEXPECTED_GIT_PAGER");
    expect(f.git(f.fork, "rev-parse", "main")).toBe(before);

    const synced = f.run();
    expect(synced.status, synced.stderr).toBe(0);
    const show = (path: string) => f.git(f.fork, "show", `main:${path}`);
    expect(show("modified.txt")).toBe("fork wins");
    expect(show("upstream.txt")).toBe("upstream update");
    expect(show("remote-only.txt")).toBe("latest fork main");
    expect(show("new name.txt")).toBe("rename me");
    expect(show("literal [file]\nname.txt")).toBe("fork addition");
    expect(show("scripts/sync-fork.sh")).toBe(NodeFS.readFileSync(script, "utf8").trim());
    expect(f.git(f.fork, "ls-tree", "main", "scripts/sync-fork.sh")).toMatch(/^100755 /);
    expect(
      f.git(
        f.fork,
        "ls-tree",
        "-r",
        "--name-only",
        "main",
        "--",
        ".github/workflows",
        "deleted.txt",
        "old name.txt",
      ),
    ).toBe("");
    const upstreamHead = f.git(f.upstream, "rev-parse", "trunk");
    f.git(f.fork, "merge-base", "--is-ancestor", upstreamHead, "main");
    expect(f.git(f.seed, "rev-parse", "HEAD")).toBe(localHead);
    expect(f.git(f.seed, "branch", "--show-current")).toBe("local-work");
    expect(f.git(f.seed, "status", "--porcelain")).toBe(localStatus);
    expect(NodeFS.readFileSync(NodePath.join(f.seed, "modified.txt"), "utf8")).toBe(
      "uncommitted local work\n",
    );
    expect(NodeFS.readFileSync(f.cloneArgs, "utf8").split("\n")).toContain(
      f.git(f.seed, "rev-parse", "--show-toplevel"),
    );

    const syncedHead = f.git(f.fork, "rev-parse", "main");
    const again = f.run();
    expect(again.status, again.stderr).toBe(0);
    expect(again.stdout).toContain("already synced");
    expect(f.git(f.fork, "rev-parse", "main")).toBe(syncedHead);
  },
);

it("refuses to overwrite a fork updated during the sync", () => {
  using f = fixture(true);
  const concurrentHead = f.git(f.fork, "rev-parse", "main^");
  NodeFS.writeFileSync(
    NodePath.join(f.bin, "git"),
    `#!/bin/sh
for arg do
  if [ "$arg" = push ]; then
    "$REAL_GIT" --git-dir="$FORK_REPO" update-ref refs/heads/main "${concurrentHead}"
    break
  fi
done
exec "$REAL_GIT" "$@"
`,
    { mode: 0o755 },
  );
  const result = f.run();
  expect(result.status, result.stderr).not.toBe(0);
  expect(result.stderr).toContain("stale info");
  expect(f.git(f.fork, "rev-parse", "main")).toBe(concurrentHead);
});
