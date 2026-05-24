"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CypherGuide } from "@/components/CypherGuide";
import { useUser } from "@/context/user-context";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Shield, Activity, Zap, Timer, ServerCrash, CheckCircle2, BookOpen, Target, Trophy } from "lucide-react";

type Phase = "briefing" | "playing" | "won" | "failed";
type ThreatType = "unauthorized-port" | "buffer-overflow" | "ddos-surge";

type Packet = {
  id: number;
  src: string;
  port: number;
  sizeKb: number;
  isThreat: boolean;
  threatType?: ThreatType;
  x: number;
  y: number;
  speed: number;
  wasScanned?: boolean;
};

type FirewallRule = {
  id: string;
  type: "port" | "ip" | "size";
  value: string | number;
  action: "block";
};

const PLAYFIELD_W = 980;
const PLAYFIELD_H = 420;
const GUARDIAN_X = 200;
const GUARDIAN_W = 44;
const GUARDIAN_H = 44;
const SERVER_X = 900;
const TICK_MS = 80;
const MISSION_SECONDS = 95;

function randomIp(prefix?: string) {
  const base = prefix ?? `${10 + Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 255)}`;
  return `${base}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function makePacket(id: number, elapsed: number, botnetSource: string | null): Packet {
  const inSurge = elapsed > 30;
  const inCrisis = elapsed > 62;
  const threatChance = inCrisis ? 0.42 : inSurge ? 0.28 : 0.16;
  const isThreat = Math.random() < threatChance;

  let threatType: ThreatType | undefined;
  let port = 80;
  let sizeKb = Number((0.8 + Math.random() * 1.2).toFixed(1));
  let src = randomIp();

  if (isThreat) {
    const types: ThreatType[] = ["unauthorized-port", "buffer-overflow", "ddos-surge"];
    threatType = types[Math.floor(Math.random() * types.length)];

    if (threatType === "unauthorized-port") {
      port = Math.random() > 0.5 ? 21 : 23;
      sizeKb = Number((0.9 + Math.random() * 2.0).toFixed(1));
    } else if (threatType === "buffer-overflow") {
      port = 80;
      sizeKb = Number((32 + Math.random() * 48).toFixed(1));
    } else {
      port = 80;
      sizeKb = Number((1 + Math.random() * 2.2).toFixed(1));
      src = botnetSource ?? "112.5.19.77";
    }
  }

  return {
    id,
    src,
    port,
    sizeKb,
    isThreat,
    threatType,
    x: 10,
    y: 26 + Math.random() * (PLAYFIELD_H - 56),
    speed: 2.5 + Math.random() * 0.8 + (inSurge ? 0.6 : 0) + (inCrisis ? 0.5 : 0),
  };
}

export default function OperationIronWall() {
  const router = useRouter();
  const { user, isLoading, updateScore } = useUser();

  const [phase, setPhase] = useState<Phase>("briefing");
  const [packets, setPackets] = useState<Packet[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [integrity, setIntegrity] = useState(100);
  const [cpuLoad, setCpuLoad] = useState(22);
  const [uptime, setUptime] = useState(100);
  const [neutralized, setNeutralized] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [earnedXP, setEarnedXP] = useState<number | null>(null);

  // Rule System
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [selectedRuleType, setSelectedRuleType] = useState<"port" | "ip" | "size">("port");
  const [ruleInputValue, setRuleInputValue] = useState("");

  // Heuristic Data
  // Telemetry is now derived from 'packets' using useMemo to prevent "stuck" states
  const portStats = useMemo(() => {
    const stats: Record<number, number> = {};
    packets.forEach(p => {
      stats[p.port] = (stats[p.port] || 0) + 1;
    });
    return stats;
  }, [packets]);

  const ipStats = useMemo(() => {
    const stats: Record<string, number> = {};
    packets.forEach(p => {
      stats[p.src] = (stats[p.src] || 0) + 1;
    });
    return stats;
  }, [packets]);

  const sizeStats = useMemo(() => {
    const stats = { normal: 0, large: 0 };
    packets.forEach(p => {
      if (p.sizeKb >= 30) stats.large++;
      else stats.normal++;
    });
    return stats;
  }, [packets]);

  const [guideMessage, setGuideMessage] = useState<{ text: string; type: "info" | "warning" | "success" | "tip" } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const idRef = useRef(1);
  const botnetRef = useRef<string | null>("112.5.19.77");
  const lastSpawnAtRef = useRef(0);

  const missionLeft = Math.max(0, MISSION_SECONDS - elapsed);
  const missionProgress = (elapsed / MISSION_SECONDS) * 100;
  const shouldWin = elapsed >= MISSION_SECONDS && integrity >= 90;
  const inSurge = elapsed > 30;
  const inCrisis = elapsed > 62;

  useEffect(() => {
    if (!isLoading && !user) router.push("/auth");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (phase !== "briefing") return;
    setGuideMessage({
      type: "info",
      text: "The network scanner is active. Watch the dashboard on the right. If you see a suspicious port, a very large file or repeated IP, add a block rule.",
      audioFile: "/audio/m3_briefing.mp3"
    });
  }, [phase]);

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const quickFill = (type: "port" | "ip" | "size", value: string | number) => {
    setSelectedRuleType(type);
    setRuleInputValue(value.toString());
  };

  const addRule = () => {
    if (!ruleInputValue) return;
    const newRule: FirewallRule = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedRuleType,
      value: selectedRuleType === "ip" ? ruleInputValue : parseInt(ruleInputValue),
      action: "block"
    };
    setRules(prev => [...prev, newRule]);
    setRuleInputValue("");
    setGuideMessage({
      type: "success",
      text: `Barrier active: blocking ${selectedRuleType.toUpperCase()} ${ruleInputValue}.`,
      audioFile: "/audio/m3_barrier_locked.mp3"
    });
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setElapsed((e) => e + 1);
      setCpuLoad((c) => Math.max(8, c - 0.8));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;

    const loop = window.setInterval(() => {
      if (Math.random() < (inCrisis ? 0.38 : inSurge ? 0.28 : 0.18)) {
        const now = Date.now();
        const minSpawnGapMs = inCrisis ? 350 : inSurge ? 500 : 700;
        if (now - lastSpawnAtRef.current > minSpawnGapMs) {
          let packet = makePacket(idRef.current++, elapsed, botnetRef.current);
          lastSpawnAtRef.current = now;
          setPackets((prev) => [...prev.slice(-120), packet]);
        }
      }

      // 1. STATS ARE PERSISTENT (No auto-resetting this turn)


      // 2. DETECT CROSSINGS (SCANNED PACKETS)
      setPackets((currentPackets) => {
        const scannerX = 25;

        const nextPackets = currentPackets.map((p) => {
          const nextX = p.x + p.speed;
          if (p.x < scannerX && nextX >= scannerX && !p.wasScanned) {
            return { ...p, x: nextX, wasScanned: true };
          }
          return { ...p, x: nextX };
        });

        // 3. FILTER RULES
        const filtered = nextPackets.filter((p) => {
          const isBlocked = rules.some(rule => {
            if (rule.type === "port") return Number(p.port) === Number(rule.value);
            if (rule.type === "ip") return p.src === rule.value;
            if (rule.type === "size") return p.sizeKb >= Number(rule.value);
            return false;
          });

          if (isBlocked && p.isThreat) setNeutralized(n => n + 1);
          return !isBlocked;
        });

        // 4. SERVER IMPACT
        const hitsServer = filtered.filter((p) => p.x >= SERVER_X);
        const threatHits = hitsServer.filter((p) => p.isThreat).length;
        if (threatHits > 0) {
          setIntegrity((curr) => Math.max(0, curr - threatHits * 2.5));
          setCpuLoad((c) => Math.min(100, c + threatHits * 5));
          setFlash(true);
          setShake(true);
          window.setTimeout(() => {
            setFlash(false);
            setShake(false);
          }, 150);
        }

        return filtered.filter((p) => p.x < PLAYFIELD_W + 40);
      });
    }, TICK_MS);

    return () => window.clearInterval(loop);
  }, [phase, elapsed, inCrisis, inSurge, rules]);

  useEffect(() => {
    setUptime(Math.max(0, Number(integrity.toFixed(1))));
    if (phase !== "playing") return;

    if (cpuLoad > 90) {
      setIntegrity((curr) => Math.max(0, curr - 0.35));
    }

    if (integrity < 90) {
      setPhase("failed");
      setGuideMessage({
        type: "warning",
        text: "Uptime dropped too low. Replay the mission and block threats earlier (especially repeated IP bursts and odd ports).",
        audioFile: "/audio/m3_fail.mp3"
      });
    } else if (shouldWin) {
      setPhase("won");
      setGuideMessage({
        type: "success",
        text: "Mission success. You kept the service online and stopped the threats. Uploading your report.",
        audioFile: "/audio/m3_success.mp3"
      });
      if (user) {
        const earned = Math.max(150, Math.floor(uptime * 2 + neutralized * 6));
        setEarnedXP(earned);
        updateScore(earned, {
          moduleId: 3,
          moduleName: "Operation Iron Wall",
          accuracy: Math.round(uptime)
        }).catch(err => {
          console.error("Failed to update score:", err);
        });
      }
    }
  }, [integrity, cpuLoad, shouldWin, phase, uptime, neutralized, user, updateScore]);

  // Final mission calculations and UI mapping


  const startMission = () => {
    setPhase("playing");
    setPackets([]);
    setElapsed(0);
    setIntegrity(100);
    setCpuLoad(22);
    setUptime(100);
    setNeutralized(0);
    setRules([]);
    setGuideMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navigation />
      <CypherGuide
        message={guideMessage}
        isVisible={true}
        position="bottom-right"
        displayDuration={
          phase === "briefing" ? 13000 :
            guideMessage?.text.startsWith("Barrier active") ? 3500 :
              6000
        }
      />

      {isLoading && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-cyan-400 font-mono tracking-[0.2em] animate-pulse">SYNCING OPERATOR SESSION...</div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 mt-16">
        <Button variant="ghost" className="mb-4" onClick={() => router.push("/modules")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Modules
        </Button>

        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-gradient">Operation Iron Wall</h1>
            <p className="text-muted-foreground">SOC Defense Simulation • Network Guardian Mode</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-500/10">
              Uptime {uptime.toFixed(1)}%
            </Badge>
            <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-500/10">
              CPU Load {Math.round(cpuLoad)}%
            </Badge>
            <Badge variant="outline" className="border-purple-500/40 text-purple-300 bg-purple-500/10">
              Threats Neutralized: {neutralized}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
              T-{missionLeft}s
            </Badge>
          </div>
        </div>

        <Card className="glass-card border-cyan-500/20 mb-4">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">System Integrity</div>
                <Progress value={integrity} className={`h-2 ${integrity < 92 ? "[&>div]:bg-rose-500" : "[&>div]:bg-cyan-500"}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">CPU Load</div>
                <Progress value={cpuLoad} className={`h-2 ${cpuLoad > 85 ? "[&>div]:bg-rose-500" : "[&>div]:bg-indigo-500"}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Mission Timeline</div>
                <Progress value={missionProgress} className="h-2 [&>div]:bg-purple-500" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Expected safe traffic: Port 80, ~1.5kb payload</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Surge: {inSurge ? "ACTIVE" : "Standby"}</span>
              <span className="flex items-center gap-1"><ServerCrash className="w-3 h-3" /> Botnet Crisis: {inCrisis ? "ACTIVE" : "Standby"}</span>
            </div>
          </CardContent>
        </Card>

        {phase === "briefing" && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <Card className="glass-card border-cyan-500/50 bg-gradient-to-br from-slate-900 to-blue-950">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 border border-cyan-500/50">
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
                <CardTitle className="text-3xl font-bold text-gradient">Mission Context: Iron Wall</CardTitle>
                <CardDescription>Network Layer Security & Availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 space-y-4">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    The Assignment
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm">
                    The Kavach Central Database is under a <strong>Heuristic Probe</strong>. Attackers are testing our perimeter for open doors. Your objective is not just to "block the red," but to analyze the <strong>metadata</strong> of every packet.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                    <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Threat Indicators
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li>• <span className="text-slate-200">Ports:</span> Web servers only expect Port <strong>80</strong> (HTTP). Blocks 21/23.</li>
                      <li>• <span className="text-slate-200">Size:</span> Payloads over <strong>2kb</strong> are likely buffer overflows.</li>
                      <li>• <span className="text-slate-200">Surge:</span> Repeated IPs indicate a coordinated Botnet attack.</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                    <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Mission Success
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li>• Maintain <strong>90%+ System Integrity</strong>.</li>
                      <li>• Neutralize the Botnet Surge in Phase 3.</li>
                      <li>• Use the <strong>Execute Box</strong> to automate your defense.</li>
                    </ul>
                  </div>
                </div>

                <Button className="w-full gradient-primary h-14 text-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]" onClick={startMission}>
                  INITIALIZE SYSTEM
                </Button>
              </CardContent>
            </Card>
          </div>
        )}


        {phase === "playing" && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Column: The Traffic Stream */}
            <div className="lg:col-span-8 space-y-4">
              <div className={`relative overflow-hidden rounded-xl border-2 ${flash ? "border-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.2)]" : "border-cyan-500/30"} bg-slate-950 transition-all duration-150 ${shake ? "translate-x-1" : "translate-x-0"}`} style={{ height: PLAYFIELD_H }}>
                <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(34,211,238,0.2) 9px)" }} />

                {/* Entry Scanner Line (Perimeter Defense) */}
                <div className="absolute top-0 bottom-0 w-[4px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]" style={{ left: 25 }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 font-mono">PERIMETER_SCAN</div>
                </div>

                {/* Server Target (The Core) */}
                <div className="absolute top-0 bottom-0 w-[80px] border-l border-cyan-500/40 bg-cyan-500/5 backdrop-blur-[2px]" style={{ left: SERVER_X }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[10px] tracking-[0.5em] text-cyan-300/50 font-black">CENTRAL_DATABASE</div>
                </div>

                {/* Packets */}
                {packets.map((p) => {
                  const isLarge = p.sizeKb >= 30; // Matches threat generation
                  const isSuspiciousPort = p.port === 21 || p.port === 23;
                  const ipOccurrences = ipStats[p.src] || 0;
                  const isVolumetricThreat = ipOccurrences > 1;

                  // A packet only visually looks like a threat if it meets the heuristic criteria
                  const showsAsThreat = isLarge || isSuspiciousPort || isVolumetricThreat;

                  return (
                    <div
                      key={p.id}
                      className={`absolute flex items-center justify-center transition-all ${isLarge ? "w-8 h-8 rounded-lg" :
                        isSuspiciousPort || isVolumetricThreat ? "w-5 h-5 rotate-45" :
                          "w-3 h-3 rotate-45"
                        } border ${showsAsThreat ? "border-rose-500/50 bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]" :
                          "border-cyan-400/50 bg-cyan-400/10"
                        }`}
                      style={{ left: p.x, top: p.y }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                        <span className={`text-[8px] font-mono font-bold px-1 rounded ${isLarge ? "bg-rose-500 text-white" :
                          isSuspiciousPort ? "bg-amber-500 text-slate-950" :
                            isVolumetricThreat ? "bg-rose-600 text-white" :
                              "text-cyan-400/40 opacity-0 group-hover:opacity-100"
                          }`}>
                          {isLarge ? `${Math.round(p.sizeKb)}kb` : isSuspiciousPort ? `P:${p.port}` : isVolumetricThreat ? "DDoS" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: The Heuristic Dashboard */}
            <div className="lg:col-span-4 space-y-4">
              {/* Execute Box */}
              <Card className="glass-card border-orange-500/30 bg-orange-500/5">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs uppercase tracking-widest text-orange-400 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Execute Box
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg border border-slate-800">
                    {(["port", "ip", "size"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedRuleType(t)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-all ${selectedRuleType === t ? "bg-orange-500 text-slate-950" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-stretch h-12">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 flex items-center shadow-inner">
                      <span className="text-[10px] text-slate-500 font-mono mr-3 uppercase tracking-tighter">Target:</span>
                      <input
                        type="text"
                        readOnly
                        placeholder="Select anomaly..."
                        className="bg-transparent text-sm font-mono text-orange-400 focus:outline-none cursor-default w-full"
                        value={ruleInputValue}
                      />
                    </div>
                    <Button
                      className="px-8 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black h-full rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                      onClick={addRule}
                    >
                      BLOCK
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rule visual feedback is now handled by telemetry alerts */}


              {/* Telemetry Panels */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
                  <p className="text-[10px] text-cyan-500 uppercase font-bold mb-3 flex justify-between">
                    Port Analytics <Badge variant="outline" className="text-[8px] h-3 border-cyan-500/30 text-cyan-500">Auto-Select</Badge>
                  </p>
                  <div className="space-y-2">
                    {Object.entries(portStats).filter(([port]) => port !== "80" && port !== "443").slice(0, 3).sort((a, b) => b[1] - a[1]).map(([port, count]) => (
                      <div key={port} className="space-y-1 group" onClick={() => quickFill("port", port)}>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400 group-hover:text-cyan-400">P:{port}</span>
                          <span className="text-rose-400 underline underline-offset-2 font-bold">{count}</span>
                        </div>
                        <Progress value={Math.min(100, count * 20)} className="h-0.5 [&>div]:bg-rose-500 animate-pulse" />
                      </div>
                    ))}
                    {Object.entries(portStats).filter(([port]) => port === "80" || port === "443").map(([port, count]) => (
                      <div key={port} className="space-y-1 opacity-50">
                        <div className="flex justify-between text-[10px] font-mono italic">
                          <span className="text-slate-500">P:{port} (Safe)</span>
                          <span className="text-emerald-500">{count}</span>
                        </div>
                        <Progress value={Math.min(100, count * 5)} className="h-0.5 [&>div]:bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-[10px] text-amber-500 uppercase font-bold mb-3 flex justify-between">
                    IP Surge Detection <Badge variant="outline" className="text-[8px] h-3 border-amber-500/30 text-amber-500">Volumetric</Badge>
                  </p>
                  <div className="space-y-2">
                    {Object.entries(ipStats)
                      .filter(([_, count]) => count > 1) // Noise Filter: Ignore unique IPs
                      .sort((a, b) => b[1] - a[1]) // Sort: Highest talkers first
                      .slice(0, 3)
                      .map(([ip, count]) => {
                        const isThreat = count >= 5;
                        return (
                          <div
                            key={ip}
                            className={`space-y-1 cursor-pointer group p-1 rounded transition-all ${isThreat ? "bg-rose-500/10 animate-pulse border border-rose-500/20" : "hover:bg-slate-800"}`}
                            onClick={() => quickFill("ip", ip)}
                          >
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className={`truncate w-16 transition-colors ${isThreat ? "text-rose-400 font-bold" : "text-slate-400 group-hover:text-amber-400"}`}>
                                {isThreat && "⚠️ "}{ip}
                              </span>
                              <span className={isThreat ? "text-rose-400 font-black animate-bounce" : "text-slate-500"}>
                                {count} pkts
                              </span>
                            </div>
                            <Progress
                              value={Math.min(100, count * 12)}
                              className={`h-0.5 ${isThreat ? "[&>div]:bg-rose-500" : "[&>div]:bg-slate-700 group-hover:[&>div]:bg-amber-500 transition-all"}`}
                            />
                          </div>
                        );
                      })}
                    {Object.entries(ipStats).filter(([_, count]) => count > 1).length === 0 && (
                      <div className="text-[9px] text-slate-600 italic py-4 text-center">No statistical anomalies detected</div>
                    )}
                  </div>
                </div>
                <div className="p-3 col-span-2 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer group" onClick={() => quickFill("size", 25)}>
                  <p className="text-[10px] text-emerald-500 uppercase font-bold mb-2 flex justify-between">
                    Payload (Size Distribution) <Badge variant="outline" className="text-[8px] h-3 border-emerald-500/30 text-emerald-500">Buffer Probe</Badge>
                  </p>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className={sizeStats.large > 0 ? "text-rose-400 font-bold" : "text-slate-500"}>
                          {sizeStats.large > 0 && "🔥 "}THREAT_LARGE (>30kb)
                        </span>
                        <span className={sizeStats.large > 0 ? "text-rose-500 font-black animate-pulse" : "text-slate-600"}>{sizeStats.large}</span>
                      </div>
                      <Progress value={Math.min(100, (sizeStats.large / 3) * 100)} className={`h-1.5 ${sizeStats.large > 0 ? "[&>div]:bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "[&>div]:bg-slate-800"}`} />
                    </div>
                    <div className="flex-1 opacity-50 text-xs">
                      <div className="flex justify-between text-[8px] mb-0.5 font-mono">
                        <span>NORMAL_BAND</span>
                        <span>{sizeStats.normal}</span>
                      </div>
                      <Progress value={Math.min(100, (sizeStats.normal / 20) * 100)} className="h-0.5 [&>div]:bg-emerald-500/50" />
                    </div>
                  </div>
                  <p className="text-[8px] text-slate-600 mt-2 italic font-mono uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors">Monitor for oversized buffer probes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(phase === "won" || phase === "failed") && (
          <Card className="glass-card border-primary/20 mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {phase === "won" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Operation Successful
                  </>
                ) : (
                  <>
                    <ServerCrash className="w-5 h-5 text-rose-400" />
                    Mission Failed
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Final Uptime: {uptime.toFixed(1)}% • Threats Neutralized: {neutralized}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-6">
                <Button className="gradient-primary" onClick={startMission}>
                  Replay Mission
                </Button>
                <Button variant="outline" onClick={() => router.push("/modules")}>
                  Back to Modules
                </Button>
              </div>

              {earnedXP && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs text-cyan-500 font-mono uppercase tracking-widest">Rewards Dispersed</p>
                        <p className="text-lg font-bold text-slate-100">+{earnedXP} XP Earned</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">MISSION_COMPLETE_SYNCED</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}