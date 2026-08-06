export type AppColorMode = 'light' | 'dark';
export type AppNavigationMode = 'side' | 'top';
export type AppSidebarTheme = 'light' | 'dark';

export interface AppSettingsConfig {
  colorMode: AppColorMode;
  compact: boolean;
  navigationMode: AppNavigationMode;
  primaryColor: string;
  sidebarColor: string;
  sidebarTheme: AppSidebarTheme;
}

export interface AppSettingsPreset {
  key: string;
  name: string;
  settings: AppSettingsConfig;
}

export interface AppBrandConfig {
  appName: string;
  appSubtitle?: string;
  logoText?: string;
  logoUrl?: string;
}
