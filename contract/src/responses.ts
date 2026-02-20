import { Round, RoundWithScore, RoundWithResults } from './models';

// Типы ответов от API

export interface AuthResponse {
  access_token: string;
}

export interface TapResponse {
  message: string;
  score: number;
}

export type RoundsResponse = Array<Omit<Round, 'score'>>;

export type RoundResponse = RoundWithScore;

export type RoundWithResultsResponse = RoundWithResults;

export type CreateRoundResponse = Round;

// Типы для ошибок API
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
