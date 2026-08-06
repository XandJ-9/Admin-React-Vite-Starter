/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme as antdThemeApi } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setMessageInstance } from './utils/message';
import { basePath } from './utils/basePath';
import { applyThemeVariables, getThemeComponentTokens, useSettingsStore } from './store/settingsStore';
import './assets/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MessageBridge() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setMessageInstance(message);
  }, [message]);

  return null;
}

function Root() {
  const appSettings = useSettingsStore((state) => state.settings);

  useEffect(() => {
    applyThemeVariables(appSettings);
  }, [appSettings]);

  const antdThemeConfig = useMemo(
    () => ({
      algorithm: [
        appSettings.colorMode === 'dark' ? antdThemeApi.darkAlgorithm : antdThemeApi.defaultAlgorithm,
        ...(appSettings.compact ? [antdThemeApi.compactAlgorithm] : []),
      ],
      token: {
        colorPrimary: appSettings.primaryColor,
        borderRadius: 6,
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
      },
      components: getThemeComponentTokens(appSettings),
    }),
    [appSettings],
  );

  return (
    <ConfigProvider locale={zhCN} wave={{ disabled: true }} theme={antdThemeConfig}>
      <AntdApp>
        <MessageBridge />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={basePath || undefined} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
