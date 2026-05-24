"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/user-context";
import { CypherGuide } from "@/components/CypherGuide";
import { ModuleBriefing } from "@/components/ModuleBriefing";
import { GameModeModule } from "@/components/GameModeModule";
import { SideScrollerLevel } from "@/components/SideScrollerLevel";
import {
  Lock,
  Shield,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BookOpen,
  Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import zxcvbn from "zxcvbn";
import { getCypherDialogue, getFirstTimeGuidance, getSuccessGuidance } from "@/lib/cypher-dialogues";

export default function CrackTheVault() {
  const router = useRouter();
  const { user, profile, updateScore, completeTour, isLoading } = useUser();
  const [showTour, setShowTour] = useState(false);
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const theoryAudioRef = useRef<HTMLAudioElement | null>(null);

  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState("Very Weak");
  const [crackTime, setCrackTime] = useState("Instantly");
  const [feedback, setFeedback] = useState<string[]>([]);
  const [dictionaryWords, setDictionaryWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [unlocked, setUnlocked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Cypher guidance system
  const [cypherMessage, setCypherMessage] = useState<{ text: string; type: "info" | "warning" | "success" | "tip"; audioFile?: string; isBlocking?: boolean } | null>(null);
  const [showCypher, setShowCypher] = useState(true);
  const [gameState, setGameState] = useState<"briefing" | "scrolling" | "vault" | "complete">("briefing");
  const [isBlocked, setIsBlocked] = useState(false);
  
  // Dialogue Sequencing
  const [dialogueQueue, setDialogueQueue] = useState<any[]>([]);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);

  // Auth guard — redirect only after the session finishes loading
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [isLoading, user, router]);

  // Avoid rendering a partially-initialized screen before auth/profile is ready.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4 font-mono">
          <div className="w-16 h-16 border-t-2 border-b-2 border-cyan-500 rounded-full animate-spin mx-auto" />
          <div className="text-cyan-500 tracking-[0.3em] uppercase text-xs animate-pulse">
            Establishing Secure Link...
          </div>
        </div>
      </div>
    );
  }

  // Show first-time tour if user hasn't completed it
  useEffect(() => {
    if (profile && !profile.tour_completed) {
      setShowTour(true);
    }
  }, [profile]);

  const [hasBriefedPractice, setHasBriefedPractice] = useState(false);

  // Handle briefing when switching tabs or on mount
  const handleBriefing = useCallback((tab: string) => {
    if (tab === "practice" && !hasBriefedPractice) {
      setCypherMessage({
        text: "Field training initialized.",
        type: "info",
        audioFile: "/audio/m1_field_training.mp3",
      });
      setHasBriefedPractice(true);
    } else if (tab === "theory") {
      setCypherMessage({
        text: "Foundational data incoming. Study these parameters to master password entropy and the mechanics of encryption.",
        type: "info",
        audioFile: undefined,
      });
    }
  }, [hasBriefedPractice]);

  // Trigger briefing on mount or after tour
  useEffect(() => {
    if (profile?.tour_completed && !showTour) {
      // Small delay to let the page settle
      const timer = setTimeout(() => handleBriefing("practice"), 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, showTour]);

  const handleTourComplete = async () => {
    setShowTour(false);
    await completeTour();
    // Briefing will trigger via the useEffect above
  };

  const handleTheoryComplete = () => {
    if (theoryCompleted) return;
    setTheoryCompleted(true);
    updateScore(100); // 100 XP for reading the theory
    
    setCypherMessage({
      text: "Excellent work, Agent! You've absorbed the foundational knowledge. Theory mastered — now let's put it into practice in the field!",
      type: "success",
      audioFile: undefined, // No specific audio file for this generic success
    });
  };

  const handleReachVault = () => {
    setGameState("vault");
    setCypherMessage({
      text: "You are now the System Admin. Secure this vault by constructing an unbreakable payload.",
      type: "info",
      audioFile: "/audio/m1_debrief_4.mp3",
      isBlocking: true
    });
  };

  // Dialogue Bridge: Maps internal game IDs to Cypher UI updates
  const handleDialogue = useCallback((id: string) => {
    if (gameState === "complete") return;

    const sequences: Record<string, any[]> = {
      "entropy-intro": [
        {
          text: "Agent, look ahead. This is the Entropy Shield—the first layer of the vault's defense.",
          type: "info",
          audioFile: "/audio/m1_entropy_1.mp3"
        },
        {
          text: "Entropy measures randomness. The more character types and length you add, the more unpredictable the password becomes for attackers.",
          type: "info",
          audioFile: "/audio/m1_entropy_2.mp3"
        },
        {
          text: "When you enter the shield, tune the complexity until the 'Crack Time' reaches at least a century to pass.",
          type: "tip",
          audioFile: "/audio/m1_entropy_3.mp3"
        }
      ],
      "entropy": [
        {
          text: "Shield Interface Active. Observe how adding symbols and numbers makes the crack time explode exponentially.",
          type: "info",
          audioFile: "/audio/m1_entropy_active.mp3"
        }
      ],
      "warnings": [
        {
          text: "Warning: We've entered a zone of legacy passwords. Many users still use predictable patterns like names or birthdays.",
          type: "warning",
          audioFile: "/audio/m1_warn_legacy.mp3"
        },
        {
          text: "Attackers use OSINT (Open Source Intelligence) to scrape your public profiles and build custom wordlists based on your life.",
          type: "info",
          audioFile: "/audio/m1_warn_osint.mp3"
        }
      ],
      "se_intro": [
        {
          text: "Social Engineering Logic Trap. On the left, you'll see a target's private data profile.",
          type: "info",
          audioFile: "/audio/m1_se_1.mp3"
        },
        {
          text: "Identify the keywords from their profile (pets, years, teams) to construct the guess that bypasses this wall.",
          type: "tip",
          audioFile: "/audio/m1_se_2.mp3"
        }
      ],
      "social": [
        {
          text: "Social Engineering Logic Trap. On the left, you'll see a target's private data profile.",
          type: "info",
          audioFile: "/audio/m1_se_1.mp3"
        },
        {
          text: "Identify the keywords from their profile (pets, years, teams) to construct the guess that bypasses this wall.",
          type: "tip",
          audioFile: "/audio/m1_se_2.mp3"
        }
      ],
      "shield": [
        {
          text: "This is a 2FA (Two_Factor Authentication) node. Even the strongest password can be stolen.",
          type: "info",
          audioFile: "/audio/m1_2fa_1.mp3"
        },
        {
          text: "Multi_factor authentication adds a second physical or digital key, meaning a password alone isn't enough for a breach.",
          type: "success",
          audioFile: "/audio/m1_2fa_2.mp3"
        }
      ],
      "hashing": [
        {
          text: "The Hashing Factory. We don't store passwords in plain text; we store their mathematical signatures (hashes).",
          type: "info",
          audioFile: "/audio/m1_hash_1.mp3"
        },
        {
          text: "Your goal here is to 'Salt' the passwords. Salting adds unique data to every hash, preventing attackers from using pre_computed tables to crack them.",
          type: "tip",
          audioFile: "/audio/m1_hash_2.mp3"
        }
      ],
      "entropy_success": [{
        text: "The field is stabilized. Moving to the next sector.",
        type: "success",
        audioFile: "/audio/m1_success_generic_1.mp3"
      }],
      "se_success": [{
        text: "Profile flaws exploited. The path is clear.",
        type: "success",
        audioFile: "/audio/m1_success_generic_2.mp3"
      }],
      "hash_success": [{
        text: "Salting successful. The database is now secure.",
        type: "success",
        audioFile: "/audio/m1_success_generic_3.mp3"
      }],
      "vault_intro": [{
        text: "The Mainframe entrance is within reach. Use your OSINT skills to finalize the breach.",
        type: "info",
        audioFile: "/audio/m1_vault_intro.mp3"
      }],
      "vault-breached": [
        {
          text: "What you just executed is a targeted Dictionary Attack. By running OSINT, you scraped the target's personal data to generate a custom wordlist.",
          type: "info",
          audioFile: "/audio/m1_debrief_1.mp3"
        },
        {
          text: "The brute-force script instantly found the match because the password was built from predictable personal details.",
          type: "info",
          audioFile: "/audio/m1_debrief_2.mp3"
        },
        {
          text: "Lesson: Never use personal details like pet names, birth years, or favorite teams in your master passwords.",
          type: "warning",
          audioFile: "/audio/m1_debrief_3.mp3"
        }
      ]
    };

    const seq = sequences[id];
    if (seq) {
      setDialogueQueue(seq);
      setCurrentDialogueIndex(0);
      setIsBlocked(true); // Pause player movement
      
      const first = seq[0];
      setCypherMessage({
        text: first.text,
        audioFile: first.audioFile,
        type: first.type,
        isBlocking: true
      });
    }
  }, [gameState]);

  const handleNextDialogue = useCallback(() => {
    const nextIndex = currentDialogueIndex + 1;
    if (nextIndex < dialogueQueue.length) {
      setCurrentDialogueIndex(nextIndex);
      const next = dialogueQueue[nextIndex];
      setCypherMessage({
        text: next.text,
        audioFile: next.audioFile,
        type: next.type,
        isBlocking: true
      });
    } else {
      // End of sequence
      setCypherMessage(null);
      setDialogueQueue([]);
      setCurrentDialogueIndex(0);
      setIsBlocked(false); // Resume game
    }
  }, [currentDialogueIndex, dialogueQueue]);

  const handleCheckpoint = (id: string) => {
    // Checkpoint logic meta-tracking could go here
  };

  const handleSkipGuide = () => {
    setIsBlocked(false);
    setCypherMessage(null);
  };

  // Password strength evaluation logic using zxcvbn
  const evaluatePasswordStrength = (pwd: string) => {
    if (!pwd) {
      return {
        score: 0,
        label: "Very Weak",
        time: "Instantly",
        feedback: ["Enter a password to check its strength"],
        dictionaryWords: []
      };
    }

    const result = zxcvbn(pwd);

    // Map zxcvbn score (0-4) to percentage (0-100)
    const scorePercentage = (result.score / 4) * 100;

    // Determine strength label
    let label = "Very Weak";
    if (result.score === 4) label = "Very Strong";
    else if (result.score === 3) label = "Strong";
    else if (result.score === 2) label = "Medium";
    else if (result.score === 1) label = "Weak";

    // Get crack time
    const time = result.crack_times_display.offline_slow_hashing_1e4_per_second;

    // Get feedback
    const feedback = [...result.feedback.suggestions];
    if (result.feedback.warning) {
      feedback.unshift(result.feedback.warning);
    }

    // Extract dictionary words if any
    const dictionaryWords: string[] = [];
    if (result.sequence) {
      result.sequence.forEach((item: any) => {
        if (item.dictionary_name && item.matched_word) {
          dictionaryWords.push(item.matched_word);
        }
      });
    }

    // Add specific feedback about dictionary words
    if (dictionaryWords.length > 0) {
      feedback.unshift(`Contains common dictionary words: ${dictionaryWords.join(', ')}`);
      feedback.unshift('Dictionary words make passwords easier to crack');
    }

    return {
      score: scorePercentage,
      label,
      time,
      feedback,
      dictionaryWords
    };
  };

  // Evaluate password when it changes
  useEffect(() => {
    if (password) {
      const result = evaluatePasswordStrength(password);
      setStrength(result.score);
      setStrengthLabel(result.label);
      setCrackTime(result.time);
      setFeedback(result.feedback);
      setDictionaryWords(result.dictionaryWords);
    } else {
      setStrength(0);
      setStrengthLabel("Very Weak");
      setCrackTime("Instantly");
      setFeedback([]);
      setDictionaryWords([]);
      setCypherMessage(null);
    }
  }, [password]);

  // Only trigger voice/cypher dialogue on explicit check
  const handleCheckPassword = () => {
    if (!password) return;

    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^A-Za-z0-9]/.test(password);

    const cypherDialogue = getCypherDialogue({
      password,
      strength,
      dictionaryWords,
      feedback,
      hasLowercase,
      hasUppercase,
      hasNumbers,
      hasSymbols,
      length: password.length
    });

    setCypherMessage(cypherDialogue as any);
  };

  // Handle password submission
  const handleSubmit = () => {
    const earnedXp = Math.floor(strength * 1.5);

    if (strength >= 80) {
      setUnlocked(true);

      // Bonus for perfect score
      if (strength === 100) {
        setXp(earnedXp + 50); // Bonus 50 XP for perfect password
        setScore(score + earnedXp + 50);
      } else {
        setXp(earnedXp);
        setScore(score + earnedXp);
      }

      // Level up logic
      const newLevel = Math.floor((score + earnedXp) / 500) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
      }

      // Transition to complete state after success
      setTimeout(() => {
        setGameState("complete");
      }, 5000); // 5 second buffer to see the "Vault Secured" message

      // Update user's score in the database
      if (user) {
        updateScore(earnedXp);
      }

      // Show success message from Cypher
      const successMessage = getSuccessGuidance(earnedXp, attempts + 1);
      setCypherMessage(successMessage as any);
    } else {
      // Partial XP for attempts
      const partialXp = Math.floor(earnedXp * 0.5);
      setScore(score + partialXp);
    }
    setAttempts(attempts + 1);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Reset the game
  const resetGame = () => {
    setPassword("");
    setUnlocked(false);
    setAttempts(0);
  };

  // Get strength color
  const getStrengthColor = () => {
    if (strength >= 80) return "text-green-500";
    if (strength >= 60) return "text-blue-500";
    if (strength >= 40) return "text-yellow-500";
    if (strength >= 20) return "text-orange-500";
    return "text-red-500";
  };

  // Get strength bar color
  const getStrengthBarColor = () => {
    if (strength >= 80) return "[&>div]:bg-green-500";
    if (strength >= 60) return "[&>div]:bg-blue-500";
    if (strength >= 40) return "[&>div]:bg-yellow-500";
    if (strength >= 20) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-red-500";
  };

  // Get crack time color
  const getCrackTimeColor = () => {
    if (strength >= 80) return "text-green-500";
    if (strength >= 60) return "text-blue-500";
    if (strength >= 40) return "text-yellow-500";
    if (strength >= 20) return "text-orange-500";
    return "text-red-500";
  };

  // Get strength description
  const getStrengthDescription = () => {
    if (strength >= 80) return "Excellent! This password would take centuries to crack.";
    if (strength >= 60) return "Strong password. Would take years to crack with brute force.";
    if (strength >= 40) return "Medium strength. Could be cracked in days with modern tools.";
    if (strength >= 20) return "Weak password. Might be cracked in hours.";
    return "Very weak. Could be cracked instantly.";
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navigation />

      {/* Cypher Guide Component */}
      <CypherGuide 
        message={cypherMessage} 
        isVisible={showCypher} 
        onSkip={handleSkipGuide} 
        onNext={handleNextDialogue}
        position="bottom-right" 
      />


      <main className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/modules")}
          >
            ← Back to Modules
          </Button>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Crack the Vault
          </h1>
          <p className="text-muted-foreground">
            Master password security protocols and earn elite access.
          </p>
        </div>

        {gameState === "briefing" && (
          <ModuleBriefing 
            title="Operation: Crack the Vault"
            moduleName="Module 1: Password Security"
            description="Intelligence suggests a legacy database is vulnerable to OSINT-driven dictionary attacks. You must intercept the target, scrape their public profile, and execute a brute-force script. Afterwards, you must calibrate the database with a high-entropy master payload."
            objectives={[
              "Bypass the Entropy Shield by tuning character pools",
              "Execute a targeted Dictionary Attack using profile clues",
              "Implement salting protocols at the Hashing Factory",
              "Construct a 100% Secure Entropy Payload"
            ]}
            onAccept={() => {
              setGameState("scrolling");
              setCypherMessage({
                text: "Move through the sector to reach the target vault.",
                type: "info",
                audioFile: "/audio/m1_into.mp3",
                isBlocking: true
              });
            }}
          />
        )}

        {gameState !== "briefing" && gameState !== "complete" && (
        <div className="flex justify-center w-full">
          {/* Game Area - Constrained to 5xl for Focused Cinematic Experience */}
          <div className="w-full max-w-5xl">
            <Card className="glass-card border-primary/20 shadow-2xl shadow-cyan-500/10">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Crack the Vault
                </CardTitle>
                <CardDescription>
                  Learn about password security and test your skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="practice" className="w-full" onValueChange={handleBriefing}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="theory">Theory</TabsTrigger>
                    <TabsTrigger value="practice">Practice</TabsTrigger>
                  </TabsList>
                  <TabsContent value="theory" className="mt-0">
                    <div className="space-y-4">
                      <div className="p-6 rounded-lg bg-muted/50 border border-border/50">
                        <h3 className="text-xl font-bold text-foreground mb-4">Password Security Theory</h3>
                        <div className="space-y-4 text-muted-foreground">
                          <p>
                            Password security is one of the most fundamental aspects of cybersecurity. A strong password
                            acts as the first line of defense against unauthorized access to your accounts, protecting
                            your personal information, financial data, and digital identity.
                          </p>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Why Passwords Matter:</h4>
                            <p>
                              Over 80% of data breaches are linked to weak, stolen, or reused passwords. Understanding
                              how passwords work and how attackers try to break them is crucial for staying safe online.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Password Entropy & Complexity:</h4>
                            <p>
                              Entropy measures randomness and unpredictability. Higher entropy = stronger password.
                              Include lowercase, uppercase, numbers, and special characters to increase complexity.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Common Attack Methods:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Brute Force: Trying all combinations systematically.</li>
                              <li>Dictionary Attacks: Using common words and passwords.</li>
                              <li>Credential Stuffing: Reusing breached credentials on other sites.</li>
                              <li>Rainbow Table Attacks: Using pre-computed hashes to crack passwords.</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Dictionary Words & Password Security:</h4>
                            <p>
                              Dictionary attacks are one of the most common methods used by hackers to crack passwords.
                              These attacks use lists of common words, phrases, and previously breached passwords to guess
                              user credentials. Passwords containing dictionary words are significantly weaker because
                              they can be cracked much faster than truly random passwords.
                            </p>
                            <div className="space-y-2">
                              <h5 className="font-semibold text-foreground">Why Dictionary Words Are Dangerous:</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Common words are easy to guess and found in wordlists used by hackers</li>
                                <li>Even with numbers or symbols added, dictionary words remain vulnerable</li>
                                <li>Modern cracking tools can test billions of word combinations per second</li>
                                <li>Personal information (names, pets, hobbies) are also dictionary words to attackers</li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-semibold text-foreground">Personal Information Targeting:</h5>
                              <p>
                                Attackers specifically target personal information when trying to crack passwords. They gather
                                names, birthdays, pet names, and other personal details from:
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Social media profiles (Facebook, LinkedIn, Instagram)</li>
                                <li>Public records and professional directories</li>
                                <li>Previous data breaches</li>
                                <li>Direct social engineering interactions</li>
                              </ul>
                              <p>
                                Using tools like <code>cewl</code>, attackers can create custom wordlists from a person's
                                website or social media content, making name-based attacks even more effective.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-semibold text-foreground">How to Avoid Dictionary Words:</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Use passphrases instead of single words (e.g., "PurpleTiger$Jumped@Moon" rather than "purple")</li>
                                <li>Create acronyms from sentences (e.g., "My1stCarW@5Red!" from "My first car was red!")</li>
                                <li>Use random combinations of words not typically used together</li>
                                <li>Include numbers and symbols in unpredictable positions</li>
                                <li><strong>Avoid all personal information</strong> (names, dates, pet names) in passwords</li>
                              </ul>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                              <p className="text-sm text-blue-200">
                                <strong>Pro Tip:</strong> The password "correcthorsebatterystaple" became famous for
                                illustrating how longer, random combinations of words can be more secure than
                                traditional complex passwords with symbols and numbers.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Best Practices:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Use 12+ characters (longer is stronger)</li>
                              <li>Include a mix of character types (uppercase, lowercase, numbers, symbols)</li>
                              <li>Use unique passwords for each account</li>
                              <li>Consider passphrases (e.g., "Coffee!Morning@Park2024")</li>
                              <li>Use a password manager</li>
                              <li>Enable multi-factor authentication (2FA)</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Password Managers & MFA:</h4>
                            <p>
                              Password managers store all passwords encrypted behind one master password, generating
                              strong, random passwords and syncing across devices. MFA adds extra security layers
                              beyond passwords, such as authentication apps or hardware keys.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">How Password Strength Checkers Work:</h4>
                            <p>
                              Modern password strength checkers like the one in this module use sophisticated algorithms
                              to evaluate password security. Our implementation uses the industry-standard zxcvbn library
                              developed by Dropbox, which analyzes passwords based on multiple factors:
                            </p>
                            <div className="space-y-2">
                              <h5 className="font-semibold text-foreground">Key Analysis Factors:</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Dictionary Word Detection:</strong> Checks against lists of common words and previously breached passwords</li>
                                <li><strong>Pattern Recognition:</strong> Identifies common patterns like keyboard sequences (qwerty) or repeated characters</li>
                                <li><strong>Entropy Calculation:</strong> Measures randomness and unpredictability of character combinations</li>
                                <li><strong>Brute Force Resistance:</strong> Estimates how long it would take to crack the password using computational methods</li>
                                <li><strong>Personal Information:</strong> Detects names, dates, and other personal information that might be easily guessed</li>
                              </ul>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                              <p className="text-sm text-purple-200">
                                <strong>Security Insight:</strong> A strong password isn't just about complexity symbols.
                                It's about unpredictability and avoiding any patterns that attackers commonly look for.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Real-World Impact:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>81% of breaches are due to poor passwords.</li>
                              <li>6-character passwords can be cracked in 1 second.</li>
                              <li>65% of people reuse passwords across accounts.</li>
                              <li>99.9% of attacks can be blocked with multi-factor authentication.</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground">Password Strength Examples:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>password123 → Instantly cracked</li>
                              <li>P@ssw0rd → Seconds</li>
                              <li>MyD0g2024! → Hours</li>
                              <li>C0ff33&Cr0!ss@nt$ → Years</li>
                              <li>Tr0p!c@l#P@r@d!s3$Sunr!s3 → Centuries</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Theory Complete CTA */}
                      <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {theoryCompleted
                            ? <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                            : <BookOpen className="w-6 h-6 text-cyan-400" />}
                          <div>
                            <p className="font-bold text-sm text-foreground">
                              {theoryCompleted ? "Theory Mastered!" : "Done reading?"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {theoryCompleted ? "+100 XP awarded" : "Mark complete to earn 100 XP"}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleTheoryComplete}
                          disabled={theoryCompleted}
                          className={`${theoryCompleted ? "bg-green-600/20 text-green-400 border border-green-500/30" : "gradient-primary"} font-bold px-6`}
                        >
                          {theoryCompleted ? "✓ Completed" : "Mark as Complete"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="practice" className="mt-0">
                    {gameState === "scrolling" ? (
                      <div className="space-y-4">
                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold text-cyan-400 mb-2">Journey to the Vault</h3>
                          <p className="text-sm text-muted-foreground">
                            Walk to the vault and press ENTER to begin your password challenge
                          </p>
                        </div>

                        <SideScrollerLevel
                          onReachVault={handleReachVault}
                          onCheckpoint={handleCheckpoint}
                          onDialogue={handleDialogue}
                          isBlocked={isBlocked}
                        />

                        {/* Instructions */}
                        <Card className="bg-slate-900/50 border-cyan-500/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between text-sm text-cyan-300">
                              <div className="flex items-center gap-4">
                                <span><kbd className="px-2 py-1 bg-slate-800 rounded">←→</kbd> or <kbd className="px-2 py-1 bg-slate-800 rounded">AD</kbd> Move</span>
                                <span>•</span>
                                <span><kbd className="px-2 py-1 bg-slate-800 rounded">ENTER</kbd> Enter Vault</span>
                              </div>
                              <div className="text-xs text-slate-400">
                                Reach 100% to unlock password challenge
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      // THE VAULT PASSWORD UI
                      <div className="space-y-6 max-w-3xl mx-auto">
                        <div className="text-center mb-6">
                          <h3 className="text-2xl font-bold text-cyan-400 mb-2">Vault Admin Root</h3>
                          <p className="text-slate-400">Construct an unbreakable payload to secure the system.</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="password-input">Password Core String</Label>
                            <Input
                              id="password-input"
                              type="text"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onKeyDown={handleKeyPress}
                              disabled={unlocked}
                              className="font-mono text-lg mt-2 bg-slate-900 border-cyan-700/50"
                              placeholder="Enter your payload here..."
                            />
                          </div>

                          {/* Live Strength Feedback */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm mt-4">
                              <span className="text-slate-400">Encryption Strength</span>
                              <span className={getStrengthColor()}>{strengthLabel} ({Math.round(strength)}%)</span>
                            </div>

                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                              <div
                                className={`h-full transition-all duration-300 ${getStrengthBarColor().replace('[&>div]:', '')}`}
                                style={{ width: `${strength}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-slate-500">Estimated Crack Time:</span>
                              <span className={`font-mono ${getCrackTimeColor()}`}>{crackTime}</span>
                            </div>
                          </div>

                          {/* Live Hints/Feedback */}
                          {feedback.length > 0 && (
                            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
                              <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Vulnerabilities Detected
                              </h4>
                              <ul className="list-disc pl-5 text-sm text-red-300 space-y-1">
                                {feedback.map((tip, i) => (
                                  <li key={i}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-4 mt-6">
                            <Button
                              variant="outline"
                              className="w-1/3 h-12 border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/30 hover:text-cyan-200"
                              onClick={handleCheckPassword}
                              disabled={unlocked || password.length === 0}
                            >
                              Check
                            </Button>

                            <Button
                              className="flex-1 gradient-primary font-bold text-lg h-12"
                              onClick={handleSubmit}
                              disabled={unlocked || password.length === 0}
                            >
                              {unlocked ? "Vault Secured!" : "Deploy Security Payload"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {gameState === "complete" && (
          <Card className="max-w-2xl mx-auto glass-card border-green-500 shadow-2xl shadow-green-500/20 animate-in zoom-in duration-500">
            <CardHeader className="text-center pb-0">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <CardTitle className="text-3xl font-bold text-green-400 uppercase tracking-widest">Mission Mastered</CardTitle>
              <CardDescription className="text-slate-400 mt-2">Module 1: Password Security - Certified Complete</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">XP Earned</div>
                  <div className="text-2xl font-bold text-yellow-400">+{Math.floor(strength * 1.5) + (strength === 100 ? 150 : 100)}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Security Score</div>
                  <div className="text-2xl font-bold text-cyan-400">{Math.round(strength)}%</div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg text-sm text-slate-300 italic">
                "Agent, you've neutralized the database vulnerability. By understanding entropy and attack vectors, you are now equipped for advanced perimeter defense."
              </div>
              <Button onClick={() => router.push("/modules")} className="w-full h-14 gradient-primary text-xl font-bold">
                Return to Modules
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
