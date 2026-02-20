// Типы запросов к API

export interface AuthRequest {
  username: string;
  password: string;
}

export interface TapRequest {
  uuid: string;
}

// Для POST /round - создание раунда (без параметров, но требует авторизации admin)
export type CreateRoundRequest = Record<string, never>;
