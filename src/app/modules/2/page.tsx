"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/user-context";
import { CypherGuide } from "@/components/CypherGuide";
import { ModuleBriefing } from "@/components/ModuleBriefing";
import { PhishingSimulator } from "@/components/minigames/PhishingSimulator";
import { SpotlightOverlay } from "@/components/SpotlightOverlay";
import { 
  Shield, 
  Search, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// High-fidelity fallback scenarios (No Dummy Data)
const FALLBACK_SCENARIOS = [
  {
    id: "1",
    type: "email" as const,
    difficulty: "Beginner" as const,
    brand: "Netflix",
    sender: "billing@netfl1x-security.com",
    subject: "Final Notice: Update your payment method",
    content: "<p>Dear Subscriber,</p><p>We were unable to process your most recent membership payment. If we do not receive a valid payment method within 24 hours, your account will be <strong>permanently suspended</strong>.</p><p>Please click the button below to secure your account immediately.</p>",
    url: "netflix.com/billing-update",
    actual_link: "http://netfl1x-security.com/login?redirect=secure",
    red_flags: [
      { tool: "sniffer" as const, location: "url" as const, description: "Display link says netflix.com, but actual destination is netfl1x-security.com" },
      { tool: "sentiment" as const, location: "body" as const, description: "Uses high-pressure language: 'permanently suspended' and '24 hours'" },
      { tool: "sniffer" as const, location: "sender" as const, description: "Sender domain 'netfl1x-security.com' is not official netflix.com" }
    ],
    is_real: false
  },
  {
    id: "2",
    type: "website" as const,
    difficulty: "Analyst" as const,
    brand: "Google",
    content: "<div style='text-align:center; padding: 20px;'><img src='https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png' width='92' /><h2 style='margin-top:20px'>One account. All of Google.</h2><p>Sign in to continue to Gmail.</p><div style='border: 1px solid #dfe1e5; padding: 10px; border-radius: 4px; margin-top: 20px;'>alex.analyst@gmail.com</div></div>",
    url: "accounts.google.verify-secure.cc/signin",
    actual_link: "https://google-login.verify-secure.cc/auth",
    red_flags: [
      { tool: "sniffer" as const, location: "url" as const, description: "Root domain is verify-secure.cc, not google.com." },
      { tool: "ssl" as const, location: "url" as const, description: "Certificate issued to a different entity than Google LLC." }
    ],
    is_real: false
  },
  {
    id: "3",
    type: "email" as const,
    difficulty: "Beginner" as const,
    brand: "LinkedIn",
    sender: "security-noreply@linkedin.com",
    subject: "Successful login from a new device",
    content: "<p>Hi Alex,</p><p>Your LinkedIn account was just used to sign in from a new device in Tokyo, Japan. If this was you, you can safely ignore this email.</p><p>If you don't recognize this activity, please check your recent activity and secure your account.</p>",
    url: "linkedin.com/settings/security/activity",
    actual_link: "https://www.linkedin.com/settings/security/activity",
    red_flags: [
      { tool: "sniffer" as const, location: "sender" as const, description: "Authenticated Sender: security-noreply@linkedin.com" },
      { tool: "sniffer" as const, location: "url" as const, description: "Verified Domain: linkedin.com" },
      { tool: "ssl" as const, location: "url" as const, description: "Valid SSL Issuer: DigiCert Inc" }
    ],
    is_real: true
  },
  {
    id: "4",
    type: "website" as const,
    difficulty: "Analyst" as const,
    brand: "Microsoft",
    content: "<div style='text-align:left; padding: 40px; background: white; color: black;'><img src='https://logincdn.msauth.net/shared/1.0/content/images/microsoft_logo_ee5c8d9fb6248c938fd0dc19370e90bd.svg' width='108' /><h2 style='font-size: 24px; margin: 20px 0;'>Sign in</h2><input type='text' disabled value='alex.worker@outlook.com' style='width: 100%; border: none; border-bottom: 1px solid black; padding: 5px; margin-bottom: 20px;' /><p style='font-size: 13px;'>No account? <a href='#'>Create one!</a></p></div>",
    url: "login.microsoftonline.com",
    actual_link: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    red_flags: [
      { tool: "ssl" as const, location: "url" as const, description: "Corporate SSL: Microsoft Corporation (EV)" },
      { tool: "sniffer" as const, location: "url" as const, description: "Authentication Authority: login.microsoftonline.com" }
    ],
    is_real: true
  }
];

// Forensic Spotlight Tour Steps
const TOUR_STEPS = [
  {
    text: "Welcome, Agent. This is a suspicious message. Your job is simple: look for clues and decide if it's real or if it's a fake (phishing) trap.",
    targetId: null,
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_1.mp3"
  },
  {
    text: "On the right is your Analysis Tools. First, pick a tool to start your inspection.",
    targetId: "workbench",
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_2.mp3"
  },
  {
    text: "The URL Microscope is very useful. It shows you where a link really goes. If the text says 'google.com' but the tool shows something else, it's a fake!",
    targetId: "tool-sniffer",
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_3.mp3"
  },
  {
    text: "You can also check the Certificate (SSL) to see if the website is verified, or check the 'Vibe' of the text to see if it sounds too pushy or scary.",
    targetId: "tools-secondary",
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_4.mp3"
  },
  {
    text: "When you find a clue, click the 'Evidence Selector' and then click on the suspicious part of the message to save it.",
    targetId: "tool-selector",
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_5.mp3"
  },
  {
    text: "Your clues appear here. Collect enough clues before making your final choice.",
    targetId: "workbench",
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_6.mp3"
  },
  {
    text: "Finally, choose your choice: Real or Fake. If it's fake, we'll block it and you'll earn points. Take your time!",
    targetId: null,
    isBlocking: true,
    type: "info",
    audioFile: "/audio/m2_tour_7.mp3"
  }
];

export default function PhishingModule() {
  const router = useRouter();
  const { user, profile, updateScore, isLoading } = useUser();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<"theory" | "briefing" | "game" | "complete">("briefing");
  const [cypherMessage, setCypherMessage] = useState<{ text: string; type: "info" | "warning" | "success" | "tip"; audioFile?: string; isBlocking?: boolean } | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ correctCount: number; totalCount: number } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function fetchScenarios() {
      try {
        const { data, error } = await supabase.from('phishing_scenarios').select('*');
        let pool = FALLBACK_SCENARIOS;
        
        if (data && data.length > 0) {
          pool = data as any;
        }

        // Shuffle and take exactly 2 cases for the session
        const selection = [...pool]
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);
          
        setScenarios(selection);
      } catch (err) {
        console.error("Failed to fetch scenarios from Supabase, using fallbacks:", err);
        setScenarios(FALLBACK_SCENARIOS.sort(() => Math.random() - 0.5).slice(0, 2));
      } finally {
        setLoading(false);
      }
    }
    fetchScenarios();
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    setGameState("game");
    setSessionResults(null);
    setCypherMessage(null);
    
    // Fetch fresh scenarios
    try {
      const { data } = await supabase.from('phishing_scenarios').select('*');
      let pool = data && data.length > 0 ? data : FALLBACK_SCENARIOS;
      const selection = [...pool].sort(() => Math.random() - 0.5).slice(0, 2);
      setScenarios(selection);
    } catch (err) {
      setScenarios(FALLBACK_SCENARIOS.sort(() => Math.random() - 0.5).slice(0, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (user) await updateScore(50, { moduleId: 2, moduleName: "Phishing Lab (Theory)" }); // Theory completion
    setGameState("game");
    setShowTour(true);
    setTourStep(0);
    setCypherMessage(TOUR_STEPS[0] as any);
  };

  const nextTourStep = () => {
    const nextStep = tourStep + 1;
    if (nextStep < TOUR_STEPS.length) {
      setTourStep(nextStep);
      setCypherMessage(TOUR_STEPS[nextStep] as any);
    } else {
      setShowTour(false);
      setCypherMessage({
        text: "Onboarding Complete. The intercept is live. Use your tools to begin the investigation.",
        type: "success"
      });
      // Auto-clear after 5 seconds to not block view
      setTimeout(() => setCypherMessage(null), 5000);
    }
  };

  const handleGameComplete = async (results: { score: number; correctCount: number; totalCount: number }) => {
    setGameState("complete");
    setSessionResults({ correctCount: results.correctCount, totalCount: results.totalCount });
    
    // XP Scaling Logic
    // 0 correct = 50 XP (bonus for trying)
    // 1 correct = 150 XP
    // 2 correct = 250 XP
    let xpToAward = 50;
    if (results.correctCount === 1) xpToAward = 150;
    if (results.correctCount === 2) xpToAward = 250;

    if (user) {
      try {
        await updateScore(xpToAward, { 
          moduleId: 2, 
          moduleName: "Phishing Lab", 
          accuracy: (results.correctCount / results.totalCount) * 100 
        });
      } catch (err) {
        console.error("XP Update failed:", err);
      }
    }

    // Dynamic Cypher Dialogue
    if (results.correctCount === 0) {
      setCypherMessage({
        text: "Critical failure, Analyst. Our systems have been breached because of these missed cues. You must recalibrate and try again to secure the perimeter.",
        type: "warning",
        audioFile: "/audio/m2_fail.mp3"
      });
    } else if (results.correctCount === 1) {
      setCypherMessage({
        text: "Mixed results. You caught a major threat but let one slide. In the field, 'half right' equal a full breach. Re-examine your forensic markers.",
        type: "info",
        audioFile: "/audio/m2_mixed.mp3"
      });
    } else {
      setCypherMessage({
        text: "Excellent forensic work, Analyst. You've successfully categorized the intercepts and protected the HQ. Your reputation in the Academy has grown.",
        type: "success",
        audioFile: "/audio/m2_success.mp3"
      });
    }
  };

  // Handle Loading Session or Fetching Scenarios
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Zap className="w-12 h-12 text-cyan-500 animate-pulse mx-auto" />
          <div className="text-cyan-500 font-mono tracking-[0.2em] text-sm uppercase animate-pulse">Establishing Secure Connection...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navigation />
      <CypherGuide 
        message={cypherMessage} 
        isVisible={!!cypherMessage} 
        onSkip={() => {
          setShowTour(false);
          setCypherMessage(null);
        }}
        onNext={showTour ? nextTourStep : undefined}
        isTour={showTour}
        position="bottom-right"
      />

      <main className="container mx-auto px-4 py-8 mt-16 text-slate-100">
        {gameState !== "briefing" && (
          <div className="mb-8 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
            <div>
              <Button variant="ghost" className="mb-4" onClick={() => router.push("/modules")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
              </Button>
              <h1 className="text-4xl font-bold text-gradient mb-2">Module 2: The Phishing Catch</h1>
              <p className="text-slate-400">Master the art of identifying deceptive communications and forensic analysis.</p>
            </div>
            <div className="hidden md:block">
               <div className="flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-2xl border border-slate-700">
                  <Zap className="w-5 h-5 text-yellow-400" />
                   <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Potential XP</div>
                      <div className="text-xl font-bold text-slate-100">250 XP</div>
                   </div>
               </div>
            </div>
          </div>
        )}

        {gameState === "briefing" && (
          <ModuleBriefing 
            title="Operation: Intercept"
            moduleName="Module 2: Phishing"
            description="Our perimeter sensors have detected a wave of malicious communications targeting the executive team. As a lead analyst, you must verify the integrity of these intercepts using our forensic suite."
            objectives={[
              "Identify mismatched URLs using the Digital Microscope",
              "Verify SSL Certificate origins using X-Ray tools",
              "Detect psychological pressure tactics via the Sentiment Engine",
              "Execute Neutralization protocols on malicious intercepts"
            ]}
            onAccept={handleStartGame}
          />
        )}

        {gameState === "game" && (
          <>
            <SpotlightOverlay targetId={showTour ? TOUR_STEPS[tourStep].targetId : null} isOpen={showTour} />
            {showTour && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4">
                <Badge variant="outline" className="bg-black/80 backdrop-blur-md border-cyan-500/50 text-cyan-400 px-6 py-2 text-sm font-mono tracking-widest shadow-2xl shadow-cyan-500/20">
                  TRAINING MODE // STEP {tourStep + 1} OF {TOUR_STEPS.length}
                </Badge>
              </div>
            )}
            {scenarios.length > 0 && (
              <PhishingSimulator scenarios={scenarios} onComplete={handleGameComplete} />
            )}
          </>
        )}

        {gameState === "complete" && (
          <Card className="max-w-2xl mx-auto glass-card border-green-500 shadow-2xl shadow-green-500/20">
            <CardHeader className="text-center pb-0">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <CardTitle className="text-3xl font-bold text-green-400">Case Files Closed</CardTitle>
              <CardDescription className="text-slate-400 mt-2">Module 2: The Phishing Catch - 100% Complete</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">XP Earned</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    +{sessionResults?.correctCount === 2 ? 250 : sessionResults?.correctCount === 1 ? 150 : 50}
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Accuracy</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {sessionResults ? Math.round((sessionResults.correctCount / sessionResults.totalCount) * 100) : 0}%
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg text-sm text-slate-300 italic">
                {sessionResults?.correctCount === 2 
                  ? '"Excellent work, Analyst. You\'ve blocked a massive credential harvesting campaign. The Academy is safe... for now."'
                  : sessionResults?.correctCount === 1 
                  ? '"Half the threat is still a threat. You showed competence, but precision is what wins cyber wars. Analyze your errors and target perfection."'
                  : '"This is a disaster, Analyst. You were completely deceived by the adversary. Return to theory immediately or try the simulation again."'}
              </div>
              
              <div className="flex flex-col gap-3">
                <Button onClick={handleRetry} className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white text-xl font-bold">
                  {sessionResults?.correctCount === 2 ? "Run New Simulation" : "Retry Module Training"}
                </Button>
                <Button onClick={() => router.push("/modules")} variant="ghost" className="w-full text-slate-400 hover:text-white">
                  Return to Modules
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}