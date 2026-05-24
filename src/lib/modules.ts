import { Lock, Radar, Search, type LucideIcon } from "lucide-react";

export const MODULE_IDS = [1, 2, 3] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export type TrainingModule = {
  id: ModuleId;
  icon: LucideIcon;
  title: string;
  description: string;
  level: string;
  duration: string;
  xp: number;
  color: string;
  bgColor: string;
};

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 1,
    icon: Lock,
    title: "Crack the Vault",
    description:
      "Master password creation by understanding entropy, common patterns, and building unbreakable passwords. Test your skills in this interactive password strength challenge.",
    level: "Beginner",
    duration: "20 min",
    xp: 400,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    id: 2,
    icon: Search,
    title: "The Phishing Catch",
    description:
      "Analyze suspicious emails and websites. Use forensic tools like URL Sniffers and SSL X-Rays to identify red flags and block malicious threats.",
    level: "Analyst",
    duration: "15 min",
    xp: 250,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    id: 3,
    icon: Radar,
    title: "Operation Iron Wall",
    description:
      "Defend Kavach Central Database in a live SOC stream. Intercept suspicious packets by analyzing source IP, port, and payload size under pressure.",
    level: "Guardian",
    duration: "18 min",
    xp: 350,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
  },
];

/** Only exact paths /modules/1, /modules/2, /modules/3 are valid. */
export function isValidModuleId(raw: string): raw is `${ModuleId}` {
  return raw === "1" || raw === "2" || raw === "3";
}

export function getModuleById(id: ModuleId): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === id);
}
