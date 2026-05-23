# Kavach Academy: Cypher Voiceover Script

This document contains the complete list of dialogues for the **Cypher** guide within Kavach Academy. All filenames listed here match the actual paths defined in the system.

---

## 📂 Global: Welcome Tour
**Context:** Played once when a new user first enters the home base/landing page.

| Step | Cypher's Dialogue (The Script) | Filename |
| :--- | :--- | :--- |
| **Welcome** | Welcome to Kavach Academy! I'm Cypher, your cybersecurity mentor. Let me show you around this interactive learning platform where you'll master digital defense through hands-on missions. | `tour_step_0.mp3` |
| **Training Ground** | This is where the action happens. Click 'Explore Modules' to find our training games, from vault-cracking to catching phishing scams. | `tour_step_1.mp3` |
| **Rank & Progress** | You earn Experience Points (XP) for every successful mission. Leveling up shows the Academy you're ready for more advanced operations. | `tour_step_2.mp3` |
| **Standings** | Keep an eye on the Global Standings. Seeing how other agents are performing is a great way to stay sharp! | `tour_step_3.mp3` |
| **Ready for Action** | You're all set! Head over to the Modules and begin your first training session | `tour_step_4.mp3` |

---

## 📂 Module 1: The Vault & Security Tutorials
**Context:** Immersive guided tutorial for Entropy, OSINT, and Hashing factory.

| **Sequence / Trigger** | **Cypher's Dialogue (The Script)** | **Filename** |
| :--- | :--- | :--- |
| **Field Training** | Field training initialized. | `m1_field_training.mp3` |
| **Mission Intro** | Move through the sector to reach the target vault. | `m1_into.mp3` |
| **Entropy Intro 1** | Agent, look ahead. This is the Entropy Shield—the first layer of the vault's defense. | `m1_entropy_1.mp3` |
| **Entropy Intro 2** | Entropy measures randomness. The more character types and length you add, the more unpredictable the password becomes for attackers. | `m1_entropy_2.mp3` |
| **Entropy Intro 3** | When you enter the shield, tune the complexity until the 'Crack Time' reaches at least a century to pass. | `m1_entropy_3.mp3` |
| **Entropy Active** | Shield Interface Active. Observe how adding symbols and numbers makes the crack time explode exponentially. | `m1_entropy_active.mp3` |
| **OSINT Warning 1** | Warning: We've entered a zone of legacy passwords. Many users still use predictable patterns like names or birthdays. | `m1_warn_legacy.mp3` |
| **OSINT Warning 2** | Attackers use OSINT (Open Source Intelligence) to scrape your public profiles and build custom wordlists based on your life. | `m1_warn_osint.mp3` |
| **Social Eng. Intro 1** | Social Engineering Logic Trap. On the left, you'll see a target's private data profile. | `m1_se_1.mp3` |
| **Social Eng. Intro 1** | Identify the keywords from their profile (pets, years, teams) to construct the guess that bypasses this wall. | `m1_se_2.mp3` |
| **2FA Tutorial 1** | This is a 2FA (Two-Factor Authentication) node. Even the strongest password can be stolen. | `m1_2fa_1.mp3` |
| **2FA Tutorial 2** | Multi-factor authentication adds a second physical or digital key, meaning a password alone isn't enough for a breach. | `m1_2fa_2.mp3` |
| **Hashing Intro 1** | The Hashing Factory. We don't store passwords in plain text; we store their mathematical signatures (hashes). | `m1_hash_1.mp3` |
| **Hashing Intro 2** | Your goal here is to 'Salt' the passwords. Salting adds unique data to every hash, preventing attackers from using pre-computed tables to crack them. | `m1_hash_2.mp3` |
| **Vault Entrance** | The Mainframe entrance is within reach. Use your OSINT skills to finalize the breach. | `m1_vault_intro.mp3` |
| **Breach Debrief 1** | What you just executed is a targeted Dictionary Attack. By running OSINT, you scraped the target's personal data to generate a custom wordlist. | `m1_debrief_1.mp3` |
| **Breach Debrief 2** | The brute-force script instantly found the match because the password was built from predictable personal details. | `m1_debrief_2.mp3` |
| **Breach Debrief 3** | **Lesson:** Never use personal details like pet names, birth years, or favorite teams in your master passwords. | `m1_debrief_3.mp3` |
| **Breach Debrief 4** | You are now the System Admin. Secure this vault by constructing an unbreakable payload. | `m1_debrief_4.mp3` |

---

## 📂 Module 2: Phishing Simulator (Forensic Lab)
**Context:** Step-by-step onboarding and scoring feedback for the Phishing game.

| Part / Step | Cypher's Dialogue (The Script) | Filename |
| :--- | :--- | :--- |
| **Tour Step 1** | Welcome, Agent. This is a suspicious message. Your job is simple: look for clues and decide if it's real or if it's a fake phishing trap. | `m2_tour_1.mp3` |
| **Tour Step 2** | On the right is your Analysis Tools. First, pick a tool to start your inspection. | `m2_tour_2.mp3` |
| **Tour Step 3** | The URL Microscope is very useful. It shows you where a link really goes. If the text says 'google.com' but the tool shows something else, it's a fake! | `m2_tour_3.mp3` |
| **Tour Step 4** | You can also check the Certificate (SSL) to see if the website is verified, or check the 'Vibe' of the text to see if it sounds too pushy or scary. | `m2_tour_4.mp3` |
| **Tour Step 5** | When you find a clue, click the 'Evidence Selector' and then click on the suspicious part of the message to save it. | `m2_tour_5.mp3` |
| **Tour Step 6** | Your clues appear here. Collect enough clues before making your final choice. | `m2_tour_6.mp3` |
| **Tour Step 7** | Finally, choose your choice: Real or Fake. If it's fake, we'll block it and you'll earn points. Take your time! | `m2_tour_7.mp3` |
| **Failure (0%)** | Critical failure, Analyst. Our systems have been breached because of these missed cues. You must recalibrate and try again to secure the perimeter. | `m2_fail.mp3` |
| **Partial (50%)** | Mixed results. You caught a major threat but let one slide. In the field, 'half right' equal a full breach. Re-examine your forensic markers. | `m2_mixed.mp3` |
| **Success (100%)** | Excellent forensic work, Analyst. You've successfully categorized the intercepts and protected the HQ. Your reputation in the Academy has grown. | `m2_success.mp3` |

---

## 📂 Module 3: Operation Iron Wall (Network Security)
**Context:** Strategy-based firewall defense instructions.

| Context | Cypher's Dialogue (The Script) | Filename |
| :--- | :--- | :--- |
| **Briefing** | The network scanner is active. Watch the dashboard on the right. If you see a suspicious port, a very large file or repeated IP, add a block rule. | `m3_briefing.mp3` |
| **Mission Success**| Mission success. You kept the service online and stopped the threats. Uploading your report. | `m3_success.mp3` |
| **Mission Failure**| Uptime dropped too low. Replay the mission and block threats earlier (especially repeated IP bursts and odd ports). | `m3_fail.mp3` |
| **Generic Ack** | Barrier active: threat neutralized. | `m3_barrier_locked.mp3` |

---

## 📂 Live Feedback (Vault Password Challenges)
**Context:** Instant voice feedback played while the student types in the Admin Vault.

| Situation | Cypher's Dialogue (The Script) | Filename |
| :--- | :--- | :--- |
| **Starts Typing** | Initiating sequence. Enter the new administrative payload. | `pw_init.mp3` |
| **Numbers Only** | You're only using numbers. This is just a PIN, not a secure payload. | `pw_numbers.mp3` |
| **Letters Only** | Letters alone won't cut it. Add digits or symbols to expand the character pool. | `pw_only_letters.mp3` |
| **Repeating Chars**| Repeated characters detected. 'A A A' doesn't add real entropy. | `pw_repeat.mp3` |
| **Sequential (abc)** | A numerical sequence? Hackers test '1 2 3' before they even start their coffee. | `pw_sequence.mp3` |
| **Common Word** | Dictionary word detected! Scripts use massive lists of common words. Mix it up. | `pw_dict.mp3` |
| **Too Short** | Too short. An automated script could brute-force this in milliseconds. Keep typing. | `pw_short.mp3` |
| **Moderate** | It's getting better, but a dedicated GPU rig could still crack it. Add more randomness. | `pw_moderate.mp3` |
| **Strong** | Strong parameters detected. But as an Admin, we shouldn't settle for 'strong'. Push it further. | `pw_strong.mp3` |
| **Unbreakable** | Massive entropy achieved. A network of supercomputers would need centuries to crack this. The vault is secure. | `pw_unbreakable.mp3` |

---
