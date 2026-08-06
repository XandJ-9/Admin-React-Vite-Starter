import { Spin } from 'antd';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage';
import { NotFoundPage } from '@/pages/errors/NotFoundPage';
import { resolvePageComponent } from '@/pages/pageResolver';
import { useAuthStore } from '@/store/authStore';
import { toApiError } from '@/utils/errors';
import { getDefaultRoutePath, getRouteRecordByPath } from '@/utils/menu';

interface CachedBusinessPage {
  componentPath: string;
  element: ReactNode;
}

function PageRouteLoading() {
  return (
    <div className="page-route-loading">
      <Spin tip="页面加载中">
        <div className="page-route-loading__placeholder" />
      </Spin>
    </div>
  );
}

function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const accessReady = useAuthStore((state) => state.accessReady);
  const restore = useAuthStore((state) => state.restore);
  const loadAccessControl = useAuthStore((state) => state.loadAccessControl);
  const logout = useAuthStore((state) => state.logout);
  const [ready, setReady] = useState(Boolean(token && user && accessReady));

  const handleAccessLoadError = useCallback(
    async (error: unknown) => {
      const apiError = toApiError(error);
      if (apiError.status === 403) {
        navigate('/403', { replace: true });
        setReady(true);
        return;
      }

      await logout();
    },
    [logout, navigate],
  );

  useEffect(() => {
    if (token && !user) {
      restore().catch(handleAccessLoadError).finally(() => setReady(true));
      return;
    }
    if (token && user && !accessReady) {
      loadAccessControl().catch(handleAccessLoadError).finally(() => setReady(true));
      return;
    }
    setReady(true);
  }, [accessReady, handleAccessLoadError, loadAccessControl, restore, token, user]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!ready || (!accessReady && location.pathname !== '/403')) {
    return <Spin fullscreen tip="正在恢复会话" />;
  }

  return <AppLayout />;
}

function BusinessRoute() {
  const location = useLocation();
  const menus = useAuthStore((state) => state.menus);
  const cachedPagesRef = useRef(new Map<string, CachedBusinessPage>());
  const routeRecord = getRouteRecordByPath(menus, location.pathname);

  if (!routeRecord) {
    return <Navigate to="/403" replace />;
  }

  const Page = resolvePageComponent(routeRecord.componentPath);
  if (!Page) {
    return <NotFoundPage />;
  }

  const shouldKeepAlive = routeRecord.menu.tagViewEnabled !== false && routeRecord.menu.keepAliveEnabled === true;
  const cachedPage = cachedPagesRef.current.get(routeRecord.path);
  if (shouldKeepAlive && cachedPage?.componentPath !== routeRecord.componentPath) {
    cachedPagesRef.current.set(routeRecord.path, {
      componentPath: routeRecord.componentPath,
      element: <Page />,
    });
  }

  return (
    <>
      {[...cachedPagesRef.current.entries()].map(([path, page]) => {
        const active = path === routeRecord.path;
        return (
          <div key={path} hidden={!active}>
            <Suspense fallback={<PageRouteLoading />}>{page.element}</Suspense>
          </div>
        );
      })}
      {!shouldKeepAlive ? (
        <Suspense key={routeRecord.path} fallback={<PageRouteLoading />}>
          <Page />
        </Suspense>
      ) : null}
    </>
  );
}

export function App() {
  const menus = useAuthStore((state) => state.menus);
  const defaultRoutePath = useMemo(() => getDefaultRoutePath(menus), [menus]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/feishu/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={defaultRoutePath ? <Navigate to={defaultRoutePath} replace /> : <Navigate to="/403" replace />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<BusinessRoute />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
