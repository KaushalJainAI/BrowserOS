/** Presentation mapping for notification types, shared by the centre and toasts. */

import { CheckCircle2, Info, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react';
import type { NotificationType } from '../types/os';

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  info: 'var(--os-info)',
  success: 'var(--os-success)',
  warning: 'var(--os-warning)',
  error: 'var(--os-danger)',
};
