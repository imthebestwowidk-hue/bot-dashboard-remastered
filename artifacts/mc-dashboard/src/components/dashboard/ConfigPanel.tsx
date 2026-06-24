import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, KeyRound, LogIn, UserPlus } from "lucide-react";
import {
  useConnectBot,
  useDisconnectBot,
  useGetBotStatus,
  getGetBotStatusQueryKey,
  useSendChat,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  host: z.string().min(1, "Required"),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, "Required"),
  version: z.string().min(1, "Required"),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ConfigPanel() {
  const { data: status } = useGetBotStatus({
    query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 },
  });
  const connectMutation = useConnectBot();
  const disconnectMutation = useDisconnectBot();
  const sendChatMutation = useSendChat();

  const [manualPw, setManualPw] = useState("");
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      host: "",
      port: 25565,
      username: "Bot_001",
      version: "1.20.1",
      password: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    connectMutation.mutate({ data });
  };

  const onDisconnect = () => {
    disconnectMutation.mutate();
  };

  const sendAuth = (cmd: "register1" | "register2" | "login") => {
    if (!manualPw.trim()) {
      setAuthFeedback("Enter a password first.");
      return;
    }
    const message =
      cmd === "register1"
        ? `/register ${manualPw}`
        : cmd === "register2"
        ? `/register ${manualPw} ${manualPw}`
        : `/login ${manualPw}`;

    sendChatMutation.mutate(
      { data: { message } },
      {
        onSuccess: () => setAuthFeedback(`Sent: ${message.replace(manualPw, "••••")}`),
        onError: () => setAuthFeedback("Failed — is the bot connected?"),
      }
    );
  };

  const isConnected = status?.connected || false;
  const isConnecting = connectMutation.isPending;

  return (
    <>
      {/* ── Connection config ─────────────────────────────── */}
      <Card className="rounded-none border-border bg-card">
        <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3">
          <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
            UPLINK CONFIGURATION
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">
                        TARGET HOST
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mc.example.com"
                          className="rounded-none font-mono"
                          disabled={isConnected || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">
                        PORT
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="rounded-none font-mono"
                          disabled={isConnected || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">
                        MC VERSION
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none font-mono"
                          disabled={isConnected || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">
                        BOT ALIAS
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="rounded-none font-mono"
                          disabled={isConnected || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">
                        AUTH KEY (AUTO-REGISTER)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="rounded-none font-mono"
                          disabled={isConnected || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {isConnected ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-none uppercase font-mono tracking-widest"
                  onClick={onDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  SEVER CONNECTION
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="w-full rounded-none uppercase font-mono tracking-widest relative overflow-hidden"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ESTABLISHING UPLINK...
                    </>
                  ) : (
                    "INITIATE UPLINK"
                  )}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Manual auth override ───────────────────────────── */}
      <Card className="rounded-none border-border bg-card">
        <CardHeader className="rounded-none bg-secondary/30 border-b border-border py-3">
          <CardTitle className="uppercase tracking-widest font-mono text-sm text-primary flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            MANUAL AUTH OVERRIDE
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="uppercase tracking-widest font-mono text-xs text-muted-foreground block mb-1">
              PASSWORD
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              className="rounded-none font-mono"
              value={manualPw}
              onChange={(e) => {
                setManualPw(e.target.value);
                setAuthFeedback(null);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="rounded-none font-mono text-xs uppercase tracking-widest border-primary/40 hover:border-primary hover:bg-primary/10 justify-start gap-2"
              onClick={() => sendAuth("register1")}
              disabled={sendChatMutation.isPending}
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground mr-1">REGISTER</span>
              <code className="text-primary">/register &lt;pw&gt;</code>
            </Button>

            <Button
              variant="outline"
              className="rounded-none font-mono text-xs uppercase tracking-widest border-primary/40 hover:border-primary hover:bg-primary/10 justify-start gap-2"
              onClick={() => sendAuth("register2")}
              disabled={sendChatMutation.isPending}
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground mr-1">REGISTER ×2</span>
              <code className="text-primary">/register &lt;pw&gt; &lt;pw&gt;</code>
            </Button>

            <Button
              variant="outline"
              className="rounded-none font-mono text-xs uppercase tracking-widest border-cyan-400/40 hover:border-cyan-400 hover:bg-cyan-400/10 justify-start gap-2"
              onClick={() => sendAuth("login")}
              disabled={sendChatMutation.isPending}
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground mr-1">LOGIN</span>
              <code className="text-cyan-400">/login &lt;pw&gt;</code>
            </Button>
          </div>

          {authFeedback && (
            <p className="font-mono text-xs text-muted-foreground border border-border px-2 py-1">
              {authFeedback}
            </p>
          )}

          <p className="font-mono text-[10px] text-muted-foreground/50 leading-relaxed">
            Bot must be connected. Commands are sent as chat messages directly to the server.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
