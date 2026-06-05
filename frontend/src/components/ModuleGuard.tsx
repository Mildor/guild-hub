import { useGetModules } from "@/api/queries";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ModuleGuardProps {
  moduleCode: string;
  children: React.ReactNode;
}

export function ModuleGuard({ moduleCode, children }: ModuleGuardProps) {
  const { data: modules, isLoading } = useGetModules();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const targetModule = modules?.find((mod) => mod.code === moduleCode);

  // If the module is explicitly configured and not active, redirect to dashboard
  if (targetModule && !targetModule.isActive) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
