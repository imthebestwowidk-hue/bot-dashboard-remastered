import React, { useState } from "react";
import { Database, Trash2, Copy, Check, ShieldCheck } from "lucide-react";
import { useGetMemory, getGetMemoryQueryKey, useDeleteMemory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

function parseVaultKey(server: string) {
  const parts = server.split(":");
  if (parts.length >= 3) {
    const username = parts[parts.length - 1];
    const port = parts[parts.length - 2];
    const host = parts.slice(0, parts.length - 2).join(":");
    return { host, port, username };
  }
  const colonIdx = server.lastIndexOf(":");
  if (colonIdx !== -1) {
    return { host: server.slice(0, colonIdx), port: server.slice(colonIdx + 1), username: "—" };
  }
  return { host: server, port: "?", username: "—" };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy password"
      className={`p-1 rounded-none transition-colors ${copied ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

interface VaultBarProps {
  currentUsername: string;
}

export default function VaultBar({ currentUsername }: VaultBarProps) {
  const { data: memory } = useGetMemory({ query: { queryKey: getGetMemoryQueryKey(), refetchInterval: 2000 } });
  const deleteMutation = useDeleteMemory();

  const filtered = (memory ?? []).filter((entry) => {
    const { username } = parseVaultKey(entry.server);
    return username === currentUsername;
  });

  return (
    <div className="border border-border bg-card shrink-0">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 border-b border-border">
        <Database className="w-4 h-4 text-primary shrink-0" />
        <span className="uppercase tracking-widest font-mono text-sm text-primary">
          AUTHENTICATION VAULT
        </span>
        <span className="font-mono text-xs text-muted-foreground border border-border px-2 py-0.5 ml-1">
          BOT: <span className="text-foreground">{currentUsername || "—"}</span>
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "ENTRY" : "ENTRIES"}
        </span>
      </div>

      {/* Entries row */}
      <div className="flex items-stretch gap-0 overflow-x-auto min-h-[72px]">
        {filtered.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-4 font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-40 w-full">
            <Database className="w-5 h-5" />
            NO VAULT ENTRIES FOR &quot;{currentUsername}&quot;
          </div>
        ) : (
          filtered.map((entry, idx) => {
            const { host, port } = parseVaultKey(entry.server);
            const pw = entry.password ?? "";
            return (
              <div
                key={entry.server}
                className={`flex flex-col justify-between p-3 min-w-[220px] max-w-[280px] shrink-0 border-r border-border last:border-r-0 bg-card hover:bg-secondary/10 transition-colors group relative`}
              >
                {/* Server info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-foreground truncate font-semibold" title={host}>
                      {host}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground/60">
                      PORT {port}
                    </div>
                  </div>
                  {entry.registered && (
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" title="Registered" />
                  )}
                </div>

                {/* Password row */}
                <div className="flex items-center gap-1 bg-secondary/30 border border-border px-2 py-1">
                  <span className="font-mono text-xs text-primary flex-1 truncate select-all" title={pw}>
                    {pw || "—"}
                  </span>
                  <CopyButton text={pw} />
                  <button
                    onClick={() => deleteMutation.mutate({ server: entry.server })}
                    disabled={deleteMutation.isPending}
                    title="Delete entry"
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Entry index badge */}
                <div className="absolute top-1.5 right-1.5 font-mono text-[9px] text-muted-foreground/30">
                  #{String(idx + 1).padStart(2, "0")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
