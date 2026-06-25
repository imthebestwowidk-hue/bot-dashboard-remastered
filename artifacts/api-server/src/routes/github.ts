import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
const router = Router();

const WORKSPACE = path.resolve("/home/runner/workspace");

router.post("/github/push", async (req, res) => {
  const { token, repoUrl, branch = "main" } = req.body as {
    token?: string;
    repoUrl?: string;
    branch?: string;
  };

  if (!token || !repoUrl) {
    res.status(400).json({ error: "token and repoUrl are required" });
    return;
  }

  const repoPath = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "");

  if (!repoPath || !repoPath.includes("/")) {
    res.status(400).json({ error: "Invalid repo URL — expected https://github.com/user/repo" });
    return;
  }

  const pushUrl = `https://x-access-token:${token}@github.com/${repoPath}.git`;

  try {
    // Ensure git identity is set (Replit may not have it)
    await execAsync(`git -C "${WORKSPACE}" config user.email "botctrl@local" 2>/dev/null; true`);
    await execAsync(`git -C "${WORKSPACE}" config user.name "BOT_CTRL" 2>/dev/null; true`);

    // Stage everything and commit
    await execAsync(`git -C "${WORKSPACE}" add -A`);
    await execAsync(`git -C "${WORKSPACE}" commit -m "BOT_CTRL: sync" --allow-empty`);

    // Push with --force so existing files in the repo are always replaced
    const { stdout, stderr } = await execAsync(
      `git -C "${WORKSPACE}" push --force "${pushUrl}" HEAD:refs/heads/${branch}`,
      { timeout: 30000 }
    );

    const details = (stdout + stderr).replace(token, "***").trim();
    res.json({ message: "Push successful", details });
  } catch (err: any) {
    const raw: string = (err.message || err.stderr || "Unknown error");
    res.status(500).json({ error: raw.replace(token, "***") });
  }
});

export default router;
