// Updated auth service for the new backend
import { apiClient } from './api.js';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  is_verified: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('Starting user registration process...');
      
      const response = await apiClient.register(data);

      if (!response.success) {
        return { user: null, error: response.error || 'Registration failed' };
      }

      console.log('User registration completed successfully');
      return { user: (response.data as { user: AuthUser })?.user || null, error: null };

    } catch (error) {
      console.error('Unexpected error during signup:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Sign up failed due to unexpected error' 
      };
    }
  }

  async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const response = await apiClient.login(data);

      if (!response.success) {
        return { user: null, error: response.error || 'Login failed' };
      }

      return { user: (response.data as { user: AuthUser })?.user || null, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      await apiClient.logout();
      return { error: null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await apiClient.getCurrentUser();
      
      if (!response.success) {
        return null;
      }

      return (response.data as AuthUser) || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<AuthUser | null> {
    // For the new backend, we use getCurrentUser since we don't need userId
    return this.getCurrentUser();
  }

  async updateUserProfile(userId: string, updates: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.updateProfile(updates);
      
      if (!response.success) {
        return { success: false, error: response.error || 'Update failed' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    // Password reset functionality would need to be implemented in the backend
    return { error: 'Password reset not implemented yet' };
  }

  // Listen to auth state changes (simplified for new backend)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // For the new backend, we'll use a simple approach
    // You might want to implement a more sophisticated state management
    const checkAuthState = async () => {
      try {
        const user = await this.getCurrentUser();
        if (user) {
          callback('SIGNED_IN', { user });
        } else {
          callback('SIGNED_OUT', null);
        }
      } catch (error) {
        callback('SIGNED_OUT', null);
      }
    };

    // Check auth state immediately
    checkAuthState();

    // Return a cleanup function
    return () => {};
  }

  // Handle email verification from URL (simplified)
  async handleEmailVerification(): Promise<{ success: boolean; error?: string }> {
    // Email verification would need to be implemented in the backend
    return { success: true };
  }
}

export const authService = new AuthService();
