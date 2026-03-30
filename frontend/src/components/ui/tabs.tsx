import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

function Tabs({
    className,
    defaultValue,
    value,
    onValueChange,
    orientation = "horizontal",
    children,
    ...props
}: React.ComponentProps<"div"> & {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    orientation?: "horizontal" | "vertical";
}) {
    const [internalValue, setInternalValue] = React.useState(
        defaultValue || "",
    );
    const activeValue = value !== undefined ? value : internalValue;
    const setActiveValue = onValueChange || setInternalValue;

    return (
        <TabsContext.Provider
            value={{ value: activeValue, onValueChange: setActiveValue }}
        >
            <div
                data-slot="tabs"
                data-orientation={orientation}
                className={cn(
                    "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </TabsContext.Provider>
    );
}

const tabsListVariants = cva(
    "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
    {
        variants: {
            variant: {
                default: "bg-muted",
                line: "gap-1 bg-transparent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function TabsList({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tabsListVariants>) {
    return (
        <div
            data-slot="tabs-list"
            data-variant={variant}
            className={cn(tabsListVariants({ variant }), className)}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    value,
    ...props
}: React.ComponentProps<"button"> & { value: string }) {
    const { value: activeValue, onValueChange } = React.useContext(TabsContext);
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            data-slot="tabs-trigger"
            data-state={isActive ? "active" : "inactive"}
            onClick={() => onValueChange(value)}
            className={cn(
                "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-input/30",
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    value,
    children,
    ...props
}: React.ComponentProps<"div"> & { value: string }) {
    const { value: activeValue } = React.useContext(TabsContext);

    if (activeValue !== value) return null;

    return (
        <div
            data-slot="tabs-content"
            data-state={activeValue === value ? "active" : "inactive"}
            className={cn("flex-1 outline-none", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
