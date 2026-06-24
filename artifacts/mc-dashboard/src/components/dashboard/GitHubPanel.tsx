import React, { useState } from "react";
import { Github, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GitHubPanel() {
  const [token, setToken] = useState("");
  const [repoUrl, setRepoUrl] = useState(() => localStorage.getItem("gh_repo") ?? "");
  const [branch, setBranch] = useState(() => localStorage.getItem("gh_branch") ?? "main");
  const [pushStatus, setPushStatus] = useState<"idle" | "pushing" | "ok" | "error">("idle");
  const [pushMsg, setPushMsg] = useState("");

  const save = (key: string, val: string) => localStorage.setItem(key, val);

  const handlePush = async () => {
    if (!token.trim() || !repoUrl.trim()) {
      setPushStatus("error");
      setPushMsg("Enter token and repo URL first.");
      return;
    }
    setPushStatus("pushing");
    setPushMsg("");
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || "main",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushStatus("error");
        setPushMsg(data.error ?? "Push failed");
      } else {
        setPushStatus("ok");
        setPushMsg(data.details || data.message || "Pushed successfully");
      }
    } catch (err: any) {
      setPushStatus("error");
      setPushMsg(err.message ?? "Network error");
    }
  };

  return (
    <Card className="rounded-none border-border bg-card">
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          <Github className="h-4 w-4" />
          GITHUB SYNC
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">

        <div>
          <label className="uppercase tracking-widest font-mono text-xs text-muted-foreground block mb-1">
            PERSONAL ACCESS TOKEN
          </label>
          <Input
            type="password"
            placeholder="ghp_••••••••••••••••••••••••••••••••••••••"
            className="rounded-none font-mono text-xs"
            value={token}
            onChange={(e) => { setToken(e.target.value); setPushStatus("idle"); }}
          />
          <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">
            Never stored — used only for this push.
          </p>
        </div>

        <div>
          <label className="uppercase tracking-widest font-mono text-xs text-muted-foreground block mb-1">
            REPOSITORY URL
          </label>
          <Input
            type="text"
            placeholder="https://github.com/user/repo"
            className="rounded-none font-mono text-xs"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); save("gh_repo", e.target.value); setPushStatus("idle"); }}
          />
        </div>

        <div>
          <label className="uppercase tracking-widest font-mono text-xs text-muted-foreground block mb-1">
            BRANCH
          </label>
          <Input
            type="text"
            placeholder="main"
            className="rounded-none font-mono"
            value={branch}
            onChange={(e) => { setBranch(e.target.value); save("gh_branch", e.target.value); setPushStatus("idle"); }}
          />
        </div>

        <Button
          className="w-full rounded-none uppercase font-mono tracking-widest"
          onClick={handlePush}
          disabled={pushStatus === "pushing"}
        >
          {pushStatus === "pushing" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />PUSHING...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />PUSH TO GITHUB</>
          )}
        </Button>

        {pushStatus === "ok" && (
          <div className="flex items-start gap-2 font-mono text-xs text-primary border border-primary/30 px-2 py-1.5">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="break-all">{pushMsg}</span>
          </div>
        )}
        {pushStatus === "error" && (
          <div className="flex items-start gap-2 font-mono text-xs text-destructive border border-destructive/30 px-2 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="break-all">{pushMsg}</span>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
