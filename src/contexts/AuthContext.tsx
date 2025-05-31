
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

type UserType = "organizer" | "executor" | "associate";

interface UserProfile {
  id: string;
  user_role: UserType;
  full_name?: string | null;
  avatar_url?: string | null;
  unique_id?: string | null;
}

interface Group {
  id: string;
  name: string;
  unique_code: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  userGroups: Group[];
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, userType: UserType, uniqueId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user's groups
  const fetchUserGroups = async (userId: string) => {
    try {
      // First, fetch groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups:group_id (
            id,
            name,
            unique_code
          )
        `)
        .eq('user_id', userId);

      if (memberError) {
        console.error("Error fetching groups as member:", memberError);
        return [];
      }

      // Then, fetch groups where user is the organizer
      const { data: organizerGroups, error: organizerError } = await supabase
        .from('groups')
        .select('id, name, unique_code')
        .eq('organizer_id', userId);

      if (organizerError) {
        console.error("Error fetching groups as organizer:", organizerError);
        return [];
      }

      // Combine and deduplicate groups
      const memberGroupsFormatted = memberGroups
        .filter(item => item.groups) // Filter out null values
        .map(item => ({
          id: item.groups.id,
          name: item.groups.name,
          unique_code: item.groups.unique_code
        }));

      const allGroups = [...memberGroupsFormatted, ...organizerGroups];
      
      // Deduplicate by group id
      const uniqueGroups = Array.from(
        new Map(allGroups.map(group => [group.id, group])).values()
      );

      setUserGroups(uniqueGroups);
      return uniqueGroups;
    } catch (error) {
      console.error("Exception fetching user groups:", error);
      return [];
    }
  };

  useEffect(() => {
    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log("Auth state changed, event:", _event);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase auth state
          setTimeout(async () => {
            try {
              const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentSession.user.id)
                .single();
                
              if (error) {
                console.error("Error fetching user profile:", error);
              } else {
                setProfile(data as UserProfile);
                console.log("Fetched user profile on auth change:", data);
                
                // Fetch user groups when profile is loaded
                await fetchUserGroups(currentSession.user.id);
              }
            } catch (error) {
              console.error("Exception in profile fetch:", error);
            }
          }, 100);
        } else {
          setProfile(null);
          setUserGroups([]);
        }
      }
    );

    // Then check for existing session
    const initSession = async () => {
      try {
        console.log("Checking initial session");
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Got initial session:", currentSession?.user?.id || "no session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentSession.user.id)
              .single();
              
            if (error) {
              console.error("Error fetching user profile:", error);
            } else {
              setProfile(data as UserProfile);
              console.log("Initial profile:", data);
              
              // Fetch user groups when profile is loaded
              await fetchUserGroups(currentSession.user.id);
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
        }
      } catch (error) {
        console.error("Error during initial session check:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    userType: UserType,
    uniqueId?: string
  ) => {
    try {
      setLoading(true);
      console.log(`Signing up user with email: ${email}, role: ${userType}, uniqueId: ${uniqueId || 'none'}`);
      
      // Validate uniqueId for associates
      if (userType === "associate" && (!uniqueId || uniqueId.trim() === "")) {
        toast({
          variant: "destructive",
          title: "User ID Required",
          description: "Associates must provide a User ID for registration.",
        });
        throw new Error("Associates must provide a User ID");
      }
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_role: userType,
            unique_id: uniqueId?.trim()
          },
          emailRedirectTo: window.location.origin + '/signin'
        }
      });

      if (error) throw error;
      
      console.log("SignUp successful, data:", data);

      // Ensure the user profile has the uniqueId
      if (data.user && userType === "associate" && uniqueId) {
        try {
          // Update the profile with the uniqueId to ensure it's properly set
          await supabase
            .from("profiles")
            .update({ 
              unique_id: uniqueId.trim(),
              user_role: userType
            })
            .eq("id", data.user.id);
          
          console.log("Updated profile with uniqueId:", uniqueId);
        } catch (profileError) {
          console.error("Error updating profile with uniqueId:", profileError);
        }
      }
      
      toast({
        title: "Account created",
        description: "Please check your email to confirm your account",
      });
      
    } catch (error: any) {
      console.error("SignUp error:", error);
      toast({
        variant: "destructive",
        title: "Error creating account",
        description: error.message || "An unknown error occurred",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log(`Signing in user with email: ${email}`);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log("SignIn successful, data:", data);
      
      // Check if sign in was successful by verifying data.user
      if (data.user) {
        navigate("/dashboard");
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
      
    } catch (error: any) {
      console.error("SignIn error:", error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message || "An unknown error occurred",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log("Starting Google sign-in");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        if (error.message.includes("provider is not enabled")) {
          throw new Error("Google authentication is not enabled in this application. Please enable it in your Supabase project.");
        }
        throw error;
      }
      
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "Google sign-in failed. Please ensure Google authentication is enabled in your Supabase project.",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log("Signing out");
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      navigate("/");
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message || "An unknown error occurred",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        userGroups,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
