import React from "react";
import { Database, Trash2, Check } from "lucide-react";
import { useGetMemory, getGetMemoryQueryKey, useDeleteMemory } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Vault key format: host:port:username
function parseVaultKey(server: string) {
  const parts = server.split(":");
  if (parts.length >= 3) {
    const username = parts[parts.length - 1];
    const port = parts[parts.length - 2];
    const host = parts.slice(0, parts.length - 2).join(":");
    return { host, port, username };
  }
  // Legacy format host:port (no username)
  const colonIdx = server.lastIndexOf(":");
  if (colonIdx !== -1) {
    return { host: server.slice(0, colonIdx), port: server.slice(colonIdx + 1), username: "—" };
  }
  return { host: server, port: "?", username: "—" };
}

export default function MemoryPanel() {
  const { data: memory } = useGetMemory({ query: { queryKey: getGetMemoryQueryKey(), refetchInterval: 3000 } });
  const deleteMutation = useDeleteMemory();

  return (
    <Card className="rounded-none border-border bg-card h-full flex flex-col">
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3 shrink-0">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          <Database className="w-4 h-4" /> AUTHENTICATION VAULT
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        {!memory || memory.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground uppercase tracking-widest opacity-50 flex flex-col items-center gap-2">
            <Database className="w-8 h-8" />
            VAULT EMPTY
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-12 text-xs font-mono tracking-widest uppercase text-muted-foreground border-b border-border bg-secondary/20 p-2">
              <div className="col-span-4 pl-2">SERVER</div>
              <div className="col-span-3 text-center">BOT NAME</div>
              <div className="col-span-3 text-center">KEY</div>
              <div className="col-span-2 text-right pr-2">DEL</div>
            </div>
            {memory.map((mem) => {
              const { host, port, username } = parseVaultKey(mem.server);
              return (
                <div
                  key={mem.server}
                  className="grid grid-cols-12 items-center text-xs font-mono border-b border-border/50 p-2 hover:bg-secondary/10 transition-colors group"
                >
                  <div className="col-span-4 pl-2 flex flex-col min-w-0">
                    <span className="text-foreground truncate" title={host}>{host}</span>
                    <span className="text-muted-foreground/60 text-[10px]">:{port}</span>
                  </div>
                  <div className="col-span-3 text-center text-primary/80 truncate px-1" title={username}>
                    {username}
                  </div>
                  <div className="col-span-3 flex justify-center items-center gap-1.5">
                    <span className="text-muted-foreground tracking-widest">••••••</span>
                    {mem.registered && <Check className="w-3 h-3 text-primary shrink-0" />}
                  </div>
                  <div className="col-span-2 flex justify-end pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate({ server: mem.server })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
