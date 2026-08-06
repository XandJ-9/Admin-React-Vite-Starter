import { create } from 'zustand';
import type { AppNavigationMode, AppSettingsConfig, AppSettingsPreset } from '@/types/settings';
import { mixHexColors, normalizeHexColor, toRgba } from '@/utils/color';
import { readJsonSetting, writeJsonSetting } from '@/utils/storage';

type SettingsColorField = 'primaryColor' | 'sidebarColor';

interface SettingsState {
  settings: AppSettingsConfig;
  applyPreset: (settings: AppSettingsConfig) => void;
  resetSettings: () => void;
  setSettingsColor: (key: SettingsColorField, color: string) => void;
  updateSettings: (patch: Partial<AppSettingsConfig>) => void;
}

export const DEFAULT_SETTINGS: AppSettingsConfig = {
  colorMode: 'light',
  compact: false,
  navigationMode: 'side',
  primaryColor: '#1f7a5a',
  sidebarColor: '#182535',
  sidebarTheme: 'dark',
};

export const SETTINGS_PRESETS: AppSettingsPreset[] = [
  { key: 'default', name: '默认', settings: DEFAULT_SETTINGS },
  {
    key: 'light-blue',
    name: '亮蓝',
    settings: { colorMode: 'light', compact: false, navigationMode: 'side', primaryColor: '#1677ff', sidebarColor: '#ffffff', sidebarTheme: 'light' },
  },
  {
    key: 'tech-blue',
    name: '科技蓝',
    settings: { colorMode: 'light', compact: true, navigationMode: 'side', primaryColor: '#0369a1', sidebarColor: '#172554', sidebarTheme: 'dark' },
  },
  {
    key: 'emerald',
    name: '森绿',
    settings: { colorMode: 'light', compact: false, navigationMode: 'side', primaryColor: '#15803d', sidebarColor: '#1f2d2a', sidebarTheme: 'dark' },
  },
  {
    key: 'warm',
    name: '暖橙',
    settings: { colorMode: 'light', compact: false, navigationMode: 'side', primaryColor: '#b45309', sidebarColor: '#2d3036', sidebarTheme: 'dark' },
  },
  {
    key: 'dark-green',
    name: '暗绿',
    settings: { colorMode: 'dark', compact: false, navigationMode: 'side', primaryColor: '#22c55e', sidebarColor: '#10231d', sidebarTheme: 'dark' },
  },
  {
    key: 'dark-violet',
    name: '暗紫',
    settings: { colorMode: 'dark', compact: false, navigationMode: 'side', primaryColor: '#8b5cf6', sidebarColor: '#24213a', sidebarTheme: 'dark' },
  },
  {
    key: 'compact-slate',
    name: '紧凑灰',
    settings: { colorMode: 'light', compact: true, navigationMode: 'side', primaryColor: '#475569', sidebarColor: '#f8fafc', sidebarTheme: 'light' },
  },
];

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: readStoredSettings(),
  applyPreset(settings) {
    const nextSettings = normalizeSettings(settings);
    saveSettings(nextSettings);
    set({ settings: nextSettings });
  },
  resetSettings() {
    saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
  setSettingsColor(key, color) {
    const normalizedColor = normalizeHexColor(color);
    if (!normalizedColor) {
      return;
    }

    set((state) => {
      const nextSettings = { ...state.settings, [key]: normalizedColor };
      saveSettings(nextSettings);
      return { settings: nextSettings };
    });
  },
  updateSettings(patch) {
    set((state) => {
      const nextSettings = normalizeSettings({ ...state.settings, ...patch });
      saveSettings(nextSettings);
      return { settings: nextSettings };
    });
  },
}));

export function applyThemeVariables(settings: AppSettingsConfig): void {
  if (typeof document === 'undefined') {
    return;
  }

  const normalizedTheme = normalizeSettings(settings);
  const rootStyle = document.documentElement.style;
  const darkGlobal = normalizedTheme.colorMode === 'dark';
  const darkSidebar = normalizedTheme.sidebarTheme === 'dark';
  const primaryColor = normalizedTheme.primaryColor;
  const sidebarColor = normalizedTheme.sidebarColor;

  rootStyle.setProperty('--admin-bg', darkGlobal ? '#111827' : '#f4f6f8');
  rootStyle.setProperty('--admin-bg-strong', darkGlobal ? '#0f172a' : '#e7ecf1');
  rootStyle.setProperty('--admin-surface', darkGlobal ? '#1f2937' : '#ffffff');
  rootStyle.setProperty('--admin-surface-subtle', darkGlobal ? '#273244' : '#f9fafb');
  rootStyle.setProperty('--admin-border', darkGlobal ? '#374151' : '#d9e0e7');
  rootStyle.setProperty('--admin-border-strong', darkGlobal ? '#4b5563' : '#bac6d3');
  rootStyle.setProperty('--admin-text', darkGlobal ? '#f3f4f6' : '#1f2933');
  rootStyle.setProperty('--admin-text-subtle', darkGlobal ? '#aeb8c6' : '#667789');
  rootStyle.setProperty('--admin-header-bg', darkGlobal ? 'rgba(31, 41, 55, 0.94)' : 'rgba(255, 255, 255, 0.94)');
  rootStyle.setProperty('--admin-primary', primaryColor);
  rootStyle.setProperty('--admin-primary-strong', mixHexColors(primaryColor, '#000000', 0.12));
  rootStyle.setProperty('--admin-primary-soft', toRgba(primaryColor, 0.11));
  rootStyle.setProperty('--admin-primary-selected', toRgba(primaryColor, 0.26));
  rootStyle.setProperty('--admin-primary-ring', toRgba(primaryColor, 0.38));
  rootStyle.setProperty('--admin-sidebar-bg', sidebarColor);
  rootStyle.setProperty('--admin-sidebar-bg-hover', toRgba(darkSidebar ? '#ffffff' : '#000000', darkSidebar ? 0.08 : 0.05));
  rootStyle.setProperty('--admin-sidebar-border', toRgba(darkSidebar ? '#ffffff' : '#000000', 0.08));
  rootStyle.setProperty('--admin-sidebar-text', darkSidebar ? mixHexColors(sidebarColor, '#ffffff', 0.74) : '#1f2933');
  rootStyle.setProperty('--admin-sidebar-text-subtle', darkSidebar ? mixHexColors(sidebarColor, '#ffffff', 0.58) : '#667789');
  rootStyle.setProperty('--admin-sidebar-text-strong', darkSidebar ? '#ffffff' : '#111827');
  rootStyle.setProperty('--admin-sidebar-scrollbar', toRgba(darkSidebar ? mixHexColors(sidebarColor, '#ffffff', 0.7) : '#64748b', 0.24));
  rootStyle.setProperty('--admin-logo-name', darkSidebar ? '#ffffff' : mixHexColors(primaryColor, '#000000', 0.22));
  rootStyle.setProperty('--admin-logo-name-shadow', darkSidebar ? toRgba(primaryColor, 0.42) : toRgba(primaryColor, 0.18));
  rootStyle.setProperty('--admin-logo-start', mixHexColors(primaryColor, '#ffffff', 0.16));
  rootStyle.setProperty('--admin-logo-end', primaryColor);
}

export function getThemeComponentTokens(settings: AppSettingsConfig) {
  const normalizedTheme = normalizeSettings(settings);
  const darkGlobal = normalizedTheme.colorMode === 'dark';
  const darkSidebar = normalizedTheme.sidebarTheme === 'dark';
  const sidebarText = darkSidebar ? mixHexColors(normalizedTheme.sidebarColor, '#ffffff', 0.74) : '#1f2933';
  const sidebarHoverBg = toRgba(darkSidebar ? '#ffffff' : '#000000', darkSidebar ? 0.08 : 0.05);
  const sidebarSelectedBg = darkSidebar ? toRgba(normalizedTheme.primaryColor, 0.26) : toRgba(normalizedTheme.primaryColor, 0.12);
  const sidebarSelectedColor = darkSidebar ? '#ffffff' : normalizedTheme.primaryColor;

  return {
    Layout: {
      bodyBg: darkGlobal ? '#111827' : '#f4f6f8',
      headerBg: darkGlobal ? '#1f2937' : '#ffffff',
      lightSiderBg: normalizedTheme.sidebarColor,
      siderBg: normalizedTheme.sidebarColor,
    },
    Menu: {
      darkItemBg: normalizedTheme.sidebarColor,
      darkItemColor: sidebarText,
      darkItemHoverBg: sidebarHoverBg,
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: sidebarSelectedBg,
      darkItemSelectedColor: sidebarSelectedColor,
      darkSubMenuItemBg: normalizedTheme.sidebarColor,
      itemBg: normalizedTheme.sidebarColor,
      itemColor: sidebarText,
      itemHoverBg: sidebarHoverBg,
      itemHoverColor: darkSidebar ? '#ffffff' : '#111827',
      itemSelectedBg: sidebarSelectedBg,
      itemSelectedColor: sidebarSelectedColor,
      subMenuItemBg: normalizedTheme.sidebarColor,
    },
    Table: {
      headerBg: darkGlobal ? '#273244' : '#f4f6f8',
      rowHoverBg: darkGlobal ? '#243047' : '#f7faf9',
    },
  };
}

function readStoredSettings(): AppSettingsConfig {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  const rawSettings = readJsonSetting<Partial<AppSettingsConfig>>();
  return rawSettings ? normalizeSettings(rawSettings) : DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettingsConfig): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  writeJsonSetting(settings);
}

function normalizeSettings(settings: Partial<AppSettingsConfig>): AppSettingsConfig {
  return {
    colorMode: settings.colorMode === 'dark' ? 'dark' : DEFAULT_SETTINGS.colorMode,
    compact: typeof settings.compact === 'boolean' ? settings.compact : DEFAULT_SETTINGS.compact,
    navigationMode: normalizeNavigationMode(settings.navigationMode),
    primaryColor: normalizeHexColor(settings.primaryColor) ?? DEFAULT_SETTINGS.primaryColor,
    sidebarColor: normalizeHexColor(settings.sidebarColor) ?? DEFAULT_SETTINGS.sidebarColor,
    sidebarTheme: settings.sidebarTheme === 'light' ? 'light' : DEFAULT_SETTINGS.sidebarTheme,
  };
}

function normalizeNavigationMode(navigationMode: unknown): AppNavigationMode {
  return navigationMode === 'top' ? 'top' : DEFAULT_SETTINGS.navigationMode;
}
