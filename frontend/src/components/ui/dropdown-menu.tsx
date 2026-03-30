import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

function DropdownMenu({ children }: { children: React.ReactNode }) {
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
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left" ref={ref}>
                {children}
            </div>
        </DropdownMenuContext.Provider>
    );
}

function DropdownMenuTrigger({
    asChild,
    children,
    ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
    const { open, setOpen } = React.useContext(DropdownMenuContext);
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

function DropdownMenuContent({
    children,
    className,
    align = "center",
    ...props
}: React.ComponentProps<"div"> & { align?: "start" | "center" | "end" }) {
    const { open } = React.useContext(DropdownMenuContext);
    if (!open) return null;

    return (
        <div
            className={cn(
                "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95",
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

function DropdownMenuItem({
    asChild,
    className,
    children,
    ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
    const { setOpen } = React.useContext(DropdownMenuContext);
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (props.onClick) props.onClick(e as any);
        setOpen(false);
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            className: cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                (children.props as any).className,
                className,
            ),
            onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                if ((children.props as any).onClick)
                    (children.props as any).onClick(e);
                handleClick(e);
            },
        } as any);
    }

    return (
        <div
            role="menuitem"
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                className,
            )}
            onClick={handleClick}
            {...props}
        >
            {children}
        </div>
    );
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
};
