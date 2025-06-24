import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LogoUrls {
  lightMode: string;
  darkMode: string;
  premiumMode: string;
}

/**
 * Hook to fetch logo URLs from Firestore
 * Falls back to default URLs if not found
 */
export function useLogo() {
  const [logoUrls, setLogoUrls] = useState<LogoUrls>({
    lightMode: "https://imgur.com/BQs5krw.png", // Default light mode logo
    darkMode: "https://imgur.com/eYR7cr2.png",   // Dark mode logo from Imgur (known working)
    premiumMode: "https://firebasestorage.googleapis.com/v0/b/leadflow-4lvrr.firebasestorage.app/o/Leadflow%20Logos%2FChatGPT%20Image%20Jun%2024%2C%202025%20at%2001_49_10%20PM.png?alt=media&token=6ed5dd94-fb82-4ffc-af46-dfdcca722a1e.png" // Premium mode logo
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        console.log('🎨 Fetching logo from Firestore...');
        
        // Try to fetch from app settings collection
        const settingsRef = doc(db, "settings", "app");
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          console.log('📄 Settings doc data:', data);
          if (data.logos) {
            console.log('✅ Found logos in settings:', data.logos);
            setLogoUrls({
              lightMode: data.logos.lightMode || "https://imgur.com/BQs5krw.png",
              darkMode: data.logos.darkMode || "https://imgur.com/eYR7cr2.png",
              premiumMode: data.logos.premiumMode || "https://firebasestorage.googleapis.com/v0/b/leadflow-4lvrr.firebasestorage.app/o/Leadflow%20Logos%2FChatGPT%20Image%20Jun%2024%2C%202025%20at%2001_49_10%20PM.png?alt=media&token=6ed5dd94-fb82-4ffc-af46-dfdcca722a1e.png"
            });
            return;
          }
        } else {
          console.log('📄 No settings doc found, trying logos collection...');
          // If no settings doc exists, try looking for logo in a logos collection
          const logoRef = doc(db, "logos", "main");
          const logoDoc = await getDoc(logoRef);
          
          if (logoDoc.exists()) {
            const data = logoDoc.data();
            console.log('✅ Found logos in collection:', data);
            setLogoUrls({
              lightMode: data.lightModeUrl || "https://imgur.com/BQs5krw.png",
              darkMode: data.darkModeUrl || data.url || "https://imgur.com/eYR7cr2.png",
              premiumMode: data.premiumModeUrl || "https://firebasestorage.googleapis.com/v0/b/leadflow-4lvrr.firebasestorage.app/o/Leadflow%20Logos%2FChatGPT%20Image%20Jun%2024%2C%202025%20at%2001_49_10%20PM.png?alt=media&token=6ed5dd94-fb82-4ffc-af46-dfdcca722a1e.png"
            });
            return;
          }
        }
        
        console.log('🚫 No logos found in Firestore, using fallbacks');
        // If no logos found anywhere, keep default URLs
        
      } catch (error) {
        console.error('🚨 Error fetching logo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, []);

  return { logoUrls, loading };
}
