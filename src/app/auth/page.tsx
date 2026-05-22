"use client";

import { useState, useEffect, Suspense } from "react";
import { Shield, Mail, Lock, User, ArrowRight, UserCircle, RefreshCw, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import zxcvbn from "zxcvbn";
import { supabase } from "@/lib/supabase";
type AuthStep = "form" | "avatar" | "email-sent" | "verifying" | "verified-success";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // We only need the user object, user-context handles the auth state change globally
  const { user, login, signup, setAvatar } = useUser();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  // Default to verifying if mode is confirm, so we don't flash the login form
  const [step, setStep] = useState<AuthStep>(searchParams.get("mode") === "confirm" ? "verifying" : "form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<"male" | "female" | null>(null);

  // 1. If user is successfully authenticated (from email link or otherwise), handle redirects
  useEffect(() => {
    if (user) {
      // If this is the newly opened tab from the email link, show success screen
      if (searchParams.get("mode") === "confirm") {
        setStep("verified-success");
      } else {
        // If this is the original tab, auto-redirect to the academy!
        router.replace('/');
      }
    }
  }, [user, router, searchParams]);

  // 2. If in 'verifying' step, give it 3 seconds to resolve session. If still no user, fallback to login form.
  useEffect(() => {
    if (step === 'verifying') {
      const timer = setTimeout(() => {
        // If user is still not populated by user-context after 3s, prompt manual login
        if (!user) {
          setStep('form');
          setError('Email verified! Please sign in to continue.');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, user]);

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  // CAPTCHA security states
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  // Sign-Up Password Strength states
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Function to generate a random cyber-themed captcha code
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit easily confused characters
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
  };

  // Generate CAPTCHA and reset password visibility toggle on mode change
  useEffect(() => {
    generateCaptcha();
    setShowPassword(false);
  }, [mode]);

  // Real-time password evaluation
  useEffect(() => {
    if (formData.password) {
      const result = zxcvbn(formData.password);
      setPasswordStrength(result.score);
      const suggestions = result.feedback.suggestions || [];
      const warning = result.feedback.warning;
      setPasswordFeedback(warning ? [warning, ...suggestions] : suggestions);
    } else {
      setPasswordStrength(0);
      setPasswordFeedback([]);
    }
  }, [formData.password]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // 1. CAPTCHA Validation
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setError("Incorrect security CAPTCHA code. Please try again.");
      generateCaptcha();
      setIsLoading(false);
      return;
    }

    // 2. Input Sanitization & Strength Rules (Sign Up only)
    if (mode === "signup") {
      const sanitizedUsername = formData.username.trim();
      const alphanumericRegex = /^[a-zA-Z0-9_]+$/;

      // XSS & SQL Injection Defense
      if (!alphanumericRegex.test(sanitizedUsername)) {
        setError("Username can only contain letters, numbers, and underscores (no spaces or script tags).");
        setIsLoading(false);
        return;
      }
      if (sanitizedUsername.length < 3 || sanitizedUsername.length > 20) {
        setError("Username must be between 3 and 20 characters.");
        setIsLoading(false);
        return;
      }

      // Password Strength Enforcer (min score of 2/4 - Medium strength)
      if (passwordStrength < 2) {
        setError("Password is too weak. For security, please choose a stronger password (at least Medium strength).");
        setIsLoading(false);
        return;
      }
    }

    if (mode === "login") {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Invalid email or password.");
        generateCaptcha(); // Regenerate CAPTCHA on login failure
      }
    } else {
      const result = await signup(formData.username, formData.email, formData.password);
      if (result.success) {
        if (result.sessionCreated) {
          // Email confirmation is OFF — session created instantly, go to home
          router.push("/");
        } else {
          // Email confirmation is ON — tell user to check inbox
          setStep("email-sent");
        }
      } else {
        setError(result.error || "Could not create account.");
        generateCaptcha(); // Regenerate CAPTCHA on signup failure
      }
    }
    setIsLoading(false);
  };

  const handleAvatarSelect = async (avatar: "male" | "female") => {
    setSelectedAvatar(avatar);
  };

  const handleAvatarConfirm = async () => {
    if (!selectedAvatar) return;
    setIsLoading(true);
    await setAvatar(selectedAvatar);
    router.push("/");
  };


  if (step === "verified-success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-full max-w-lg">
          <div className="glass-card cyber-border border-green-500/50 rounded-3xl p-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-2">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Email Verified!</h1>
            <p className="text-slate-300 text-lg">
              Your account is fully activated.
            </p>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <p className="text-slate-400 font-medium">
                You can safely close this tab and return to your original window to continue.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-full max-w-lg">
          <div className="glass-card cyber-border rounded-3xl p-10 text-center space-y-6">
            <RefreshCw className="w-16 h-16 text-cyan-500 animate-spin mx-auto" />
            <h1 className="text-3xl font-bold">Verifying Session...</h1>
            <p className="text-muted-foreground">
              Processing secure token and establishing connection. Please wait.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "email-sent") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-full max-w-lg">
          <div className="glass-card cyber-border rounded-3xl p-10 text-center">
            <div className="text-6xl mb-6">📬</div>
            <h1 className="text-3xl font-bold mb-3">Check Your Inbox</h1>
            <p className="text-muted-foreground mb-2">
              We sent a confirmation link to:
            </p>
            <p className="text-primary font-mono font-bold text-lg mb-6">{formData.email}</p>
            <p className="text-muted-foreground text-sm mb-8">
              Click the link in the email to activate your account. Once confirmed, come back and sign in — Cypher will guide you through the rest.
            </p>
            <button
              onClick={() => { setStep("form"); setMode("login"); }}
              className="px-8 py-3 gradient-primary text-white font-semibold rounded-xl w-full"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "avatar") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-full max-w-lg">
          <div className="glass-card cyber-border rounded-3xl p-10 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 cyber-border rounded-2xl bg-primary/10">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Choose Your Agent</h1>
              <p className="text-muted-foreground">Cypher will greet you differently based on your identity.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Male Avatar */}
              <button
                onClick={() => handleAvatarSelect("male")}
                className={`group relative rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                  selectedAvatar === "male"
                    ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    : "border-slate-700 bg-slate-900/50 hover:border-cyan-500/50 hover:bg-slate-800/50"
                }`}
              >
                <div className="text-6xl mb-3">🧑‍💻</div>
                <div className={`font-bold text-lg ${selectedAvatar === "male" ? "text-cyan-400" : "text-slate-300"}`}>
                  Male Agent
                </div>
                <div className="text-xs text-muted-foreground mt-1">Default Avatar</div>
                {selectedAvatar === "male" && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </button>

              {/* Female Avatar */}
              <button
                onClick={() => handleAvatarSelect("female")}
                className={`group relative rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                  selectedAvatar === "female"
                    ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                    : "border-slate-700 bg-slate-900/50 hover:border-pink-500/50 hover:bg-slate-800/50"
                }`}
              >
                <div className="text-6xl mb-3">👩‍💻</div>
                <div className={`font-bold text-lg ${selectedAvatar === "female" ? "text-pink-400" : "text-slate-300"}`}>
                  Female Agent
                </div>
                <div className="text-xs text-muted-foreground mt-1">Default Avatar</div>
                {selectedAvatar === "female" && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </button>
            </div>

            <Button
              onClick={handleAvatarConfirm}
              disabled={!selectedAvatar || isLoading}
              className="w-full h-12 gradient-primary text-lg font-semibold"
            >
              {isLoading ? "Launching Academy..." : "Enter the Academy"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <Shield className="w-10 h-10 text-primary group-hover:cyber-glow transition-all" />
          <span className="text-2xl font-bold">Kavach Academy</span>
        </Link>

        <div className="glass-card cyber-border rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 cyber-border rounded-2xl bg-primary/10">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {mode === "login" ? "Welcome Back" : "Join Kavach"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login"
                ? "Continue your cybersecurity journey"
                : "Start defending the digital world"}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleFormSubmit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="cyberdefender"
                    value={formData.username}
                    onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                    className="pl-10 h-12 bg-muted/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@kavach.io"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="pl-10 h-12 bg-muted/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="pl-10 pr-10 h-12 bg-muted/50 border-border/50 focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator (Sign-Up Mode only) */}
              {mode === "signup" && formData.password && (
                <div className="space-y-1.5 mt-2 p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Strength Parameters:</span>
                    <span className={
                      passwordStrength === 0 || passwordStrength === 1 ? "text-red-500 font-bold" :
                      passwordStrength === 2 ? "text-orange-500 font-bold" :
                      passwordStrength === 3 ? "text-blue-500 font-bold" : "text-green-500 font-bold"
                    }>
                      {passwordStrength === 0 ? "Very Weak (Restricted)" :
                       passwordStrength === 1 ? "Weak (Restricted)" :
                       passwordStrength === 2 ? "Medium" :
                       passwordStrength === 3 ? "Strong" : "Very Strong"}
                    </span>
                  </div>
                  <div className="flex gap-1 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength === 0 ? "bg-red-500 w-1/12" :
                        passwordStrength === 1 ? "bg-red-500 w-1/4" :
                        passwordStrength === 2 ? "bg-orange-500 w-1/2" :
                        passwordStrength === 3 ? "bg-blue-500 w-3/4" : "bg-green-500 w-full"
                      }`} 
                    />
                  </div>
                  {passwordFeedback.length > 0 && (
                    <p className="text-[10px] text-slate-400 italic">
                      💡 {passwordFeedback[0]}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* CAPTCHA Verification Section */}
            <div className="space-y-2">
              <Label htmlFor="captcha" className="text-sm font-medium">Verify Security (Anti-Bot CAPTCHA)</Label>
              <div className="flex items-center gap-3">
                {/* Visual distorted captcha board */}
                <div 
                  className="flex-grow flex items-center justify-center h-12 px-6 rounded-xl bg-slate-900 border border-slate-800 text-lg font-bold font-mono tracking-[0.3em] text-cyan-400 select-none relative overflow-hidden"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(6,182,212,0.15) 1px, transparent 1px)",
                    backgroundSize: "8px 8px"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse" />
                  <span className="skew-x-12 rotate-2 filter blur-[0.2px] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    {captchaCode}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateCaptcha}
                  className="h-12 w-12 border-slate-700 hover:border-cyan-500 hover:text-cyan-400 hover:bg-slate-800/50"
                  title="Generate new CAPTCHA"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <Input
                id="captcha"
                type="text"
                placeholder="Enter the code shown above"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="h-12 bg-muted/50 border-border/50 focus:border-primary text-center font-mono font-bold uppercase tracking-wider"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full h-12 gradient-primary text-lg font-semibold">
              {isLoading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => { 
                setMode(mode === "login" ? "signup" : "login"); 
                setError(""); 
                setFormData({ username: "", email: "", password: "" }); 
              }}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Auth() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-primary animate-pulse">Loading...</div></div>}>
      <AuthContent />
    </Suspense>
  );
}
