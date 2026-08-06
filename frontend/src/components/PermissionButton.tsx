import { forwardRef } from 'react';
import { Button, type ButtonProps } from 'antd';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { canUseButton } from '@/utils/accessControl';

interface PermissionButtonProps extends ButtonProps {
  permissionCode: string;
  path?: string | null;
  fallback?: 'hidden' | 'disabled';
}

export const PermissionButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, PermissionButtonProps>(function PermissionButton(
  { permissionCode, path, fallback = 'hidden', disabled, ...props },
  ref,
) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const menus = useAuthStore((state) => state.menus);
  const permitted = canUseButton(menus, { permissionCode, path: path ?? location.pathname }, user);

  if (!permitted && fallback === 'hidden') {
    return null;
  }

  return <Button ref={ref} {...props} disabled={disabled || !permitted} />;
});
