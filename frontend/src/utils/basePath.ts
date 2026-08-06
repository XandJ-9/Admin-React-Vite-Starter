// 部署子路径前缀（去掉尾部斜杠），由 VITE_BASE_PATH 控制。
// 路由 basename、API baseURL 和登录跳转路径共用此值，保证子路径部署一致。
// 为空表示根路径部署，不拼接前缀。
export const basePath = (import.meta.env.VITE_BASE_PATH || '').replace(/\/+$/, '');
