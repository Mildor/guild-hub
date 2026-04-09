import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input"> & { size?: "sm" | "default" }
>(({ className, size = "default", ...props }, ref) => {
    const trackSize = size === "sm" ? "h-3.5 w-6" : "h-5 w-9";
    const thumbBase =
        size === "sm"
            ? "after:h-2.5 after:w-2.5 after:top-[0.125rem] after:left-[0.125rem] peer-checked:after:translate-x-2.5"
            : "after:h-4 after:w-4 after:top-0.5 after:left-0.5 peer-checked:after:translate-x-4";

    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                ref={ref}
                {...props}
            />
            <div
                className={cn(
                    "relative rounded-full bg-input transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:bg-primary",
                    "after:absolute after:rounded-full after:bg-background after:transition-transform",
                    trackSize,
                    thumbBase,
                    className,
                )}
            />
        </label>
    );
});
Switch.displayName = "Switch";

export { Switch };
