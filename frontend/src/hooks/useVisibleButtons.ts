import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { canUseAnyButton, canUseButton } from '@/utils/accessControl';

export function useVisibleButtons(permissionCodes: string[], path?: string) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const menus = useAuthStore((state) => state.menus);
  const currentPath = path ?? location.pathname;

  return {
    canUse: (permissionCode: string) => canUseButton(menus, { path: currentPath, permissionCode }, user),
    canUseAny: canUseAnyButton(
      menus,
      permissionCodes.map((permissionCode) => ({ path: currentPath, permissionCode })),
      user,
    ),
  };
}
