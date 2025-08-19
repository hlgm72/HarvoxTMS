import { Badge } from "@/components/ui/badge";

export interface RoleConfig {
  label: string;
  emoji: string;
  className: string;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  'superadmin': {
    label: 'Super Admin',
    emoji: '🔧',
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
  },
  'company_owner': {
    label: 'Owner',
    emoji: '👑',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
  },
  'company_admin': {
    label: 'Company Admin',
    emoji: '👨‍💼',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
  },
  'dispatcher': {
    label: 'Dispatcher',
    emoji: '📋',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
  },
  'driver': {
    label: 'Driver',
    emoji: '🚛',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700'
  },
  'multi_company_dispatcher': {
    label: 'Multi-Company Dispatcher',
    emoji: '🏢',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700'
  }
};

export const getRoleConfig = (role: string): RoleConfig => {
  return ROLE_CONFIGS[role] || {
    label: role,
    emoji: '👤',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700'
  };
};

export const getRoleLabel = (role: string, includeEmoji: boolean = true): string => {
  const config = getRoleConfig(role);
  return includeEmoji ? `${config.emoji} ${config.label}` : config.label;
};

export const getRoleBadgeClassName = (role: string): string => {
  return getRoleConfig(role).className;
};