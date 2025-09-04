
import { Injectable, signal } from '@angular/core';
import { supabaseClient } from '../supabase.client';
import { User } from '@supabase/supabase-js';

export interface AppUser {
  uid: string;
  email: string | undefined;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  role: 'user' | 'instructor' | 'admin';
  title?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
}

const ADMIN_EMAIL = 'abdullahmeme551@gmail.com';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser = signal<AppUser | null>(null);

  constructor() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.fetchAndSetUser(session.user);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  private async fetchAndSetUser(user: User) {
    // Fetch user profile from 'profiles' table
    let { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist (e.g., for users created before profiles table existed), create it.
    if (error && error.code === 'PGRST116') {
      console.log('Profile not found for user, creating one...');
      const { data: newProfile, error: insertError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          role: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile on-the-fly:', insertError);
      } else {
        profile = newProfile; // Use the newly created profile
      }
    } else if (error) {
       console.error('Error fetching user profile:', error);
    }
    
    const finalRole = profile?.role || (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user');
    const isAdmin = finalRole === 'admin';

    this.currentUser.set({
      uid: user.id,
      email: user.email,
      displayName: profile?.full_name || user.user_metadata?.full_name || 'مستخدم',
      photoURL: profile?.avatar_url || user.user_metadata?.avatar_url,
      isAdmin: isAdmin,
      role: finalRole,
      title: profile?.title,
      bio: profile?.bio,
      linkedinUrl: profile?.linkedin_url,
    });
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(this.getArabicErrorMessage(error.message));
    }
  }

  async signupWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName)}`
        },
      },
    });
    if (error) {
      throw new Error(this.getArabicErrorMessage(error.message));
    }
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      throw new Error(this.getArabicErrorMessage(error.message));
    }
  }

  async logout(): Promise<void> {
    await supabaseClient.auth.signOut();
  }

  private getArabicErrorMessage(errorMessage: string): string {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل.';
    }
    if (errorMessage.includes('Password should be at least 6 characters')) {
      return 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'لم يتم تأكيد البريد الإلكتروني. يرجى التحقق من بريدك الوارد.';
    }
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }
}
