import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useConnectBot, useDisconnectBot, useGetBotStatus, getGetBotStatusQueryKey } from "@workspace/api-client-react";
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
  const { data: status } = useGetBotStatus({ query: { queryKey: getGetBotStatusQueryKey(), refetchInterval: 2000 } });
  const connectMutation = useConnectBot();
  const disconnectMutation = useDisconnectBot();

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

  const isConnected = status?.connected || false;
  const isConnecting = connectMutation.isPending;

  return (
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
                    <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">TARGET HOST</FormLabel>
                    <FormControl>
                      <Input placeholder="mc.example.com" className="rounded-none font-mono" disabled={isConnected || isConnecting} {...field} />
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
                    <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">PORT</FormLabel>
                    <FormControl>
                      <Input type="number" className="rounded-none font-mono" disabled={isConnected || isConnecting} {...field} />
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
                    <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">MC VERSION</FormLabel>
                    <FormControl>
                      <Input className="rounded-none font-mono" disabled={isConnected || isConnecting} {...field} />
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
                    <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">BOT ALIAS</FormLabel>
                    <FormControl>
                      <Input className="rounded-none font-mono" disabled={isConnected || isConnecting} {...field} />
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
                    <FormLabel className="uppercase tracking-widest font-mono text-xs text-muted-foreground">AUTH KEY (OPTIONAL)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="rounded-none font-mono" disabled={isConnected || isConnecting} {...field} />
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
                {isConnecting && (
                  <div className="absolute inset-0 bg-white/10 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                )}
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
