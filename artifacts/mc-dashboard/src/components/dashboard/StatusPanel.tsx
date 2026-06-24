import React from "react";
import { Activity, Heart, Crosshair, Locate, Wifi, Server, User } from "lucide-react";
import { useGetBotStatus, getGetBotStatusQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function StatusPanel() {
  const { data: status } = useGetBotStatus({ query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 } });

  const isConnected = status?.connected || false;

  return (
    <Card className="rounded-none border-border bg-card">
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3 flex flex-row items-center justify-between">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          TELEMETRY
        </CardTitle>
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider">
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-none bg-accent animate-pulse" />
              <span className="text-accent">ONLINE // {status?.state?.toUpperCase() || 'UNKNOWN'}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-none bg-destructive" />
              <span className="text-destructive">OFFLINE</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        
        {/* Vitals */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-muted-foreground"><Heart className="w-3 h-3" /> HEALTH</span>
              <span className="text-foreground">{isConnected ? `${status?.health || 0} / 20` : '-- / --'}</span>
            </div>
            <Progress value={isConnected ? ((status?.health || 0) / 20) * 100 : 0} className="rounded-none h-2 bg-secondary [&>div]:bg-destructive" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-muted-foreground"><Activity className="w-3 h-3" /> FOOD</span>
              <span className="text-foreground">{isConnected ? `${status?.food || 0} / 20` : '-- / --'}</span>
            </div>
            <Progress value={isConnected ? ((status?.food || 0) / 20) * 100 : 0} className="rounded-none h-2 bg-secondary [&>div]:bg-orange-500" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Locate className="w-3 h-3" /> COORDS</span>
            <span className="text-primary">
              {isConnected && status?.position 
                ? `[${Math.round(status.position.x || 0)} ${Math.round(status.position.y || 0)} ${Math.round(status.position.z || 0)}]`
                : '[NO DATA]'}
            </span>
          </div>
          
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Wifi className="w-3 h-3" /> LATENCY</span>
            <span className="text-foreground">{isConnected ? `${status?.ping || 0}ms` : '--'}</span>
          </div>

          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Server className="w-3 h-3" /> HOST</span>
            <span className="text-foreground truncate max-w-[150px] text-right" title={status?.host || ''}>
              {isConnected ? status?.host : '--'}
            </span>
          </div>

          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><User className="w-3 h-3" /> ALIAS</span>
            <span className="text-foreground truncate max-w-[150px] text-right">
              {isConnected ? status?.username : '--'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
