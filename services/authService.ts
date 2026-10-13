import { User } from '../types';
import { config } from './config';
import { security } from './securityService';
import { supabase } from './supabaseClient';
import { db } from './databaseService';

const MOCK_SESSION_KEY = 'discflip_mock_session_user';

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  private init() {
    if (config.isMockEnabled) return;

    // Listen to auth state changes from Supabase (sign in, sign out, OAuth redirect, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase warns against awaiting other Supabase calls inside this callback,
      // so the profile lookup is deferred to the next tick.
      setTimeout(async () => {
        this.currentUser = session?.user ? await this.fetchProfile(session.user.id) : null;
        this.notifyListeners();
      }, 0);
    });
  }

  private async fetchProfile(uid: string): Promise<User | null> {
    if (config.isMockEnabled) return null;
    try {
      return await db.getUserById(uid);
    } catch (error) {
      console.error('Profile Resolution Error:', error);
      return null;
    }
  }

  public async signUp(
    email: string,
    pass: string,
    name: string
  ): Promise<{ needsConfirmation: boolean }> {
    if (config.isMockEnabled) {
      // Mock mode: sign in as the demo user
      await this.signInWithEmail(email, pass);
      return { needsConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    // When email confirmation is turned off in Supabase, a session comes back immediately.
    return { needsConfirmation: !data.session };
  }

  public async signInWithEmail(email: string, pass: string): Promise<void> {
    if (!security.checkRateLimit(email, 'login', 5, 300000)) {
      throw new Error('429: Too many failed attempts. Vault locked for 5 minutes.');
    }

    if (config.isMockEnabled) {
      const users = await db.getUsers();
      this.currentUser = users.find((u) => u.email === email) || users[0] || null;
      if (this.currentUser) localStorage.setItem(MOCK_SESSION_KEY, this.currentUser.id);
      this.notifyListeners();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) throw error;
  }

  public async signInWithGoogle(): Promise<void> {
    if (config.isMockEnabled) {
      throw new Error('Google sign-in needs Supabase configured (VITE_SUPABASE_URL).');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  public async signOut(): Promise<void> {
    this.currentUser = null;
    if (config.isMockEnabled) {
      localStorage.removeItem(MOCK_SESSION_KEY);
    } else {
      await supabase.auth.signOut();
    }
    this.notifyListeners();
  }

  public async getSessionUser(): Promise<User | null> {
    if (config.isMockEnabled) {
      const id = localStorage.getItem(MOCK_SESSION_KEY);
      if (!id) return null;
      const users = await db.getUsers();
      this.currentUser = users.find((u) => u.id === id) || null;
      return this.currentUser;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    this.currentUser = session?.user ? await this.fetchProfile(session.user.id) : null;
    return this.currentUser;
  }

  public onAuthStateChange(callback: (user: User | null) => void) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.authListeners.forEach((l) => l(this.currentUser));
  }
}

export const auth = AuthService.getInstance();
