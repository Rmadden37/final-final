"use client";

import type {User as FirebaseAuthUser} from "firebase/auth";
import {onAuthStateChanged, signOut as firebaseSignOut} from "firebase/auth";
import {doc, onSnapshot, setDoc} from "firebase/firestore";
import {useRouter, usePathname} from "next/navigation";
import type {ReactNode} from "react";
import React, {createContext, useContext, useEffect, useState, useRef} from "react";
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const navigationRef = useRef<{ isNavigating: boolean }>({ isNavigating: false });

  // Initialize auth listener only once
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener');
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      console.log('🔥 Firebase auth state changed:', !!fbUser, 'uid:', fbUser?.uid);
      
      // Prevent multiple rapid state changes
      if (firebaseUser?.uid === fbUser?.uid && authInitialized) {
        console.log('🔄 Same user, skipping update');
        return;
      }
      
      setFirebaseUser(fbUser);
      setAuthInitialized(true);
      
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        
        // Handle navigation for logout
        if (pathname !== "/login" && !navigationRef.current.isNavigating) {
          navigationRef.current.isNavigating = true;
          console.log('🚪 Redirecting to login');
          router.replace("/login");
          setTimeout(() => {
            navigationRef.current.isNavigating = false;
          }, 1000);
        }
      }
    });

    // Cleanup
    return () => {
      console.log('🔥 Cleaning up Firebase auth listener');
      unsubscribeAuth();
    };
  }, []); // Empty deps - only run once

  // Handle user document subscription
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    if (firebaseUser && authInitialized) {
      console.log('👤 Setting up user document listener for:', firebaseUser.uid);
      const userDocRef = doc(db, "users", firebaseUser.uid);

      unsubscribeUserDoc = onSnapshot(
        userDocRef,
        async (docSnap) => {
          console.log('📄 User document snapshot received, exists:', docSnap.exists());
          
          if (docSnap.exists()) {
            const appUserData = {uid: firebaseUser.uid, ...docSnap.data()} as AppUser;
            setUser(appUserData);
            setLoading(false);
            console.log('✅ User data loaded:', appUserData.email, appUserData.role);
            
            // Handle navigation for login
            if (pathname === "/login" && !navigationRef.current.isNavigating) {
              navigationRef.current.isNavigating = true;
              console.log('🏠 Redirecting to dashboard');
              router.replace("/dashboard");
              setTimeout(() => {
                navigationRef.current.isNavigating = false;
              }, 1000);
            }
          } else {
            // Create default user document for new users
            console.log('📝 Creating default user document');
            const defaultUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              role: "setter" as const,
              teamId: "default",
              avatarUrl: firebaseUser.photoURL || null,
              phoneNumber: firebaseUser.phoneNumber || null,
              status: "On Duty" as const,
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(userDocRef, defaultUser);
              setUser(defaultUser as AppUser);
              setLoading(false);
              console.log('✅ Default user document created');
            } catch (error) {
              console.error('❌ Failed to create user document:', error);
              setUser(null);
              setLoading(false);
            }
          }
        },
        (error) => {
          console.error('❌ User document listener error:', error);
          setUser(null);
          setLoading(false);
        }
      );
    } else if (!firebaseUser && authInitialized) {
      setUser(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribeUserDoc) {
        console.log('🧹 Cleaning up user document listener');
        unsubscribeUserDoc();
      }
    };
  }, [firebaseUser, authInitialized, pathname, router]);

  // Logout function
  const logout = async () => {
    console.log('👋 Logging out');
    navigationRef.current.isNavigating = true;
    setLoading(true);
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      router.replace("/login");
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        navigationRef.current.isNavigating = false;
      }, 1000);
    }
  };

  // Show loading spinner while checking auth
  if (loading && !authInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const contextValue: AuthContextType = {
    firebaseUser,
    user,
    loading,
    teamId: user?.teamId || null,
    role: user?.role || null,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};