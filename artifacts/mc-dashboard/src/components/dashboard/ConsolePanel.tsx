import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, Trash2 } from "lucide-react";
import { useGetConsole, getGetConsoleQueryKey, useSendChat, useClearConsole } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ConsolePanel() {
  const [chatInput, setChatInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: consoleLogs } = useGetConsole({ limit: 100 }, { query: { queryKey: getGetConsoleQueryKey({ limit: 100 }), refetchInterval: 1500 } });
  const sendChatMutation = useSendChat();
  const clearConsoleMutation = useClearConsole();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMutation.mutate({ data: { message: chatInput } });
    setChatInput("");
  };

  const handleClear = () => {
    clearConsoleMutation.mutate();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'error': return 'text-destructive';
      case 'chat': return 'text-foreground';
      case 'info':
      case 'system': return 'text-accent';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="rounded-none border-border bg-card flex flex-col h-full">
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3 flex flex-row items-center justify-between shrink-0">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          <Terminal className="w-4 h-4" /> COM_LINK
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-none h-7 font-mono text-xs tracking-widest border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          onClick={handleClear}
          disabled={clearConsoleMutation.isPending}
        >
          <Trash2 className="w-3 h-3 mr-2" /> PURGE
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm"
        >
          {!consoleLogs || consoleLogs.length === 0 ? (
            <div className="text-muted-foreground animate-pulse">AWAITING TRANSMISSION...</div>
          ) : (
            consoleLogs.map((log) => (
              <div key={log.id} className="break-all">
                <span className="text-muted-foreground/60 mr-2 select-none">{formatTime(log.timestamp)}</span>
                <span className={getColorClass(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-border shrink-0 bg-secondary/10">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <span className="text-primary font-mono select-none">&gt;</span>
            <Input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="ENTER COMMAND OR MESSAGE..." 
              className="rounded-none font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2 placeholder:text-muted-foreground/50 h-10"
            />
            <Button 
              type="submit" 
              className="rounded-none uppercase font-mono tracking-widest min-w-[100px]"
              disabled={sendChatMutation.isPending || !chatInput.trim()}
            >
              <Send className="w-4 h-4 mr-2" /> SEND
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
