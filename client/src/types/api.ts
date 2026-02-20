// Re-export types from contract package
export * from '@roundsquares/contract';

// Additional types specific to client
export interface User {
  username: string;
  role: 'user' | 'admin' | 'nikita';
}
