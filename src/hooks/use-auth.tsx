
"use client";

import type {User as FirebaseAuthUser} from "firebase/auth";
import {onAuthStateChanged, signOut as firebaseSignOut} from "firebase/auth";
import {doc, onSnapshot} from "firebase/firestore";
import {useRouter, usePathname} from "next/navigation";
import type {ReactNode} from "react";
import React, {createContext, useContext, useEffect, useState} from "react";
import type {AppUser} from "@/types";
import {auth, db} from "@/lib/firebase";
import {Loader2} from "lucide-react";

interface AuthContextType {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  teamId: string | null;
  role: AppUser["role"] | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('⏰ Auth loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout for real Firebase auth

    return () => clearTimeout(timeout);
  }, [firebaseUser, user]);

  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener');
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      console.log('🔥 Firebase auth state changed:', !!fbUser);
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
      // If fbUser exists, the other useEffect will handle fetching AppUser
    });
    return () => {
      console.log('🔥 Cleaning up Firebase auth listener');
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    if (firebaseUser) {
      console.log('👤 Setting up user document listener for:', firebaseUser.uid);
      setLoading(true);
      const userDocRef = doc(db, "users", firebaseUser.uid);

      unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        console.log('📄 User document changed, exists:', docSnap.exists());
        if (docSnap.exists()) {
          const appUserData = {uid: firebaseUser.uid, ...docSnap.data()} as AppUser;
          setUser(appUserData);
          console.log('✅ User set:', appUserData.email, appUserData.role);
        } else {
          // User document not found - expected for new users
          console.log('❌ User document not found');
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        // Auth error - set to null and continue
        console.log('🚨 User document error:', error);
        setUser(null);
        setLoading(false);
      });
    } else {
      console.log('🚫 No Firebase user, clearing app user');
      setUser(null);
      setLoading(false);
    }
    return () => {
      if (unsubscribeUserDoc) {
        console.log('🧹 Cleaning up user document listener');
        unsubscribeUserDoc();
      }
    };
  }, [firebaseUser]);


  useEffect(() => {
    // Prevent navigation during initial load or if already loading
    if (loading) return;
    
    // Only redirect if we're certain about the auth state
    if (!user && pathname !== "/login") {
      router.replace("/login");
    } else if (user && pathname === "/login") {
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname]);

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    // router.push will be handled by the effect above
    setLoading(false);
  };

  // Avoid rendering children if loading and not on login page without a user
  // This prevents a flash of content before redirect
  if (loading && pathname !== "/login" && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const contextValue = {firebaseUser, user, loading, teamId: user?.teamId || null, role: user?.role || null, logout};

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
