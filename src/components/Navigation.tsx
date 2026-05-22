"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, Trophy, User } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useUser();
  
  const isActive = (path: string) => pathname === path;

  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src="/kavach_logo.png" 
              alt="Kavach Logo" 
              className="w-12 h-12 group-hover:cyber-glow transition-all" 
            />
            <span className="text-xl font-bold">Kavach</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                isActive("/") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link 
              href="/modules" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                isActive("/modules") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <BookOpen className="w-4 h-4" />
              Modules
            </Link>
            <Link 
              id="tour-leaderboard"
              href="/leaderboard" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                isActive("/leaderboard") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Link>
          </div>
          
          {/* User Info or Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{profile?.avatar === "female" ? "👩‍💻" : "🧑‍💻"}</span>
                  <span className="font-bold text-primary">Level {profile?.level ?? 1}</span>
                </div>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="text-sm">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/';
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost" className="text-sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth?mode=signup">
                  <Button className="gradient-primary text-sm font-semibold">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
