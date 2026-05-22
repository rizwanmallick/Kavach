"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; sessionCreated?: boolean }>;
  logout: () => Promise<void>;
  updateScore: (points: number, metadata?: { moduleId: number; moduleName: string; accuracy?: number }) => Promise<void>;
  setAvatar: (avatar: 'male' | 'female') => Promise<void>;
  completeTour: () => Promise<void>;
  isNewUser: boolean;
  hasBooted: boolean;
  setHasBooted: (val: boolean) => void;
  seenDialogues: Set<string>;
  markDialogueSeen: (id: string) => void;
  activeHoverTour: string | null;
  setActiveHoverTour: (val: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeHoverTour, setActiveHoverTour] = useState<string | null>(null);
  const [hasBooted, setHasBooted] = useState(false);
  const [seenDialogues, setSeenDialogues] = useState<Set<string>>(new Set());

  // Fetch profile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        console.warn("[User Context] Profile not found or failed to load. Attempting to create fallback profile...", error);
        
        // Get user metadata to extract the username entered during sign up
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'Agent';
          
          console.log("[User Context] Creating profile row for:", authUser.id, "with username:", username);
          const { data: newProfile, error: createError } = await (supabase as any)
            .from("profiles")
            .insert({
              id: authUser.id,
              username: username,
              avatar: 'male',
              score: 0,
              level: 1,
              xp: 0,
              tour_completed: false
            })
            .select()
            .single();

          if (!createError && newProfile) {
            setProfile(newProfile as Profile);
            console.log("[User Context] Fallback profile created successfully.");
          } else {
            console.error("[User Context] Fallback profile creation failed:", createError);
          }
        }
      }
    } catch (err) {
      console.error("[User Context] Error during fetchProfile fallback flow:", err);
    }
  };

  // Load seen dialogues from localStorage (per user)
  const loadSeenDialogues = (userId: string) => {
    const stored = localStorage.getItem(`seenDialogues_${userId}`);
    if (stored) {
      setSeenDialogues(new Set(JSON.parse(stored)));
    }
  };

  // On mount: check existing session
  useEffect(() => {
    // Safety net: never stay stuck on loading screen for more than 5 seconds
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          loadSeenDialogues(session.user.id);
        }
      } catch (err) {
        console.warn("Supabase auth session lock error (ignored):", err);
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          loadSeenDialogues(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setSeenDialogues(new Set());
        }
      } catch (err) {
        console.warn("Supabase auth state change lock error (ignored):", err);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    return { success: true };
  };

  const signup = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string; sessionCreated?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }, // passed to trigger via raw_user_meta_data
        emailRedirectTo: `${window.location.origin}/auth?mode=confirm`
      }
    });

    if (error) return { success: false, error: error.message };

    // If email confirmation is disabled, a session is created immediately
    if (data.session && data.user) {
      await fetchProfile(data.user.id);
      return { success: true, sessionCreated: true };
    }

    // Email confirmation required — no session yet
    return { success: true, sessionCreated: false };
  };

  const logout = async () => {
    // 1. Immediately wipe React state so the UI reflects logged-out state instantly
    setUser(null);
    setProfile(null);
    setSeenDialogues(new Set());
    setIsLoading(false);

    // 2. Wipe storage keys immediately
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase") || key.includes("auth-token"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn("Failed to manually clear auth localStorage keys:", e);
    }

    try {
      sessionStorage.clear();
    } catch (e) {}

    // 3. Clear cookies
    try {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + `=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    } catch (e) {}

    // 4. Trigger signOut in background with a timeout fallback (non-blocking)
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signout timed out")), 800)
      );
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
    } catch (err) {
      console.warn('Supabase signOut error/timeout (ignored):', err);
    }
  };

  const updateScore = async (points: number, metadata?: { moduleId: number; moduleName: string; accuracy?: number }) => {
    if (!user || !profile) {
      console.warn("[XP Update] Cannot update score: user or profile is null", { user, profile });
      return;
    }

    // Use latest profile data to prevent stale state clobbering
    const { data: latestProfile } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const currentScore = latestProfile?.score ?? profile.score;
    const currentXp = latestProfile?.xp ?? profile.xp;

    const newScore = currentScore + points;
    const newXp = currentXp + points;

    // Dynamic level calculation: 500 XP per level
    const newLevel = Math.floor(newXp / 500) + 1;

    console.log(`[XP Update] Points: ${points}, New XP: ${newXp}, New Level: ${newLevel}`);

    // 1. Update Profile (Live XP/Level)
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update({
        score: newScore,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[XP Update] Error updating user profile:", error);
    } else if (data) {
      console.log("[XP Update] Profile updated successfully in Supabase:", data);
      setProfile(data as Profile);
    }

    // 2. Log to Gradebook (Student Submissions) - ONLY if metadata is provided (usually module completion)
    if (metadata) {
      const { error: insertError } = await (supabase as any)
        .from("student_submissions")
        .insert({
          user_id: user.id,
          username: profile.username,
          module_id: metadata.moduleId,
          module_name: metadata.moduleName,
          xp_earned: points,
          accuracy: metadata.accuracy || 100,
          completed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("[XP Update] Error logging student submission:", insertError);
      } else {
        console.log("[XP Update] Student submission logged successfully.");
      }
    }
  };

  const setAvatar = async (avatar: 'male' | 'female') => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update({ avatar, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  const completeTour = async () => {
    if (!user) return;
    console.log("[Tour] Completing tour for user:", user.id);
    
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ 
          tour_completed: true, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", user.id);

      if (error) {
        console.error("[Tour] Database update failed:", error);
      } else {
        console.log("[Tour] Database update successful.");
        setProfile(prev => prev ? { ...prev, tour_completed: true } : null);
      }
    } catch (err) {
      console.error("[Tour] Unexpected error during completion:", err);
    }
  };

  const markDialogueSeen = (id: string) => {
    setSeenDialogues(prev => {
      const next = new Set(prev).add(id);
      if (user) {
        localStorage.setItem(`seenDialogues_${user.id}`, JSON.stringify([...next]));
      }
      return next;
    });
  };

  return (
    <UserContext.Provider value={{
      user,
      profile,
      isLoading,
      login,
      signup,
      logout,
      updateScore,
      setAvatar,
      completeTour,
      isNewUser,
      activeHoverTour,
      setActiveHoverTour,
      hasBooted,
      setHasBooted,
      seenDialogues,
      markDialogueSeen,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}