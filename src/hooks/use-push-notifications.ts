import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/lib/firebase";

// Helper: set badge if supported
function setBadge(count: number) {
  if ("setAppBadge" in navigator) {
    // @ts-ignore
    navigator.setAppBadge(count);
  }
}
function clearBadge() {
  if ("clearAppBadge" in navigator) {
    // @ts-ignore
    navigator.clearAppBadge();
  }
}

export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!app) return;

    const messaging = getMessaging(app);

    // Request permission and get token
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY })
          .then((currentToken) => {
            if (currentToken) {
              // TODO: send token to backend if needed
              console.log("FCM token:", currentToken);
            }
          })
          .catch((err) => {
            console.error("An error occurred while retrieving token. ", err);
          });
      }
    });

    // Foreground notification handler
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Push notification received:", payload);
      // Show a toast or notification UI here if desired
      setBadge(1); // Set badge to 1 (or increment if you track unread count)
    });

    // Optionally clear badge on focus
    const handleFocus = () => clearBadge();
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}
