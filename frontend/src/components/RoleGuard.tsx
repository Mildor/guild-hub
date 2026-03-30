import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AppRole } from '@/types/auth';

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.appRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
