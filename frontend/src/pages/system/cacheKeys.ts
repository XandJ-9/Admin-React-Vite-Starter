export const systemCacheKeys = {
  users: (params: object) => ['system', 'users', params] as const,
  roles: (params: object) => ['system', 'roles', params] as const,
  menus: (params: object) => ['system', 'menus', params] as const,
};
