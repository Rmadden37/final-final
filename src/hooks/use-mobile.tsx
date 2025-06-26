import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = height / width;
      // Mobile if width is less than breakpoint OR aspect ratio is phone-like
      setIsMobile(width < MOBILE_BREAKPOINT || aspectRatio > 1.3);
    };
    const mql = window.matchMedia(`(max-inline-size: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", checkMobile);
    window.addEventListener("resize", checkMobile);
    checkMobile();
    return () => {
      mql.removeEventListener("change", checkMobile);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return !!isMobile;
}
