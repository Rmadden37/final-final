// Badge service for managing app badge notifications on mobile devices
export class BadgeService {
  private static badgeCount = 0;

  /**
   * Set the app badge count (for mobile PWA)
   */
  static async setBadgeCount(count: number): Promise<void> {
    this.badgeCount = Math.max(0, count);
    
    try {
      // Use the Badge API if available (supported on mobile PWAs)
      if ('setAppBadge' in navigator) {
        if (this.badgeCount > 0) {
          await (navigator as any).setAppBadge(this.badgeCount);
        } else {
          await (navigator as any).clearAppBadge();
        }
      }
      
      // Update the document title as fallback
      this.updateDocumentTitle();
      
      // Update favicon if possible
      this.updateFavicon();
      
    } catch (error) {
      console.warn('Badge API not supported or failed:', error);
      // Fallback to title update only
      this.updateDocumentTitle();
    }
  }

  /**
   * Increment the badge count
   */
  static async incrementBadge(): Promise<void> {
    await this.setBadgeCount(this.badgeCount + 1);
  }

  /**
   * Decrement the badge count
   */
  static async decrementBadge(): Promise<void> {
    await this.setBadgeCount(this.badgeCount - 1);
  }

  /**
   * Clear the badge
   */
  static async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Get current badge count
   */
  static getBadgeCount(): number {
    return this.badgeCount;
  }

  /**
   * Update document title with badge count
   */
  private static updateDocumentTitle(): void {
    const baseTitle = 'LeadFlow';
    if (this.badgeCount > 0) {
      document.title = `(${this.badgeCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  /**
   * Update favicon with badge indicator (simple implementation)
   */
  private static updateFavicon(): void {
    try {
      // Only run in browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      
      // eslint-disable-next-line no-undef
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!favicon) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 32;
      canvas.height = 32;

      // Draw base icon (simple blue circle)
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fill();

      // Draw badge if count > 0
      if (this.badgeCount > 0) {
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(24, 8, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw count text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          this.badgeCount > 99 ? '99+' : this.badgeCount.toString(),
          24,
          11
        );
      }

      // Update favicon
      favicon.href = canvas.toDataURL('image/png');
    } catch (error) {
      console.warn('Failed to update favicon:', error);
    }
  }

  /**
   * Initialize badge service and check for stored count
   */
  static initialize(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Check if there's a stored badge count
    // eslint-disable-next-line no-undef
    const stored = localStorage.getItem('leadflow-badge-count');
    if (stored) {
      const count = parseInt(stored, 10);
      if (!isNaN(count)) {
        this.setBadgeCount(count);
      }
    }

    // Save badge count to localStorage when it changes
    const originalSetBadgeCount = this.setBadgeCount;
    this.setBadgeCount = async (count: number) => {
      await originalSetBadgeCount.call(this, count);
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-undef
        localStorage.setItem('leadflow-badge-count', count.toString());
      }
    };
  }

  /**
   * Handle visibility change to clear badge when app becomes visible
   */
  static handleVisibilityChange(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // App became visible, consider clearing badges for viewed notifications
        // This could be customized based on your app's logic
        this.clearBadge();
      }
    });
  }
}
