import { Button, ColorPicker, Divider, Popover, Segmented, Switch, Typography } from 'antd';
import { RotateCcw, Settings2 } from 'lucide-react';
import { SETTINGS_PRESETS, useSettingsStore } from '@/store/settingsStore';
import type { AppColorMode, AppNavigationMode, AppSidebarTheme } from '@/types/settings';

export function GlobalSettings() {
  return (
    <Popover trigger="click" placement="bottomRight" content={<GlobalSettingsPanel />}>
      <Button aria-label="全局设置" title="全局设置" icon={<Settings2 size={15} />} size="small" />
    </Popover>
  );
}

function GlobalSettingsPanel() {
  const settings = useSettingsStore((state) => state.settings);
  const applyPreset = useSettingsStore((state) => state.applyPreset);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const setSettingsColor = useSettingsStore((state) => state.setSettingsColor);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  return (
    <div className="global-settings-popover">
      <div className="global-settings-popover__head">
        <Typography.Text strong>全局设置</Typography.Text>
        <Button type="text" size="small" icon={<RotateCcw size={14} />} onClick={resetSettings}>
          重置
        </Button>
      </div>

      <section className="global-settings-section">
        <Typography.Text strong>主题设置</Typography.Text>
        <div className="global-settings-preset-list" aria-label="主题预设">
          {SETTINGS_PRESETS.map((preset) => {
            const active =
              preset.settings.colorMode === settings.colorMode &&
              preset.settings.compact === settings.compact &&
              preset.settings.primaryColor === settings.primaryColor &&
              preset.settings.sidebarColor === settings.sidebarColor &&
              preset.settings.sidebarTheme === settings.sidebarTheme;
            return (
              <button
                key={preset.key}
                type="button"
                className={active ? 'global-settings-preset global-settings-preset--active' : 'global-settings-preset'}
                aria-label={`应用${preset.name}主题`}
                onClick={() => applyPreset({ ...preset.settings, navigationMode: settings.navigationMode })}
              >
                <span className="global-settings-preset__swatch">
                  <span className="global-settings-preset__main" style={{ background: preset.settings.primaryColor }} />
                  <span className="global-settings-preset__side" style={{ background: preset.settings.sidebarColor }} />
                </span>
                <span className="global-settings-preset__name">{preset.name}</span>
              </button>
            );
          })}
        </div>

        <div className="global-settings-field">
          <Typography.Text type="secondary">全局模式</Typography.Text>
          <Segmented<AppColorMode>
            size="small"
            value={settings.colorMode}
            options={[
              { label: '亮色', value: 'light' },
              { label: '暗色', value: 'dark' },
            ]}
            onChange={(colorMode) => updateSettings({ colorMode })}
          />
        </div>
        <div className="global-settings-field">
          <Typography.Text type="secondary">紧凑布局</Typography.Text>
          <Switch size="small" checked={settings.compact} onChange={(compact) => updateSettings({ compact })} />
        </div>
        <div className="global-settings-field">
          <Typography.Text type="secondary">全局主题色</Typography.Text>
          <ColorPicker value={settings.primaryColor} disabledAlpha format="hex" showText onChange={(color) => setSettingsColor('primaryColor', color.toHexString())} />
        </div>
        <div className="global-settings-field">
          <Typography.Text type="secondary">侧边栏主题</Typography.Text>
          <Segmented<AppSidebarTheme>
            size="small"
            value={settings.sidebarTheme}
            options={[
              { label: '亮色', value: 'light' },
              { label: '暗色', value: 'dark' },
            ]}
            onChange={(sidebarTheme) => updateSettings({ sidebarTheme })}
          />
        </div>
        <div className="global-settings-field">
          <Typography.Text type="secondary">侧边栏颜色</Typography.Text>
          <ColorPicker value={settings.sidebarColor} disabledAlpha format="hex" showText onChange={(color) => setSettingsColor('sidebarColor', color.toHexString())} />
        </div>
      </section>

      <Divider className="global-settings-divider" />

      <section className="global-settings-section">
        <Typography.Text strong>布局设置</Typography.Text>
        <div className="global-settings-field">
          <Typography.Text type="secondary">导航模式</Typography.Text>
          <Segmented<AppNavigationMode>
            size="small"
            value={settings.navigationMode}
            options={[
              { label: '侧边', value: 'side' },
              { label: '顶部', value: 'top' },
            ]}
            onChange={(navigationMode) => updateSettings({ navigationMode })}
          />
        </div>
      </section>
    </div>
  );
}
