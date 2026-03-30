import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input"> & { size?: "sm" | "default" }
>(({ className, size = "default", ...props }, ref) => {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                ref={ref}
                {...props}
            />
            <div
                data-size={size}
                className={cn(
                    "peer rounded-full bg-input transition-all peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:bg-primary",
                    "data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
                    className,
                )}
            >
                <div
                    data-size={size}
                    className={cn(
                        "absolute bg-background rounded-full transition-all peer-checked:translate-x-full",
                        "data-[size=default]:h-4 data-[size=default]:w-4 data-[size=sm]:h-3 data-[size=sm]:w-3",
                        "top-0.5 peer-checked:right-auto peer-checked:left-0 data-[size=default]:left-0.5 data-[size=sm]:left-0.5",
                        "peer-checked:data-[size=default]:translate-x-[calc(100%-1px)] peer-checked:data-[size=sm]:translate-x-[calc(100%-1px)]",
                    )}
                />
            </div>
        </label>
    );
});
Switch.displayName = "Switch";

export { Switch };
