import { User } from '../types';
import { config } from './config';
import { security } from './securityService';
import { supabase } from './supabaseClient';

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

    private async init() {
        if (config.isMockEnabled) return;

        // Listen to auth state changes from Supabase
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const profile = await this.fetchProfile(session.user.id);
                this.currentUser = profile;
            } else {
                this.currentUser = null;
            }
            this.notifyListeners();
        });
    }

    private async fetchProfile(uid: string): Promise<User | null> {
        if (config.isMockEnabled) return null;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .single();

        if (error || !data) {
            console.error("Profile Resolution Error:", error);
            return null;
        }

        return data as User;
    }

    public async signUp(email: string, pass: string, name: string): Promise<void> {
        if (config.isMockEnabled) return;

        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: { full_name: name }
            }
        });

        if (error) throw error;
    }

    public async signInWithEmail(email: string, pass: string): Promise<void> {
        if (!security.checkRateLimit(email, 'login', 5, 300000)) {
            throw new Error("429: Too many failed attempts. Vault locked for 5 minutes.");
        }

        if (config.isMockEnabled) {
            const data = localStorage.getItem('discflip_db_users');
            const users = data ? JSON.parse(data) : [];
            this.currentUser = users.find((u: any) => u.email === email) || users[0];
            this.notifyListeners();
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: pass
        });

        if (error) throw error;
    }

    public async signOut(): Promise<void> {
        this.currentUser = null;
        if (!config.isMockEnabled) {
            await supabase.auth.signOut();
        }
        this.notifyListeners();
    }

    public async getSessionUser(): Promise<User | null> {
        if (this.currentUser) return this.currentUser;

        if (config.isMockEnabled) {
            const data = localStorage.getItem('discflip_db_users');
            const users = data ? JSON.parse(data) : [];
            this.currentUser = users[0] || null;
            return this.currentUser;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            this.currentUser = await this.fetchProfile(session.user.id);
        }

        return this.currentUser;
    }

    public onAuthStateChange(callback: (user: User | null) => void) {
        this.authListeners.push(callback);
        return () => {
            this.authListeners = this.authListeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        this.authListeners.forEach(l => l(this.currentUser));
    }
}

export const auth = AuthService.getInstance();
