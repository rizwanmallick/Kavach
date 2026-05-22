"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Terminal, Shield, CheckCircle2, ChevronRight, Search, FileText, Zap } from "lucide-react";

interface TerminalVaultProps {
  onComplete: () => void;
  onDialogue?: (id: string) => void;
}

export function TerminalVault({ onComplete, onDialogue }: TerminalVaultProps) {
  const [introStep, setIntroStep] = useState(0); // 0/1 = instruction pages, 2 = play
  const [history, setHistory] = useState<string[]>([
    "KavachOS v2.4.1 (Admin Mode)",
    "Type command or use the Toolkit to interact."
  ]);
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [isHacking, setIsHacking] = useState(false);
  
  // Progress state: 0=start, 1=osint done, 2=wordlist done, 3=cracked
  const [step, setStep] = useState(0); 
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [currentScenario, setCurrentScenario] = useState<any>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Trigger intro on mount and fetch scenarios
  useEffect(() => {
    onDialogue?.("vault-intro");

    const fetchScenarios = async () => {
      try {
        const { data } = await import("@/lib/supabase").then(m => m.supabase.from("password_scenarios").select("*"));
        if (data && data.length > 0) {
          setScenarios(data);
          setCurrentScenario(data[Math.floor(Math.random() * data.length)]);
        } else {
          // Fallback
          setCurrentScenario({
            name: "John Doe",
            pet_name: "Buster",
            birth_year: "1985",
            favorite_team: "Lakers",
            correct_password: "Buster1985"
          });
        }
      } catch (err) {
        console.error("Failed to fetch scenarios:", err);
      }
    };
    fetchScenarios();
  }, [onDialogue]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = (rawCmd: string) => {
    const cmd = rawCmd.toLowerCase().trim();
    setHistory(prev => [...prev, `C:\\Hacker\\Tools> ${rawCmd}`]);

    if (cmd === "analyze target") {
      if (step >= 1) {
        setHistory(prev => [...prev, "Target already analyzed."]);
      } else {
        setHistory(prev => [...prev, "[*] Scraping public profile..."]);
        onDialogue?.("vault-osint");
        
        // Wait for Cypher to say "Data cached" (approx 2s)
        setTimeout(() => {
          setHistory(prev => [
            ...prev, 
            `Target Name: ${currentScenario?.name || 'John Doe'}`,
            `Pet Name: <span class='text-yellow-400 font-bold'>${currentScenario?.pet_name || currentScenario?.vulnerabilities?.[0] || 'Buster'}</span>`,
            `Significant Year: <span class='text-yellow-400 font-bold'>${currentScenario?.birth_year || currentScenario?.vulnerabilities?.[1] || '1985'}</span>`,
            `Special Interest: <span class='text-yellow-400 font-bold'>${currentScenario?.favorite_team || currentScenario?.vulnerabilities?.[2] || 'Lakers'}</span>`,
            "[*] OSINT complete. Data cached."
          ]);
          setStep(1);
        }, 2500);
      }
    } else if (cmd === "generate_wordlist") {
      if (step === 0) {
        setHistory(prev => [...prev, "[!] Cannot generate wordlist. No target data. Run 'analyze target' first."]);
      } else if (step >= 2) {
         setHistory(prev => [...prev, "Wordlist already generated."]);
      } else {
        onDialogue?.("vault-dictionary");
        setHistory(prev => [
          ...prev,
          "[*] Compiling dictionary based on OSINT...",
          "[*] Applying common permutations (capitalization, special chars)...",
          "[*] Generated 1.4 million potential combinations.",
          "Saved to target_dict.txt"
        ]);
        setStep(2);
      }
    } else if (cmd === "crack_vault target_dict.txt" || cmd === "crack_vault") {
      if (step < 2) {
        setHistory(prev => [...prev, "[!] Error: require target_dict.txt. Generate wordlist first."]);
      } else if (step === 2) {
        startHackingSequence();
      }
    } else {
      setHistory(prev => [...prev, `'${rawCmd}' is not recognized. Use the Hacker Toolkit commands.`]);
    }
    
    setInput("");
  };

  const startHackingSequence = () => {
    setIsHacking(true);
    setHistory(prev => [...prev, "[**] INITIALIZING BRUTE FORCE ATTACK...", "Target: 192.168.1.1 (VAULT)"]);
    onDialogue?.("vault-bruteforce");
    
    // Simulating generated wordlist combinations based on OSINT
    const targetPw = currentScenario?.correct_password || "Buster1985";
    const baseGuesses = [
      "admin123", "password", "security", "123456", 
      ...(currentScenario?.vulnerabilities || ["Buster", "1985", "Lakers"]).map((v: string) => `${v}123`),
      ...(currentScenario?.vulnerabilities || ["Buster", "1985", "Lakers"]).map((v: string) => `${v}${targetPw.slice(-2)}`)
    ];

    // Filter out the actual correct password from random guesses so it never shows as [FAIL]
    const wordlistGuesses = baseGuesses
      .filter(g => g.toLowerCase() !== targetPw.toLowerCase())
      .sort(() => Math.random() - 0.5);

    // Make sure the target is near the end for dramatic effect (max 15 fails)
    const finalGuesses = wordlistGuesses.slice(0, 15);
    finalGuesses.push(targetPw);

    let attempts = 0;
    // We want the match to hit roughly when Cypher says "There... match found" 
    // which is about 6 seconds into brute-force audio.
    const interval = setInterval(() => {
      if (attempts < finalGuesses.length - 1) {
        const guess = finalGuesses[attempts];
        setHistory(prev => [...prev, `<span class='text-red-400'>[FAIL] Testing password: ${guess}... Denied</span>`]);
        attempts++;
      } else {
        clearInterval(interval);
        setHistory(prev => [
          ...prev, 
          "<span class='text-green-400 font-bold'>=========================================</span>",
          `<span class='text-green-400 font-bold'>[SUCCESS] MATCH FOUND: ${targetPw}</span>`,
          "<span class='text-green-400 font-bold'>=========================================</span>",
          "Access Granted. Disabling mainframe security locks.",
          "<span class='text-red-500 font-black animate-pulse text-lg'>!!! VAULT COMPROMISED !!!</span>",
          "Protocol: Breach confirmed. Awaiting Admin acknowledgement..."
        ]);
        
        onDialogue?.("vault-breached");
        setIsFinishing(true);
        setStep(3);
      }
    }, 300); // Slower interval so 20 attempts take ~6 seconds
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (introStep < 2) return;
    if (!isHacking && !unlocked && input) {
      handleCommand(input);
    }
  };

  const triggerToolkit = (cmd: string) => {
    if (introStep < 2) return;
    if (!isHacking && !unlocked) {
      setInput(cmd);
      handleCommand(cmd);
    }
  };

  const getHint = () => {
    if (step === 0) return "Cypher: Type 'analyze target' to scrape the profile.";
    if (step === 1) return "Cypher: Type 'generate_wordlist' to build the dictionary.";
    if (step === 2) return "Cypher: Type 'crack_vault target_dict.txt'";
    return "";
  };

  if (unlocked) {
    return (
      <div className="w-full max-w-4xl bg-slate-900 border-red-500 shadow-2xl shadow-red-500/20 text-center p-12 rounded-xl animate-in zoom-in duration-500">
         <Shield className="w-24 h-24 text-red-500 mx-auto mb-6 animate-pulse" />
         <h2 className="text-4xl font-bold text-red-500 mb-4 tracking-widest uppercase">Breached: Admin Access</h2>
         <p className="text-cyan-200 text-lg mb-8">See how easy that was? The target's weak password '{currentScenario?.correct_password || "Buster1985"}' was cracked by your custom dictionary attack.</p>

         <Button onClick={onComplete} size="lg" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl px-12 py-6">
           Continue
         </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-5xl bg-slate-950 border-cyan-500 shadow-2xl shadow-cyan-500/20 grid grid-cols-1 md:grid-cols-3 overflow-hidden relative">
      {introStep < 2 && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="text-cyan-300 font-bold tracking-widest text-xs mb-3 uppercase">Quick briefing</div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-200">
              {introStep === 0 ? (
                <>
                  <li>This is a safe simulation of a dictionary attack.</li>
                  <li>You will run three commands in order to unlock the vault.</li>
                  <li>Use the buttons on the right if you prefer not to type.</li>
                </>
              ) : (
                <>
                  <li>Step 1: Run <span className="font-mono text-cyan-300">analyze target</span>.</li>
                  <li>Step 2: Run <span className="font-mono text-cyan-300">generate_wordlist</span>.</li>
                  <li>Step 3: Run <span className="font-mono text-cyan-300">crack_vault</span>.</li>
                </>
              )}
            </ul>
            <div className="mt-5 flex gap-3">
              {introStep < 1 ? (
                <Button onClick={() => setIntroStep(1)} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  Next
                </Button>
              ) : (
                <Button onClick={() => setIntroStep(2)} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  Acknowledge &amp; Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* LEFT: Retro Terminal (2 Columns) */}
      <div className="md:col-span-2 flex flex-col border-r border-slate-800">
         <div className="bg-slate-900 border-b border-cyan-900/50 p-3 flex items-center gap-2">
           <Terminal className="text-cyan-500 w-5 h-5" />
           <span className="text-slate-300 font-mono text-sm">HackerTerminal_v2.exe</span>
         </div>
         
         <div 
           ref={terminalRef}
           className="bg-black text-green-500 font-mono p-6 h-96 overflow-y-auto space-y-2 text-sm leading-relaxed"
         >
           {history.map((line, i) => (
             <div key={i} dangerouslySetInnerHTML={{ __html: line }} />
           ))}
           {!isHacking && (
             <form onSubmit={onSubmit} className="flex items-center gap-2 mt-4 text-green-400">
               <span>C:\Hacker\Tools&gt;</span>
               <input 
                 autoFocus
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 className="flex-1 bg-transparent outline-none border-none text-green-500"
                 placeholder={getHint()}
               />
             </form>
           )}
           {isHacking && !isFinishing && <div className="animate-pulse">_ Generating permutations...</div>}
           {isFinishing && (
             <div className="mt-6 p-4 border border-red-500 bg-red-500/10 rounded animate-in zoom-in">
               <div className="text-red-500 font-bold text-lg mb-2">CRACK COMPLETE</div>
               <p className="text-xs text-slate-300 mb-4 font-sans">The password has been recovered and the vault perimeter is breached. Proceed to report findings?</p>
               <Button 
                onClick={() => {
                  setUnlocked(true);
                  onDialogue?.("vault-breached-full");
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold w-full h-10 text-xs uppercase tracking-widest"
               >
                 Acknowledge Breach & Proceed
               </Button>
             </div>
           )}
         </div>
      </div>

      {/* RIGHT: Tracker & Toolkit (1 Column) */}
      <div className="md:col-span-1 bg-slate-900 flex flex-col">
         {/* Mission Tracker */}
         <div className="p-6 border-b border-slate-800 flex-1">
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
              Mission Tracker
            </h3>
            <ul className="space-y-6">
               <li className={`flex items-start gap-3 transition-opacity ${step >= 0 ? 'opacity-100' : 'opacity-50'}`}>
                 {step >= 1 ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <div className="w-5 h-5 border-2 border-cyan-600 rounded-full shrink-0" />}
                 <div>
                   <p className={`font-bold text-sm ${step >= 1 ? 'text-green-400' : 'text-slate-200'}`}>1. Run OSINT Scan</p>
                   <p className="text-xs text-slate-500 mt-1">Gather intel on target.</p>
                 </div>
               </li>
               <li className={`flex items-start gap-3 transition-opacity ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                 {step >= 2 ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <div className="w-5 h-5 border-2 border-cyan-600 rounded-full shrink-0" />}
                 <div>
                   <p className={`font-bold text-sm ${step >= 2 ? 'text-green-400' : 'text-slate-200'}`}>2. Compile Dictionary</p>
                   <p className="text-xs text-slate-500 mt-1">Build permutation wordlist.</p>
                 </div>
               </li>
               <li className={`flex items-start gap-3 transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                 {step >= 3 ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <div className="w-5 h-5 border-2 border-cyan-600 rounded-full shrink-0" />}
                 <div>
                   <p className={`font-bold text-sm ${step >= 3 ? 'text-green-400' : 'text-slate-200'}`}>3. Execute Brute-Force</p>
                   <p className="text-xs text-slate-500 mt-1">Launch dictionary attack.</p>
                 </div>
               </li>
            </ul>
         </div>

         {/* Hacker Toolkit */}
         <div className="p-6 bg-slate-950">
            <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-4">
              Hacker Toolkit Quick-Actions
            </h3>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => triggerToolkit("analyze target")}
                disabled={step !== 0 || isHacking}
                className={`w-full justify-start text-xs border-slate-700 bg-slate-900 ${step === 0 ? 'text-cyan-400 border-cyan-500/50 hover:bg-cyan-900/30 hover:text-cyan-300' : 'text-slate-600'}`}
              >
                <Search className="w-4 h-4 mr-2" /> analyze target
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => triggerToolkit("generate_wordlist")}
                disabled={step !== 1 || isHacking}
                className={`w-full justify-start text-xs border-slate-700 bg-slate-900 ${step === 1 ? 'text-cyan-400 border-cyan-500/50 hover:bg-cyan-900/30 hover:text-cyan-300' : 'text-slate-600'}`}
              >
                <FileText className="w-4 h-4 mr-2" /> generate_wordlist
              </Button>

              <Button 
                variant="outline" 
                onClick={() => triggerToolkit("crack_vault target_dict.txt")}
                disabled={step !== 2 || isHacking}
                className={`w-full justify-start text-xs border-slate-700 bg-slate-900 ${step === 2 ? 'text-cyan-400 border-cyan-500/50 hover:bg-cyan-900/30 hover:text-cyan-300' : 'text-slate-600'}`}
              >
                <Zap className="w-4 h-4 mr-2" /> crack_vault dict.txt
              </Button>
            </div>
         </div>
      </div>
    </Card>
  );
}