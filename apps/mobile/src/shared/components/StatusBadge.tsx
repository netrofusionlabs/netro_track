import React from 'react';
import { ViewStyle } from 'react-native';
import { Badge, BadgeVariant } from './Badge';

export type StatusType =
  | 'active'
  | 'completed'
  | 'pending'
  | 'late'
  | 'syncing'
  | 'offline'
  | 'error'
  | 'custom';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<StatusType, { defaultLabel: string; variant: BadgeVariant }> = {
  active: { defaultLabel: 'Active', variant: 'success' },
  completed: { defaultLabel: 'Completed', variant: 'success' },
  pending: { defaultLabel: 'Pending', variant: 'warning' },
  late: { defaultLabel: 'Late', variant: 'error' },
  syncing: { defaultLabel: 'Syncing...', variant: 'info' },
  offline: { defaultLabel: 'Offline', variant: 'default' },
  error: { defaultLabel: 'Error', variant: 'error' },
  custom: { defaultLabel: 'Custom', variant: 'default' },
};

export function StatusBadge({ status, label, size = 'sm', style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.custom;
  const displayLabel = label ?? config.defaultLabel;

  return (
    <Badge
      label={displayLabel}
      variant={config.variant}
      dot
      size={size}
      style={style}
    />
  );
}
