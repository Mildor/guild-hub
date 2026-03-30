import * as React from "react";
import { cn } from "@/lib/utils";

const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

function Popover({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <PopoverContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left" ref={ref}>
                {children}
            </div>
        </PopoverContext.Provider>
    );
}

function PopoverTrigger({
    asChild,
    children,
    ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
    const { open, setOpen } = React.useContext(PopoverContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                if ((children.props as any).onClick)
                    (children.props as any).onClick(e);
                setOpen(!open);
            },
        } as any);
    }
    return (
        <button type="button" onClick={() => setOpen(!open)} {...props}>
            {children}
        </button>
    );
}

function PopoverContent({
    children,
    className,
    align = "center",
    ...props
}: React.ComponentProps<"div"> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
}) {
    const { open } = React.useContext(PopoverContext);
    if (!open) return null;

    return (
        <div
            className={cn(
                "absolute z-50 mt-2 min-w-[8rem] w-72 overflow-hidden rounded-md border bg-popover p-4 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95",
                align === "end"
                    ? "right-0"
                    : align === "start"
                      ? "left-0"
                      : "left-1/2 -translate-x-1/2",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function PopoverAnchor({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
