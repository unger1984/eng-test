// Экспорт всех типов из contract
export * from './models';
export * from './requests';
export * from './responses';

// Дополнительные утилитарные типы
export interface ApiEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiresAuth: boolean;
  requiresAdmin?: boolean;
}

// Константы для эндпоинтов
export const API_ENDPOINTS = {
  AUTH: {
    url: '/auth',
    method: 'POST' as const,
    requiresAuth: false,
  },
  ROUNDS: {
    url: '/rounds',
    method: 'GET' as const,
    requiresAuth: true,
  },
  ROUND: {
    url: '/round/:uuid',
    method: 'GET' as const,
    requiresAuth: true,
  },
  TAP: {
    url: '/tap',
    method: 'POST' as const,
    requiresAuth: true,
  },
  CREATE_ROUND: {
    url: '/round',
    method: 'POST' as const,
    requiresAuth: true,
    requiresAdmin: true,
  },
} as const;
