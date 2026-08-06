import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;

const pageModules = import.meta.glob<PageModule>(['./**/*Page.tsx', '!./auth/**/*Page.tsx', '!./errors/**/*Page.tsx']);
const pageComponentCache = new Map<string, LazyPageComponent>();

export type LazyPageComponent = LazyExoticComponent<ComponentType>;

export function resolvePageComponent(componentPath?: string | null): LazyPageComponent | null {
  if (!componentPath) {
    return null;
  }

  const normalizedPath = componentPath.startsWith('./') ? componentPath : `./${componentPath}.tsx`;
  const loader = pageModules[normalizedPath] as PageLoader | undefined;
  if (!loader) {
    return null;
  }

  const cachedPage = pageComponentCache.get(normalizedPath);
  if (cachedPage) {
    return cachedPage;
  }

  const Page = lazy(loader);
  pageComponentCache.set(normalizedPath, Page);
  return Page;
}
