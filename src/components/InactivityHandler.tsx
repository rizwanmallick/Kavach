"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/context/user-context";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

// Default timeout is 15 minutes (900,000 milliseconds)
// Set this lower (e.g., 10000 for 10 seconds) if you want to demonstrate it to the professor.
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; 

export function InactivityHandler() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Clear existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timer
    if (user && pathname !== "/auth") {
      timeoutRef.current = setTimeout(() => {
        handleLogoutDueToInactivity();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const handleLogoutDueToInactivity = async () => {
    try {
      console.log("[InactivityHandler] Logged out due to 15 minutes of inactivity.");
      await logout();
      toast.warning("Session Expired", {
        description: "You have been logged out due to 15 minutes of inactivity for project security.",
        duration: 8000,
      });
      router.push("/auth");
    } catch (error) {
      console.error("[InactivityHandler] Error logging out:", error);
    }
  };

  useEffect(() => {
    // List of events that signal user activity
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];

    // Set up listeners if user is signed in and not on the auth page
    if (user && pathname !== "/auth") {
      resetTimer();

      events.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
    }

    return () => {
      // Clean up listeners and timeouts on unmount or path changes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, pathname]);

  return null; // This is a logic-only component, it doesn't render any UI elements
}
