import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-low/70 p-1 text-on-surface-variant backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wide transition-all duration-150 border border-transparent data-[state=active]:bg-transparent data-[state=active]:text-on-surface data-[state=active]:font-bold data-[state=active]:border-orange-500/50 data-[state=active]:shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:text-on-surface",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
