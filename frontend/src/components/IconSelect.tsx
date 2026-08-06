import { Select } from 'antd';
import { useMemo } from 'react';
import { LucideIconView } from './LucideIconView';
import { getLucideIconNames } from '@/utils/lucideIcons';

interface IconSelectProps {
  disabled?: boolean;
  onChange?: (value?: string) => void;
  placeholder?: string;
  value?: string | null;
}

function IconOptionLabel({ name }: { name: string }) {
  return (
    <span className="icon-select-option">
      <LucideIconView name={name} size={16} />
      <span className="icon-select-option__name">{name}</span>
    </span>
  );
}

export function IconSelect({ disabled, onChange, placeholder = '选择图标', value }: IconSelectProps) {
  const options = useMemo(() => getLucideIconNames().map((name) => ({ label: name, value: name })), []);

  return (
    <Select
      allowClear
      aria-label="选择菜单图标"
      disabled={disabled}
      filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.trim().toLowerCase())}
      labelRender={(item) => <IconOptionLabel name={String(item.value ?? '')} />}
      onChange={onChange}
      optionRender={(option) => <IconOptionLabel name={String(option.value)} />}
      options={options}
      placeholder={placeholder}
      showSearch
      value={value ?? undefined}
      virtual
    />
  );
}
