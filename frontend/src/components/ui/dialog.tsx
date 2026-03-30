import * as React from "react";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DialogContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>({
    open: false,
    onOpenChange: () => {},
});

function Dialog({
    open,
    onOpenChange,
    children,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = open !== undefined && onOpenChange !== undefined;

    const isOpen = isControlled ? open : internalOpen;
    const setOpen = (newOpen: boolean) => {
        if (isControlled) {
            onOpenChange(newOpen);
        } else {
            setInternalOpen(newOpen);
        }
    };

    return (
        <DialogContext.Provider value={{ open: isOpen, onOpenChange: setOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

function DialogTrigger({
    children,
    asChild,
    className,
    ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
    const { onOpenChange } = React.useContext(DialogContext);

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                if ((children.props as any).onClick) {
                    (children.props as any).onClick(e);
                }
                onOpenChange(true);
            },
        } as any);
    }

    return (
        <Button
            className={className}
            onClick={() => onOpenChange(true)}
            {...props}
        >
            {children}
        </Button>
    );
}

function DialogClose({
    className,
    children,
    asChild,
    ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
    const { onOpenChange } = React.useContext(DialogContext);

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                if ((children.props as any).onClick) {
                    (children.props as any).onClick(e);
                }
                onOpenChange(false);
            },
        } as any);
    }

    return (
        <button
            className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                className,
            )}
            onClick={() => onOpenChange(false)}
            {...props}
        >
            {children || (
                <>
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </>
            )}
        </button>
    );
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<"div"> & {
    showCloseButton?: boolean;
}) {
    const { open, onOpenChange } = React.useContext(DialogContext);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all"
                onClick={() => onOpenChange(false)}
            />
            <div
                className={cn(
                    "relative z-50 grid w-full max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg sm:rounded-lg animate-in fade-in-90 zoom-in-95",
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && <DialogClose />}
            </div>
        </div>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex flex-col gap-2 text-center sm:text-left",
                className,
            )}
            {...props}
        />
    );
}

function DialogFooter({
    className,
    showCloseButton = false,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    showCloseButton?: boolean;
}) {
    return (
        <div
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        >
            {children}
            {showCloseButton && (
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            )}
        </div>
    );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
    return (
        <h2
            className={cn(
                "text-lg font-semibold leading-none tracking-tight",
                className,
            )}
            {...props}
        />
    );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
function DialogOverlay() {
    return null;
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
