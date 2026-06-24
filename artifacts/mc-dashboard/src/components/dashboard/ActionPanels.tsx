import React, { useState, useEffect } from "react";
import { useGetBotStatus, getGetBotStatusQueryKey, useSetAttackMode, useSetAntiAfk } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AttackPanel() {
  const { data: status } = useGetBotStatus({ query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 } });
  const setAttackMutation = useSetAttackMode();

  const isConnected = status?.connected || false;
  const attackMode = status?.attackMode || { enabled: false, targetPlayer: null, attackMobs: false };

  const [targetInput, setTargetInput] = useState(attackMode.targetPlayer || "");
  const [enabled, setEnabled] = useState(attackMode.enabled);
  const [attackMobs, setAttackMobs] = useState(attackMode.attackMobs);

  // Sync state when server data updates
  useEffect(() => {
    if (status?.attackMode) {
      setEnabled(status.attackMode.enabled);
      setAttackMobs(status.attackMode.attackMobs);
      if (status.attackMode.targetPlayer !== undefined) {
        setTargetInput(status.attackMode.targetPlayer || "");
      }
    }
  }, [status?.attackMode]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    setAttackMutation.mutate({ data: { enabled: checked, targetPlayer: targetInput || null, attackMobs } });
  };

  const handleMobsToggle = (checked: boolean) => {
    setAttackMobs(checked);
    setAttackMutation.mutate({ data: { enabled, targetPlayer: targetInput || null, attackMobs: checked } });
  };

  const handleLock = () => {
    setAttackMutation.mutate({ data: { enabled, targetPlayer: targetInput || null, attackMobs } });
  };

  return (
    <Card className={`rounded-none border-border bg-card transition-all duration-300 relative overflow-hidden ${enabled ? 'border-destructive/50 shadow-[0_0_15px_rgba(255,0,0,0.15)]' : ''}`}>
      {enabled && <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />}
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3 flex flex-row items-center justify-between z-10 relative">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          WEAPON SYSTEMS
        </CardTitle>
        <Switch 
          checked={enabled} 
          onCheckedChange={handleToggle} 
          disabled={!isConnected || setAttackMutation.isPending} 
          className="data-[state=checked]:bg-destructive"
        />
      </CardHeader>
      <CardContent className="p-4 space-y-4 z-10 relative">
        <div className="space-y-2">
          <Label className="uppercase tracking-widest font-mono text-xs text-muted-foreground">TARGET ENTITY (PLAYER)</Label>
          <div className="flex gap-2">
            <Input 
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="PLAYER_NAME"
              className="rounded-none font-mono"
              disabled={!isConnected || !enabled}
            />
            <Button 
              variant="outline" 
              className={`rounded-none font-mono tracking-widest uppercase ${enabled && targetInput ? 'border-destructive text-destructive hover:bg-destructive hover:text-white' : ''}`}
              onClick={handleLock}
              disabled={!isConnected || !enabled || setAttackMutation.isPending}
            >
              LOCK
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-border/50">
          <Switch 
            id="attack-mobs" 
            checked={attackMobs} 
            onCheckedChange={handleMobsToggle}
            disabled={!isConnected || !enabled || setAttackMutation.isPending}
          />
          <Label htmlFor="attack-mobs" className="uppercase tracking-widest font-mono text-xs text-foreground cursor-pointer">
            ENGAGE HOSTILE ENTITIES (MOBS)
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

export function AntiAfkPanel() {
  const { data: status } = useGetBotStatus({ query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 } });
  const setAntiAfkMutation = useSetAntiAfk();

  const isConnected = status?.connected || false;
  const antiAfk = status?.antiAfk || { enabled: false };
  const [enabled, setEnabled] = useState(antiAfk.enabled);

  useEffect(() => {
    if (status?.antiAfk) {
      setEnabled(status.antiAfk.enabled);
    }
  }, [status?.antiAfk]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    setAntiAfkMutation.mutate({ data: { enabled: checked } });
  };

  return (
    <Card className={`rounded-none border-border bg-card transition-all duration-300 relative overflow-hidden ${enabled ? 'border-primary/50 shadow-[0_0_15px_rgba(0,255,150,0.15)]' : ''}`}>
      {enabled && <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />}
      <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3 flex flex-row items-center justify-between z-10 relative">
        <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
          EVASIVE MANEUVERS (ANTI-AFK)
        </CardTitle>
        <Switch 
          checked={enabled} 
          onCheckedChange={handleToggle} 
          disabled={!isConnected || setAntiAfkMutation.isPending}
          className="data-[state=checked]:bg-primary"
        />
      </CardHeader>
      <CardContent className="p-4 z-10 relative">
        <div className={`p-3 border font-mono text-xs uppercase tracking-wider ${enabled ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
          {enabled 
            ? "> ROUTINE ACTIVE: RANDOM MOVEMENT AND JUMPING EVERY 5.0 SECONDS." 
            : "> INACTIVE. BOT MAY BE DISCONNECTED BY SERVER TIMEOUT."}
        </div>
      </CardContent>
    </Card>
  );
}
