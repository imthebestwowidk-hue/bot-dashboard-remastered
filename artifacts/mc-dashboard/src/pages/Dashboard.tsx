import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import ConfigPanel from "@/components/dashboard/ConfigPanel";
import StatusPanel from "@/components/dashboard/StatusPanel";
import ConsolePanel from "@/components/dashboard/ConsolePanel";
import { AttackPanel, AntiAfkPanel, FollowPanel, AutoDropPanel } from "@/components/dashboard/ActionPanels";
import MemoryPanel from "@/components/dashboard/MemoryPanel";
import GitHubPanel from "@/components/dashboard/GitHubPanel";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

export default function Dashboard() {
  const [time, setTime] = useState("");
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 5000 } });

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/30">
      {/* Grid Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-3 z-0" 
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Scanline */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none z-40 mix-blend-overlay"
        animate={{ y: ["-100vh", "100vh"] }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      />

      <div className="relative z-10 p-4 max-w-[1600px] mx-auto flex flex-col gap-4 min-h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between border border-border bg-secondary/30 p-4 shrink-0">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-wider uppercase text-primary leading-none">
                BOT_CTRL V2.4
              </h1>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mt-1">
                SECURE UPLINK ESTABLISHED. AWAITING OPERATOR INPUT.
              </p>
            </div>
          </div>
          <div className="font-mono text-xl text-accent font-bold">
            {time}
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
          
          {/* Left: Config & Actions (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <ConfigPanel />
            <AttackPanel />
            <FollowPanel />
            <AutoDropPanel />
            <AntiAfkPanel />
            <GitHubPanel />
          </div>

          {/* Middle: Telemetry & Vault (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <StatusPanel />
            <MemoryPanel />
          </div>

          {/* Right: Console (5 cols) */}
          <div className="lg:col-span-5 h-[calc(100vh-8rem)] flex flex-col">
            <ConsolePanel />
          </div>

        </div>
      </div>
    </div>
  );
}
