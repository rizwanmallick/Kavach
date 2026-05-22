"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  Flag, 
  Info, 
  MousePointer2, 
  Lock, 
  AlertTriangle,
  Mail,
  Globe,
  Monitor,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface RedFlag {
  tool: "sniffer" | "ssl" | "sentiment";
  location: "url" | "sender" | "body";
  description: string;
}

type ToolType = "sniffer" | "ssl" | "sentiment" | "selector";

interface PhishingScenario {
  id: string;
  type: "email" | "website";
  difficulty: "Beginner" | "Analyst" | "Expert";
  brand: string;
  sender?: string;
  subject?: string;
  content: string;
  url: string;
  actual_link: string;
  red_flags: RedFlag[];
  is_real: boolean;
}

interface PhishingSimulatorProps {
  onComplete: (results: { score: number; correctCount: number; totalCount: number }) => void;
  scenarios: PhishingScenario[];
}

export function PhishingSimulator({ onComplete, scenarios }: PhishingSimulatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [findings, setFindings] = useState<Set<string>>(new Set());
  const [showVerdict, setShowVerdict] = useState(false);
  const [userVerdict, setUserVerdict] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hoveredLink, setHoveredLink] = useState<{ display: string; actual: string } | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSSL, setShowSSL] = useState(false);

  const currentScenario = scenarios[currentIndex];

  const handleInspect = (location: "url" | "sender" | "body") => {
    // Only log evidence if the Evidence Selector is active
    if (activeTool !== 'selector') return;

    // Find any flag at this location that matches the current active investigation goal
    // or simply find any uncollected flag at this location
    const flag = currentScenario.red_flags.find(f => f.location === location && !findings.has(f.description));
    
    if (flag) {
      setFindings(prev => {
        const next = new Set(prev);
        next.add(flag.description);
        return next;
      });
    }
  };

  const submitVerdict = (verdict: boolean) => {
    setUserVerdict(verdict);
    const correct = verdict === currentScenario.is_real;
    setIsCorrect(correct);
    setShowVerdict(true);
    
    if (correct) {
      setScore(prev => prev + 100);
      setCorrectCount(prev => prev + 1);
    }
  };

  const nextChallenge = () => {
    if (currentIndex + 1 < scenarios.length) {
      setCurrentIndex(prev => prev + 1);
      resetState();
    } else {
      onComplete({ 
        score: score, 
        correctCount: correctCount, 
        totalCount: scenarios.length 
      });
    }
  };

  const resetState = () => {
    setActiveTool(null);
    setFindings(new Set());
    setShowVerdict(false);
    setUserVerdict(null);
    setIsCorrect(null);
    setHoveredLink(null);
    setShowSSL(false);
  };

  const highlightSentiment = () => {
    if (activeTool === "sentiment") {
      handleInspect("body");
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
      
      {/* LEFT: The Investigation Workspace */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          {/* Simulated App Header */}
          <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentScenario?.type === "email" ? <Mail className="w-4 h-4 text-purple-400" /> : <Globe className="w-4 h-4 text-cyan-400" />}
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Intercept Source: {currentScenario?.brand || "System Intercept"} - CASE #{currentIndex + 1}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-600">
              {currentScenario?.difficulty || "Standard"} DEPTH
            </Badge>
          </div>

          {/* Browser/Email Address Bar */}
          <div className="bg-slate-950 p-2 flex items-center gap-2 border-b border-slate-800">
            <div className={`flex items-center gap-2 bg-slate-900 border rounded px-3 py-1 flex-1 ${activeTool === 'sniffer' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-700'}`}>
              <Lock 
                className={`w-3 h-3 cursor-pointer transition-colors ${activeTool === 'ssl' ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'} ${activeTool === 'selector' ? 'text-yellow-400 ring-2 ring-yellow-500 rounded-full' : ''}`} 
                onClick={() => {
                  if (activeTool === 'selector') {
                    handleInspect("url");
                  } else {
                    setActiveTool("ssl");
                    setShowSSL(true);
                  }
                }}
              />
              <span 
                className={`text-xs font-mono truncate cursor-crosshair ${activeTool === 'sniffer' ? 'text-cyan-400' : 'text-slate-400'}`}
                onMouseEnter={() => activeTool === 'sniffer' && setHoveredLink({ display: currentScenario.url, actual: currentScenario.actual_link })}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => {
                  if (activeTool === 'selector') {
                    handleInspect("url");
                  } else {
                    setActiveTool("sniffer");
                  }
                }}
              >
                {currentScenario.url}
              </span>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-8 bg-slate-900 min-h-[400px] relative group">
            {currentScenario?.type === "email" && (
              <div className="mb-6 border-b border-slate-800 pb-4">
                <div className="text-sm text-slate-400 mb-1">
                  <span className="font-bold text-slate-500 w-16 inline-block">From:</span> 
                  <span 
                    className={`cursor-crosshair px-1 rounded transition-colors ${activeTool === 'sniffer' ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : ''} ${activeTool === 'selector' ? 'ring-2 ring-cyan-500' : ''}`}
                    onClick={() => {
                      if (activeTool === 'selector') {
                        handleInspect("sender");
                      }
                    }}
                  >
                    {currentScenario?.sender || "unknown-origin@network.kavach"}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  <span className="font-bold text-slate-500 w-16 inline-block">Subject:</span> {currentScenario?.subject || "Encrypted Communication"}
                </div>
              </div>
            )}

            <div 
              className={`max-w-none transition-all ${activeTool === 'sentiment' ? 'cursor-help' : ''} ${activeTool === 'selector' ? 'cursor-crosshair ring-1 ring-slate-800' : ''}`}
              onClick={() => {
                if (activeTool === 'selector') {
                  handleInspect("body");
                }
              }}
              dangerouslySetInnerHTML={{ 
                __html: activeTool === 'sentiment' 
                  ? (currentScenario?.content || "").replace(
                      /\b(immediately|suspended|urgent|24 hours|warning|verify|action|disabled)\b/gi, 
                      match => `<span class="bg-purple-500/40 text-purple-200 border-b border-purple-400 animate-pulse px-1 rounded">${match}</span>`
                    )
                  : (currentScenario?.content || "")
              }}
            />

            {/* Simulated Link Button (Common in Phishing) */}
            <div className="mt-12 text-center">
              <div 
                className={`inline-block px-10 py-4 bg-primary text-white font-bold rounded cursor-crosshair transition-all hover:scale-105 ${activeTool === 'sniffer' ? 'ring-4 ring-cyan-500' : ''} ${activeTool === 'selector' ? 'ring-4 ring-yellow-500 bg-red-600' : ''}`}
                onMouseEnter={() => activeTool === 'sniffer' && setHoveredLink({ display: currentScenario.url, actual: currentScenario.actual_link })}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => {
                  if (activeTool === 'selector') {
                    handleInspect("body");
                    handleInspect("url"); // Some buttons might be clues for either
                  }
                }}
                title={activeTool === 'selector' ? 'Log as Forensic Evidence' : 'Caution: Interaction Point'}
              >
                Verify Account Now
              </div>
            </div>

            {/* HUD Link Preview (Floating) */}
            {hoveredLink && activeTool === 'sniffer' && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/95 border border-cyan-500 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <Search className="w-4 h-4 text-cyan-400 animate-pulse" />
                <div className="text-[10px] font-mono leading-none">
                  <div className="text-slate-500 mb-1">DISPLAY URL: {hoveredLink.display}</div>
                  <div className="text-cyan-400 font-bold font-mono">ACTUAL DESTINATION: {hoveredLink.actual}</div>
                </div>
              </div>
            )}

             {/* Educational SSL Forensic Card */}
            {activeTool === 'ssl' && showSSL && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 animate-in zoom-in duration-300">
                <Card className="bg-slate-950 border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <CardHeader className="py-3 bg-cyan-950/30 border-b border-cyan-500/30">
                    <CardTitle className="text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Certificate Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Issued To</div>
                      <div className={`text-xs font-mono ${currentScenario.is_real ? 'text-green-400' : 'text-red-400'}`}>
                        {currentScenario.is_real ? currentScenario.brand : (currentScenario.url.includes('google') ? 'Unknown Entity' : currentScenario.url)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Trust Authority</div>
                      <div className="text-xs font-mono text-slate-300">
                        {currentScenario.is_real ? "GlobalSign Root CA" : "Let's Encrypt (R3) - DV"}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 italic">
                      {currentScenario.is_real 
                        ? "High-assurance certificate verified for corporate use." 
                        : "Warning: Free domain-validated certificate. Common in temporary phishing sites."}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-[10px]"
                      onClick={() => setShowSSL(false)}
                    >
                      Close Forensic Detail
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {!showVerdict ? (
          <div id="verdict-actions" className="flex flex-col gap-3">
            <div className="flex gap-4">
              <Button 
                disabled={findings.size < currentScenario.red_flags.length}
                onClick={() => submitVerdict(false)} 
                className={`flex-1 font-bold h-14 text-lg border-b-4 transition-all ${findings.size < currentScenario.red_flags.length ? 'bg-slate-800 text-slate-600 border-slate-900 grayscale' : 'bg-red-600 hover:bg-red-500 text-white border-red-800 active:border-b-0'}`}
              >
                <Flag className="w-5 h-5 mr-2" />
                REPORT AS PHISHING
              </Button>
              <Button 
                disabled={findings.size < currentScenario.red_flags.length}
                onClick={() => submitVerdict(true)} 
                variant={findings.size < currentScenario.red_flags.length ? "outline" : "default"}
                className={`flex-1 font-bold h-14 text-lg border-b-4 transition-all ${findings.size < currentScenario.red_flags.length ? 'border-slate-800 bg-slate-900/50 text-slate-700' : 'bg-green-600 hover:bg-green-500 text-white border-green-800 active:border-b-0'}`}
              >
                <ShieldCheck className="w-5 h-5 mr-2" />
                REAL
              </Button>
            </div>
            {findings.size < currentScenario.red_flags.length && (
              <p className="text-[10px] text-center text-slate-500 italic animate-pulse">
                [LOCKED] Collect all {currentScenario.red_flags.length} forensic indicators to unlock verdict actions.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in zoom-in duration-300">
            <div className={`p-6 rounded-xl border-2 flex items-center justify-between ${isCorrect ? 'bg-green-950/30 border-green-500/50' : 'bg-red-950/30 border-red-500/50'}`}>
              <div className="flex items-center gap-4">
                {isCorrect ? <ShieldCheck className="w-10 h-10 text-green-400" /> : <ShieldAlert className="w-10 h-10 text-red-400" />}
                <div>
                  <h3 className={`text-xl font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? (currentScenario.is_real ? 'VERIFICATION SUCCESSFUL' : 'ANALYSIS ACCURATE') : 'FORENSIC FAILURE'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {isCorrect 
                      ? (currentScenario.is_real ? `Secure site confirmed. Granting system access...` : `Threat neutralized. Now follow the Response Protocol.`) 
                      : `You were deceived. This was a ${currentScenario.is_real ? 'legitimate' : 'malicious'} intercept.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Response Protocol Checklist (Incident Response) */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                  {currentScenario.is_real ? 'Safety Approval Protocol' : 'Incident Response Protocol'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 grid grid-cols-2 gap-3">
                {isCorrect && currentScenario.is_real ? (
                  // Real Case Success Steps
                  [
                    "Verified Certificate Authority", 
                    "Authenticated Domain Registry", 
                    "Analyzed Content Tone", 
                    "Grant Corporate Access"
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-950 rounded border border-slate-800">
                      <div className="w-4 h-4 border border-green-700 rounded flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-[11px] text-slate-400">{step}</span>
                    </div>
                  ))
                ) : (
                  // Phishing Case Success Steps (or Failure)
                  [
                    "Block sender domain at Firewall", 
                    "Quarantine employee workstation", 
                    "Reset corporate credentials", 
                    "Broadcast phish alert"
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-950 rounded border border-slate-800">
                      <div className="w-4 h-4 border border-slate-700 rounded flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span className="text-[11px] text-slate-400">{step}</span>
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter className="px-4 pb-4">
                <Button 
                  onClick={nextChallenge} 
                  className="w-full bg-white text-black font-black hover:bg-slate-200"
                >
                  {isCorrect ? 'PROCEED TO NEXT INTERCEPT' : 'RETRY CASE'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* RIGHT: Forensic HUD Tools */}
      <div id="workbench" className="lg:col-span-4 space-y-4">
        <Card className="bg-slate-900 border-slate-700 shadow-inner">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-tighter">
              <Monitor className="w-4 h-4" />
              Analyst Workbench
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            
            <div id="tool-sniffer" className="grid grid-cols-1 gap-2">
              <Button 
                variant={activeTool === 'sniffer' ? 'default' : 'outline'}
                className={`justify-start gap-3 h-12 transition-all ${activeTool === 'sniffer' ? 'bg-cyan-600 border-cyan-400 shadow-lg shadow-cyan-900/50' : 'border-slate-800 bg-slate-950/50 text-slate-400'}`}
                onClick={() => setActiveTool("sniffer")}
              >
                <MousePointer2 className="w-4 h-4" />
                <span>URL Microscope</span>
              </Button>
              <div id="tools-secondary" className="flex flex-col gap-2">
                <Button 
                  variant={activeTool === 'ssl' ? 'default' : 'outline'}
                  className={`justify-start gap-3 h-12 transition-all ${activeTool === 'ssl' ? 'bg-green-600 border-green-400 shadow-lg shadow-green-900/50' : 'border-slate-800 bg-slate-950/50 text-slate-400'}`}
                  onClick={() => setActiveTool("ssl")}
                >
                  <Lock className="w-4 h-4" />
                  <span>SSL X-Ray</span>
                </Button>
                <Button 
                  variant={activeTool === 'sentiment' ? 'default' : 'outline'}
                  className={`justify-start gap-3 h-12 transition-all ${activeTool === 'sentiment' ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-900/50' : 'border-slate-800 bg-slate-950/50 text-slate-400'}`}
                  onClick={() => setActiveTool("sentiment")}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Sentiment Engine</span>
                </Button>
                
                <div className="pt-2">
                  <Button 
                    id="tool-selector"
                    variant={activeTool === 'selector' ? 'default' : 'outline'}
                    className={`w-full justify-start gap-3 h-14 transition-all border-2 ${activeTool === 'selector' ? 'bg-yellow-500 border-yellow-300 text-black shadow-lg shadow-yellow-500/20' : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500'}`}
                    onClick={() => setActiveTool("selector")}
                  >
                    <Search className="w-5 h-5" />
                    <span className="font-bold">Evidence Selector</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Evidence Pane */}
            <div id="evidence-log" className="pt-4 border-t border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Forensic Evidence Collected</span>
                <span className="text-cyan-400 font-mono">{findings.size} / {currentScenario.red_flags.length}</span>
              </h4>
              <div className="space-y-2 min-h-[100px]">
                {findings.size === 0 ? (
                  <div className="text-slate-700 text-xs italic p-4 text-center border border-dashed border-slate-800 rounded-lg">
                    No forensic evidence collected yet... Use the Evidence Selector to confirm observations.
                  </div>
                ) : (
                  Array.from(findings).map((finding, i) => (
                    <div key={i} className="flex gap-3 items-start animate-in slide-in-from-right-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-300 leading-tight font-mono">{finding}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Learning Hint (Cypher Tip) */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-3 rounded-lg flex gap-3">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-[11px] text-slate-300 italic">
                {activeTool === 'sniffer' ? "Observation Mode: The microscope reveals hidden destinations. Note the ACTUAL URL." : 
                 activeTool === 'ssl' ? "Observation Mode: Identity Check. Real sites use Corporate EV/OV certificates." :
                 activeTool === 'sentiment' ? "Observation Mode: Psychology Check. Phishers use fear and urgency to bypass logic." :
                 activeTool === 'selector' ? "Forensic Logging: Click elements (URL bar, Sender, Buttons) to log detected flags." :
                 "The 'Verify' button is usually the payload. Inspect it with the URL Microscope to find where it really leads."}
              </p>
            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  );
}
