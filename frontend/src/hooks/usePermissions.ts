import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { user, loading } = useAuth();

  const roleNames = useMemo(() => {
    return new Set(user?.roles?.map((role) => role.name) ?? []);
  }, [user?.roles]);

  const permissionNames = useMemo(() => {
    return new Set(user?.permissions ?? []);
  }, [user?.permissions]);

  const permissions = useMemo(() => {
    if (loading) {
      return {
        hasRole: () => false,
        hasAnyRole: () => false,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        isAdmin: () => false,
        isOwner: () => false,
      };
    }

    // Предварительно собираем Set, чтобы не пробегать массивы ролей и прав на каждом вызове.
    const hasRole = (roleName: string): boolean => {
      return roleNames.has(roleName);
    };

    const hasAnyRole = (roleNames: string[]): boolean => {
      return roleNames.some(hasRole);
    };

    const hasPermission = (permissionName: string): boolean => {
      return permissionNames.has(permissionName);
    };

    const hasAnyPermission = (permissionNames: string[]): boolean => {
      return permissionNames.some((permissionName) => hasPermission(permissionName));
    };

    const hasAllPermissions = (permissionNames: string[]): boolean => {
      return permissionNames.every((permissionName) => hasPermission(permissionName));
    };

    const isAdmin = (): boolean => {
      return hasRole('admin');
    };

    const isOwner = (resourceUserId: number): boolean => {
      return user?.id === resourceUserId || isAdmin();
    };

    return {
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdmin,
      isOwner
    };
  }, [loading, permissionNames, roleNames, user?.id]);

  return {
    user,
    loading,
    ...permissions
  };
};
