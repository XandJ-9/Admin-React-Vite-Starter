import { getLucideIcon } from '@/utils/lucideIcons';

interface LucideIconViewProps {
  name?: string | null;
  size?: number;
}

export function LucideIconView({ name, size = 16 }: LucideIconViewProps) {
  const Icon = getLucideIcon(name);
  return Icon ? <Icon size={size} strokeWidth={1.9} /> : null;
}
