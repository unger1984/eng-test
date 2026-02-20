import type {
  AuthRequest,
  AuthResponse,
  RoundsResponse,
  RoundResponse,
  RoundWithResultsResponse,
  TapRequest,
  TapResponse,
  CreateRoundResponse,
  User,
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async auth(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    return response.json();
  }

  async getRounds(): Promise<RoundsResponse> {
    const response = await fetch(`${API_URL}/rounds`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rounds');
    }

    return response.json();
  }

  async getRound(uuid: string): Promise<RoundResponse | RoundWithResultsResponse> {
    const response = await fetch(`${API_URL}/round/${uuid}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch round');
    }

    return response.json();
  }

  async tap(uuid: string): Promise<TapResponse> {
    const tapRequest: TapRequest = { uuid };
    const response = await fetch(`${API_URL}/tap`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(tapRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to perform tap');
    }

    return response.json();
  }

  async performTap(uuid: string): Promise<TapResponse> {
    return this.tap(uuid);
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async createRound(): Promise<CreateRoundResponse> {
    const response = await fetch(`${API_URL}/round`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create round');
    }

    return response.json();
  }

  decodeToken(): User | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        username: payload.username,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.decodeToken();
    return user?.role === 'admin';
  }
}

export const apiService = new ApiService();
