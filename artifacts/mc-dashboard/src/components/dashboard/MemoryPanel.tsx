import React from "react";
import { Database, Trash2, Check, X } from "lucide-react";
import { useGetMemory, getGetMemoryQueryKey, useDeleteMemory } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MemoryPanel() {
  const { data: memory } = useGetMemory({ query: { queryKey: getGetMemoryQueryKey() } });
  const deleteMutation = useDeleteMemory();

  const handleDelete = (server: string) => {
    deleteMutation.mutate({ server });
  };

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
              <div className="col-span-6 pl-2">SERVER IP</div>
              <div className="col-span-4 text-center">STORED KEY</div>
              <div className="col-span-2 text-right pr-2">ACTION</div>
            </div>
            {memory.map((mem) => (
              <div key={mem.server} className="grid grid-cols-12 items-center text-xs font-mono border-b border-border/50 p-2 hover:bg-secondary/10 transition-colors group">
                <div className="col-span-6 pl-2 text-foreground truncate" title={mem.server}>
                  {mem.server}
                </div>
                <div className="col-span-4 flex justify-center items-center gap-2">
                  <span className="text-muted-foreground tracking-widest">••••••••</span>
                  {mem.registered ? (
                    <Check className="w-3 h-3 text-accent" />
                  ) : (
                    <X className="w-3 h-3 text-destructive" />
                  )}
                </div>
                <div className="col-span-2 flex justify-end pr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(mem.server)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
