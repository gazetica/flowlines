
GAZETICA
by Voraky Retail LLP
  STUDIO MASTER DOCUMENT  

Light Plan — 5 Games — Project Base
Setup  |  Architecture  |  Environment  |  Development Plan  |  Master Checklists
Version 1.0	June 2026	Pre-Development	5 Games Planned

 
1. Game Portfolio Overview
The Gazetica Light Plan comprises five Android mobile games, all built on the same React + Phaser + Capacitor web stack. Three games (L1-L3) are polished versions of proven mechanics. Two games (L4-L5) are original inventions with no equivalent on Google Play. All five are monetised via AdMob rewarded video, interstitial ads, and optional IAP.

#	Game	Genre	Bundle ID	Launch	Innovation	Status	Colour
L1	Numtap	Number Tap	com.gazetica.numtap	Jul 2026	Proven	Report Done	 
L2	Flow Lines	Colour Puzzle	com.gazetica.flowlines	Aug 2026	Proven	Report Done	 
L3	Word Drop	Word Arcade	com.gazetica.worddrop	Sep-Oct 2026	Proven	Report Done	 
L4	Pulse Grid	Wave Puzzle	com.gazetica.pulsegrid	Oct-Nov 2026	ORIGINAL	Report Done	 
L5	Echo Trail	Memory Path	com.gazetica.echotrail	Nov-Dec 2026	ORIGINAL	Report Done	 

All 5 project reports have been completed and are stored alongside this document. This master document covers the shared infrastructure, environment, architecture, and development checklists that apply to all 5 games. Read it first before opening any individual game report.
 
2. Legal and Business Setup
Gazetica operates under Voraky Retail LLP, which is already registered with active GST and a bank account. All app revenue flows through the LLP. The following table tracks the business setup status:

Setup Item	Detail	Status
Legal Entity	Voraky Retail LLP — registered, GST active, bank account open	DONE
Studio Brand Name	Gazetica — derived from "gadget". Final, confirmed.	DONE
Domain	gazetica.com — purchased and owned by LLP	DONE
Trademark	Gazetica — Class 41 (Games/Entertainment), IP India filing	PENDING
Google Play Console	Organisation account active — developer name update to Gazetica pending	PENDING
AdMob Account	admob.google.com — linked to LLP Gmail, PENDING creation	PENDING
Support Email	support@gazetica.com — forward to LLP Gmail	PENDING
Privacy Policy	gazetica.com/privacy — required before any Play Store submission	PENDING
Accounting Software	Set up when first AdMob revenue received	PENDING
LLP Annual Filing	Ensure Gazetica app revenue declared correctly under LLP	PENDING
 
3. Hardware Status and Requirements
All 5 Light Plan games can be built and tested on the existing laptop. The Intel HD 5500 GPU is sufficient for all Phaser.js 2D games. The only physical purchases needed before development begins are a USB hub and (for testing comfort) confirmation that the Android device is in USB debug mode.

Hardware	Specification / Notes	Status	Action Required
Laptop	Windows 10, i7, 16GB RAM, Intel HD Graphics 5500	DONE	None — sufficient for all 5 light games
SSD Storage	128GB — BLOCKER for Unity (Phase 2). Fine for Light Plan.	PENDING	Buy external HDD (Seagate/WD, wait for sale <Rs.5,000)
USB Hub	Powered USB 3.0 hub needed — only 1 USB port on laptop	PENDING	Buy Rs.800-1,200. Needed before Sprint 1.
Android Test Device	Physical Android phone — already owned	DONE	Enable USB Debugging (see checklist below)
GPU	Intel HD 5500 — DirectX 11, WebGL2. Sufficient for all Phaser games.	DONE	No upgrade needed for Light Plan

External HDD is NOT required for Light Plan. It is required for Phase 2 (Unity). Do not block Light Plan development waiting for the HDD. Buy the USB hub (Rs.800-1,200) immediately — it is needed from Sprint 1 Day 1.
 
4. Development Environment Setup
4.1 Tools and Status
The following table lists every development tool needed for all 5 Light Plan games, its current status, and its role in the project:

Tool	Version / Detail	Status	Purpose in Gazetica
VS Code	Latest stable	DONE	Primary IDE for all 5 games
Claude Code plugin	$100/month Pro plan — active	DONE	AI-assisted code generation for all games
Node.js	LTS (v20+)	DONE	Runtime for Vite builds and Capacitor CLI
npm	Latest (bundled with Node)	DONE	Package management
Git	Latest stable	DONE	Version control
GitHub Account	github.com/gazetica (create)	PENDING	Repos for all 5 games + organisation page
Java JDK	17 LTS (already installed)	DONE	Required by Capacitor Android build tools
Android Studio	Latest stable	PENDING	Android SDK, NDK, emulator (install before Sprint 1)
Android SDK	API 24–35 (via Android Studio)	PENDING	Build target and minimum SDK for all games
Phaser.js	4.x (npm i phaser per game)	NEW	Core 2D game engine for all 5 light games
Capacitor CLI	6.x (npm i @capacitor/cli)	NEW	Android wrapper — one install per game repo
React	18.x (already installed)	DONE	App shell and UI for all games
Vite	5.x (already installed)	DONE	Build tool — fast HMR and production bundling
Tailwind CSS	3.x (already installed)	DONE	All UI styling across all games
Firebase CLI	npm i -g firebase-tools	PENDING	Deploy analytics and crash reporting
Supabase CLI	npm i -g supabase (optional)	PENDING	Local Supabase dev (optional, use dashboard otherwise)

4.2 One-Time Environment Setup — Order of Operations
Complete these steps once before starting Game L1. They apply to all subsequent games.

1.	Install Android Studio: download from developer.android.com/studio. During install, select Android SDK, API 24 through 35, Android Emulator (optional).
2.	Verify Java: run java -version in terminal. Should show version 17. If not, install JDK 17 LTS from adoptium.net.
3.	Connect Android phone via USB hub. Run adb devices in terminal. Should show device serial number. If not, re-enable USB Debugging.
4.	Install Firebase CLI globally: npm install -g firebase-tools. Run firebase login.
5.	Create GitHub organisation account at github.com/gazetica (or use personal account with gazetica repos).
6.	Verify all existing tools still work: npm -v, node -v, git --version, code --version.

4.3 Per-Game Environment Setup — Order of Operations
Repeat these steps for each new game, substituting the game name and bundle ID:

7.	Fork or copy the previous game's repository. Update bundle ID in capacitor.config.ts.
8.	Register new app in Firebase Console. Download fresh google-services.json.
9.	Register new app in AdMob. Copy App ID into capacitor.config.ts admob plugin config.
10.	Create new Supabase tables for this game (see Section 7 schema).
11.	Create new private GitHub repository. Push initial commit.
12.	Update .env with VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VITE_ADMOB_APP_ID.
13.	Run npm install. Run npx cap sync to sync with Android platform. Run npx cap open android. Verify build in Android Studio.
14.	Deploy "Hello World" Phaser scene to physical device. Verify 60fps.
 
5. Shared Architecture
5.1 Technology Stack — All 5 Games
Every Gazetica Light Plan game uses the same technology stack. The layers below are identical across all games. Only game-specific logic (grid engine, word engine, wave engine etc.) differs between games.

Layer	Technology	Shared Usage Detail
Game Engine	Phaser.js 4.x	Same engine for all 5 games. Each game has independent Phaser config and scenes. No shared Phaser code between games.
App Framework	React 18 + Vite 5	App shell, menus, modals, navigation — reused pattern across all games. Same component architecture.
Styling	Tailwind CSS 3	Same Tailwind setup, different colour theme per game. Shared utility classes, unique design tokens per game.
Native Bridge	Capacitor 6	Same capacitor.config.ts structure for all games. Only bundle ID, app name, and splash change per game.
State Management	Zustand 4	Same Zustand pattern per game. Different store shape per game. No shared stores across games.
Ads	@capacitor-community/admob 5	Same plugin, same GDPR UMP flow. Different Ad Unit IDs per game. admob.ts service file reused with config injection.
IAP	@capacitor/google-play	Same billing setup. Different product IDs per game. iap.ts service file reused with config injection.
Analytics	Firebase 10	Same Firebase SDK. Different app registration and event names per game. firebase.ts service file reused.
Database	Supabase (PostgreSQL)	Same Supabase project. Different tables per game (numtap_scores, flowlines_scores, etc.). supabase.ts reused with table config.
Localisation	i18next 23	Same i18next setup. Different translation files per game. Shared: language codes, date formatting, number formatting.
Local Storage	@capacitor/preferences	Same API. Different key namespaces per game (numtap_, flowlines_, etc.). preferences.ts service reused.
Haptics	@capacitor/haptics	Installed from Pulse Grid (L4) onwards. All subsequent games reuse. haptics.ts service shared.
CI/CD	GitHub Actions	Same workflow YAML template for all games. Variables: APP_ID, KEYSTORE_PATH. One template, 5 repos.
Build Output	Signed AAB via Capacitor	Same build command: npx cap build android --release. Same signing config per game (different keystore alias).

5.2 Shared Folder Structure Template
Every game repo follows this identical folder structure. Only file names within game/ and the content of locales/ and tailwind.config.js vary between games:

gazetica-[gamename]/
  src/
    game/              <- Phaser scenes, engine, game-specific logic
      scenes/          <- SplashScene.ts, GameScene.ts, UIScene.ts
      engine/          <- [Game]Engine.ts, ScoreEngine.ts, LevelManager.ts
      config.ts        <- Phaser config (width, height, physics, renderer)
    components/        <- React UI components (Home, Menus, Leaderboard)
    store/             <- Zustand store (gameState, settings, score)
    services/
      admob.ts         <- AdMob init, showRewarded(), showInterstitial()
      firebase.ts      <- Analytics.logEvent(), Crashlytics setup
      supabase.ts      <- Leaderboard queries, daily seed fetch
      iap.ts           <- Remove Ads + IAP product purchase flow
      haptics.ts       <- light/medium/heavy haptic wrappers
      i18n.ts          <- i18next init, language detection
    locales/
      en.json          <- English UI strings
      de.json          <- German UI strings
      fr.json          <- French UI strings
      ko.json          <- Korean UI strings
      pt.json          <- Portuguese (BR) UI strings
      es.json          <- Spanish UI strings
    App.tsx            <- Root component, routing, Capacitor app lifecycle
    main.tsx           <- React entry point
  android/             <- Capacitor-generated (git-ignored specific files)
    app/src/main/
      google-services.json   <- Firebase config (git-ignored)
  capacitor.config.ts  <- Bundle ID, appName, webDir: dist
  vite.config.ts       <- Vite config (path aliases, build output)
  tailwind.config.js   <- Tailwind theme (game-specific colours)
  package.json         <- All dependencies version-locked
  .env                 <- VITE_SUPABASE_URL, VITE_SUPABASE_KEY (git-ignored)
  .gitignore           <- node_modules, android/build, google-services.json, .env
  README.md            <- Game overview, build instructions, ad unit IDs

5.3 Key Shared Service Files
These four service files are written once in Game L1 (Numtap) and copied into all subsequent games with only configuration values changed:

File	Written in	What Changes Per Game
admob.ts	L1 Numtap	Ad Unit IDs only. initAdmob(), showRewarded(), showInterstitial() functions identical.
firebase.ts	L1 Numtap	Nothing. Same Firebase SDK initialisation. Each game uses its own google-services.json.
supabase.ts	L1 Numtap	Table name constants only. queryLeaderboard(), upsertScore(), getDailySeed() functions identical.
iap.ts	L1 Numtap	Product IDs only (REMOVE_ADS, HINT_PACK). Purchase flow and restore flow identical.
haptics.ts	L4 Pulse Grid	Nothing. light(), medium(), heavy() wrapper functions identical across L4 and L5.
i18n.ts	L1 Numtap	Nothing. Language detection and init identical. Only locale JSON files change per game.

5.4 npm Package Matrix — All 5 Games
GREEN = already installed or full reuse. YELLOW = new install. BLUE = reuse pattern from previous game. This shows exactly how infrastructure accumulates and reduces per-game setup work:

Package	L1 Numtap	L2 Flow	L3 Word	L4 Pulse	L5 Echo	Notes
phaser	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
react + react-dom	DONE	REUSE	REUSE	REUSE	REUSE	
vite	DONE	REUSE	REUSE	REUSE	REUSE	
tailwindcss	DONE	REUSE	REUSE	REUSE	REUSE	
@capacitor/core	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
@capacitor/android	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
@capacitor/preferences	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
@capacitor-community/admob	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
@capacitor/google-play	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
firebase	DONE	REUSE	REUSE	REUSE	REUSE	
@supabase/supabase-js	DONE	REUSE	REUSE	REUSE	REUSE	
i18next + react-i18next	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
zustand	NEW	REUSE	REUSE	REUSE	REUSE	Install once in L1, reuse pattern
@capacitor/haptics	--	--	--	NEW	REUSE	Added from L4 onwards
trie-search (custom)	--	--	NEW	--	--	L3 only — word dictionary
 
6. Cloud Services Setup
All 5 games share the same cloud service accounts. The table below shows the plan, status, and how each service is used across the portfolio:

Service	Plan / Cost	Status	Usage Across Games
Firebase	Spark (Free) — 10GB storage, Analytics, Crashlytics	PENDING	All 5 games: 1 Firebase project, 5 app registrations. Analytics, crash reports.
Supabase	Free (500MB, 50K rows, 2GB bandwidth)	PENDING	All 5 games: 1 Supabase project, tables per game. Leaderboards + daily seeds.
Cloudflare	Free plan — already using	DONE	gazetica.com hosting, privacy policy, R2 for level CDN (Flow Lines, Echo Trail)
Vercel	Free plan — already using	DONE	PWA web versions of all 5 games. 5 deployments, 1 per game.
AdMob	Free — revenue share only	PENDING	1 AdMob account, 5 app registrations, 2 ad units per game (rewarded + interstitial)
Google Play Console	Rs.1,750 one-time fee (already paid)	DONE	1 developer account, 5 app listings under Gazetica
GitHub	Free (public) or Rs.330/month (private)	PENDING	5 repos: gazetica/numtap, flowlines, worddrop, pulsegrid, echotrail
AWS	Already using — keep for other projects	DONE	Not needed for Light Plan games specifically

All cloud services used are free tier for the scale of Light Plan games. No cloud costs are expected until any single game exceeds 10,000 MAU. At that point, Supabase ($25/month) is the first upgrade needed. Firebase Spark plan covers up to 10M Analytics events/month — sufficient for the entire portfolio combined at early stage.
 
7. Supabase Database Schema — All 5 Games
All tables live in one Supabase project named "gazetica". The green row (gazetica_streaks) is shared across all 5 games and powers the cross-game daily streak system.

Table Name	Columns	Purpose
numtap_scores	id, alias, score, mode, country, streak, created_at	Leaderboard for Classic, Speed, Endless, Daily modes
numtap_daily	date, seed, target_grid_size	Daily challenge seed — same puzzle worldwide per date
flowlines_scores	id, alias, score, mode, moves, pack, country, created_at	Leaderboard including move count (key metric for Flow Lines)
flowlines_daily	date, seed, pack_size	Daily Flow Lines challenge seed
worddrop_scores	id, alias, score, words_found, longest_word, mode, country, created_at	Leaderboard including word stats
worddrop_daily	date, seed, target_word	Daily Word Drop seed + specific target word to find
pulsegrid_scores	id, alias, score, accuracy, perfect_rounds, mode, country, created_at	Leaderboard including perfect rounds count
pulsegrid_daily	date, seed, grid_size, wave_speed	Daily Pulse Grid wave configuration
echotrail_scores	id, alias, score, accuracy, perfect_trails, path_length, mode, country, created_at	Leaderboard including accuracy percentage
echotrail_daily	date, seed, grid_size, path_length, mode_type	Daily Echo Trail path seed
gazetica_streaks	device_id, last_played_date, streak_count, games_played_today	SHARED — cross-game streak system across all 5 games

7.1 Row Level Security Policy — All Score Tables
Apply these RLS policies to all score tables to prevent abuse:

-- Allow anyone to insert a score (anonymous play)
CREATE POLICY "insert_score" ON numtap_scores FOR INSERT WITH CHECK (true);

-- Allow anyone to read scores (public leaderboard)
CREATE POLICY "read_scores" ON numtap_scores FOR SELECT USING (true);

-- Prevent updates and deletes (scores are permanent)
-- No UPDATE or DELETE policies = no one can modify submitted scores

Replace "numtap_scores" with each game's table name. Apply same 2 policies to all 10 score tables and the 1 shared gazetica_streaks table.
 
8. AdMob Setup and Ad Unit ID Registry
Replace XXXX placeholders below with actual App IDs and Ad Unit IDs from admob.google.com after registering each app. These IDs go into each game's .env file and are injected into admob.ts at build time.

Game	Bundle ID	Rewarded Video Unit ID	Interstitial Unit ID	Ad Placement Logic
L1 Numtap	com.gazetica.numtap	ca-app-pub-XXXX/NUMTAP_RV	ca-app-pub-XXXX/NUMTAP_INT	Hint (RV), Between rounds (INT)
L2 Flow Lines	com.gazetica.flowlines	ca-app-pub-XXXX/FLOW_RV	ca-app-pub-XXXX/FLOW_INT	Path hint (RV), Level complete (INT)
L3 Word Drop	com.gazetica.worddrop	ca-app-pub-XXXX/WORD_RV	ca-app-pub-XXXX/WORD_INT	Word hint (RV), Round end (INT)
L4 Pulse Grid	com.gazetica.pulsegrid	ca-app-pub-XXXX/PULSE_RV	ca-app-pub-XXXX/PULSE_INT	Slow wave (RV), Round end (INT)
L5 Echo Trail	com.gazetica.echotrail	ca-app-pub-XXXX/ECHO_RV	ca-app-pub-XXXX/ECHO_INT	Replay trail (RV), Level end (INT)

8.1 GDPR Compliance — UMP Consent (Required for EU)
All 5 games must implement the Google User Messaging Platform (UMP) consent flow. This is built into the @capacitor-community/admob plugin. Steps:

15.	In AdMob console: Consent and privacy > GDPR > Create consent form with your privacy policy URL.
16.	In admob.ts: Call AdMob.requestConsentInfo() on app start. If ConsentStatus.REQUIRED, call AdMob.showConsentForm().
17.	Only call AdMob.initialize() AFTER consent is obtained or confirmed not required.
18.	Consent status is cached — players only see the form once (unless status changes).

8.2 AdMob Best Practices — Avoid Account Suspension
-	NEVER click your own ads — use test ad IDs (see below) during all development
-	Switch from test IDs to live IDs ONLY in the final signed release build
-	Rewarded video: maximum 3 per session per game
-	Interstitial: frequency cap 1 per 3-4 minutes, never consecutive, never mid-gameplay
-	Test Ad IDs (use these during all development):
o	Rewarded: ca-app-pub-3940256099942544/5224354917
o	Interstitial: ca-app-pub-3940256099942544/1033173712
o	Banner (if used): ca-app-pub-3940256099942544/6300978111
 
9. Cross-Promotion System
9.1 More from Gazetica Panel
Every game contains a "More from Gazetica" React component accessible from Home screen (after 3 sessions). Shows cards for all other Gazetica games with Play Store links. Implementation: standard React component, market:// URI for Play Store deep link.

Build this component in L1 Numtap with 1 placeholder card ("More Gazetica games coming soon"). Update it with each new game release. By L5 Echo Trail, it shows all 4 other games.

9.2 Contextual Cross-Promotion Triggers
Higher-converting than a static panel. These trigger-based promotions show a contextual recommendation card after specific player achievements:

Source Game	Trigger Event	Promote	Message
Numtap	Player hits 7-day streak	Echo Trail	"Love memory challenges? Try Echo Trail."
Numtap	Level 20 complete	Flow Lines	"Master colours next — try Flow Lines."
Flow Lines	Pack 1 all perfect	Pulse Grid	"Perfect spatial logic. Try Pulse Grid."
Flow Lines	Level 30 complete	Word Drop	"Your logic is sharp. Try Word Drop."
Word Drop	7-letter word found	Numtap	"Sharp mind! Try Numtap speed challenge."
Word Drop	Round 15 complete	Echo Trail	"Test your spatial memory — Echo Trail."
Pulse Grid	Perfect Round achieved	Echo Trail	"Perfect anticipation. Test memory too."
Pulse Grid	10 rounds played	Numtap	"Enjoy grid precision? Try Numtap."
Echo Trail	100% accuracy path	Pulse Grid	"Perfect memory. Predict waves — Pulse Grid."
Echo Trail	Level 20 complete	Flow Lines	"Spatial master. Draw lines — Flow Lines."

9.3 Shared Daily Streak System
The gazetica_streaks Supabase table is written to by all 5 games on every session. Any game can read the shared streak. Implementation: on app foreground, write {device_id, today_date, game_name} to gazetica_streaks. Read current streak on home screen to display "Gazetica streak: N days".

9.4 Play Store Developer Page
All 5 games appear automatically on the Gazetica developer page in Play Store. Optimise it:
-	Developer description: "Gazetica creates precise, satisfying puzzle games for Android. 5 games — number puzzles, colour logic, word arcade, wave anticipation, spatial memory."
-	Keep all 5 game icons visually coherent — same design language (minimal, geometric, dark background)
-	Sort games by newest release first on developer page

9.5 gazetica.com Web Cross-Promotion
-	Every game page sidebar links to all other games
-	Web PWA game-over screen: "Download the Android app for daily challenges + leaderboard"
-	SEO: each game page targets its own unique keyword cluster (see individual game ASO sections)
 
10. Development Timeline — Light Plan
Each game is built part-time at 3-4 hours per day, 5-6 days per week. Total calendar time from start to completion of all 5 games: approximately 7 months (June to December 2026). Phase 2 (Unity) begins January 2027 after portfolio review.

#	Game	Sprint Plan	Target Window	Key Milestone
L1	Numtap	5 sprints x 1 week = 5 weeks	Jun 2026	First Gazetica app live on Play Store
L2	Flow Lines	5-6 sprints = 5-6 weeks	Jul-Aug 2026	Level generator + solver validated
L3	Word Drop	6 sprints = 6 weeks	Aug-Sep 2026	Trie dictionary + letter distributor tested
L4	Pulse Grid	6 sprints = 6 weeks	Sep-Oct 2026	Wave timing calibration on physical device
L5	Echo Trail	6 sprints = 6 weeks	Oct-Nov 2026	Path generator + drag input QA with real users
BREAK	Portfolio Review	Analyse all 5 games — retention, revenue, reviews	Nov-Dec 2026	Data-driven decisions for Phase 2 Unity games
F1-F5	Unity Games x5	Phase 2 — requires external HDD + Unity setup	Jan 2027+	Begin Gravity Sort (first Unity game)

Games overlap in a rolling sequence — while Game N is in Sprint 5 (polish/ASO), Game N+1 can begin Sprint 1 (scaffolding). However, given solo development, complete each game's active coding sprints before starting the next. Sprint 5 submission work is lower intensity and can overlap with the next game's Sprint 1.
 
11. Master Pre-Development Checklist
Complete ALL items in this checklist before writing a single line of game code. These are one-time setup tasks that apply to the entire portfolio. Items marked DONE are already complete.

Checklist Item	Status	When
  BUSINESS & LEGAL
Update Google Play Console developer name to Gazetica	PENDING	Day 1
File Gazetica trademark — Class 41 — IP India portal	PENDING	Week 1
Create support@gazetica.com email address	PENDING	Day 1
Ensure LLP bank account linked to Google Play Console for payments	PENDING	Week 1
  WEB INFRASTRUCTURE
Deploy gazetica.com home page via Cloudflare Pages (Vite + React)	PENDING	Week 1
Deploy gazetica.com/privacy — Privacy Policy page (GDPR compliant)	PENDING	Week 1
Deploy gazetica.com/contact — Contact page with support email	PENDING	Week 1
Set up gazetica.com/games — placeholder for all 5 game pages	PENDING	Week 2
  FIREBASE SETUP
Create Firebase project "gazetica"	PENDING	Week 1
Enable Firebase Analytics in gazetica project	PENDING	Week 1
Enable Crashlytics in gazetica project	PENDING	Week 1
Register Numtap Android app in Firebase (get google-services.json)	PENDING	Before L1 S1
Register Flow Lines Android app in Firebase	PENDING	Before L2 S1
Register Word Drop Android app in Firebase	PENDING	Before L3 S1
Register Pulse Grid Android app in Firebase	PENDING	Before L4 S1
Register Echo Trail Android app in Firebase	PENDING	Before L5 S1
  SUPABASE SETUP
Create Supabase project "gazetica"	PENDING	Week 1
Create all 11 tables as per schema in Section 7 of this document	PENDING	Week 1
Enable Row Level Security on all score tables	PENDING	Week 1
Store SUPABASE_URL and SUPABASE_ANON_KEY in all game .env files	PENDING	Per game S1
  ADMOB SETUP
Create AdMob account at admob.google.com using LLP Gmail	PENDING	Week 1
Register Numtap app in AdMob — get App ID + 2 Ad Unit IDs	PENDING	Before L1 S1
Register Flow Lines app in AdMob — get App ID + 2 Ad Unit IDs	PENDING	Before L2 S1
Register Word Drop app in AdMob — get App ID + 2 Ad Unit IDs	PENDING	Before L3 S1
Register Pulse Grid app in AdMob — get App ID + 2 Ad Unit IDs	PENDING	Before L4 S1
Register Echo Trail app in AdMob — get App ID + 2 Ad Unit IDs	PENDING	Before L5 S1
  GITHUB SETUP
Create GitHub organisation: github.com/gazetica	PENDING	Week 1
Create private repo: gazetica/numtap	PENDING	Before L1 S1
Create private repo: gazetica/flowlines	PENDING	Before L2 S1
Create private repo: gazetica/worddrop	PENDING	Before L3 S1
Create private repo: gazetica/pulsegrid	PENDING	Before L4 S1
Create private repo: gazetica/echotrail	PENDING	Before L5 S1
Add .gitignore to every repo (node_modules, android/build, .env, google-services.json)	PENDING	Per game S1
  ANDROID DEVICE SETUP
Buy powered USB 3.0 hub (Rs.800-1,200)	PENDING	Before S1
Enable Developer Options on test Android phone (tap Build Number 7 times)	PENDING	Before S1
Enable USB Debugging in Developer Options	PENDING	Before S1
Install Android Studio + Android SDK API 24-35	PENDING	Before S1
Verify adb devices detects phone when connected via USB hub	PENDING	Before S1
Run test Capacitor build and deploy to physical device	PENDING	L1 Sprint 1
  PLAY STORE — PRE-SUBMISSION (per game)
Privacy Policy URL live at gazetica.com/privacy	PENDING	Before any submit
IARC questionnaire completed (PEGI 3 target for all games)	PENDING	Per game S5
6 Play Store screenshots created per game in correct dimensions	PENDING	Per game S5
Feature graphic (1024x500px) created per game	PENDING	Per game S5
30-second promo video recorded per game	PENDING	Per game S5
Signed AAB generated (release keystore created per game)	PENDING	Per game S5
Release keystore backed up securely (losing it = cannot update app)	PENDING	Per game S5
App description written in English + 5 localised languages	PENDING	Per game S5
Test APK internally tested on minimum 1 physical device before submission	PENDING	Per game S5
 
12. Per-Game Sprint Checklists
The following sprint-by-sprint checklists cover every action required to build, test, and submit each game. Use these as your primary development task tracker. Check off each item as it is completed.

STATUS LEGEND:  PENDING = not started  |  DONE = completed  |  REUSE = copied from previous game  |  NEW = first install  |  BLOCKER = must resolve before proceeding

12.1 L1 — Numtap Sprint Checklist

L1 — Numtap — com.gazetica.numtap	Status	Sprint / Week
Sprint 1 — Week 1: Environment + Scaffolding
Create Vite + React project: npm create vite@latest numtap -- --template react-ts	PENDING	S1 Day 1
Install Phaser: npm i phaser	PENDING	S1 Day 1
Install Capacitor: npm i @capacitor/core @capacitor/android @capacitor/cli	PENDING	S1 Day 1
Run npx cap init with appId=com.gazetica.numtap	PENDING	S1 Day 1
Run npx cap add android to generate android/ folder	PENDING	S1 Day 1
Install AdMob plugin: npm i @capacitor-community/admob	PENDING	S1 Day 1
Install Preferences: npm i @capacitor/preferences	PENDING	S1 Day 1
Install i18next: npm i i18next react-i18next	PENDING	S1 Day 1
Install Zustand: npm i zustand	PENDING	S1 Day 1
Add google-services.json to android/app/ (from Firebase console)	PENDING	S1 Day 2
Create admob.ts service with test ad IDs (use Google test IDs during dev)	PENDING	S1 Day 2
Build and deploy "Hello World" Phaser scene to physical Android device	PENDING	S1 Day 3
Verify 60fps on device with basic Phaser rectangle rendering	PENDING	S1 Day 3
Set up GitHub Actions workflow YAML for AAB build on push to main	PENDING	S1 Day 4
Sprint 2 — Week 2: Core Game Logic
Build GridEngine.ts: generateGrid(n), shuffleNumbers(), validateTap(row,col,expected)	PENDING	S2
Build ScoreEngine.ts: baseScore, timeBonus, speedBonus, streakMultiplier, gridMultiplier	PENDING	S2
Build LevelManager.ts: grid size progression 3x3 to 7x7, level config JSON	PENDING	S2
Build TimerComponent: countdown in seconds, red below 10s, fires onExpire event	PENDING	S2
Wire game loop: generate grid -> render -> tap -> validate -> score -> next level	PENDING	S2
Unit test GridEngine: verify all 25 numbers present, no duplicates, tap sequence correct	PENDING	S2
Sprint 3 — Week 3: Phaser Visuals + React UI
Build Phaser GameScene: render NxN grid cells, number tiles, tap pulse animation	PENDING	S3
Add target number gold highlight (current number to tap)	PENDING	S3
Add checkmark animation on correct tap, red flash on wrong tap	PENDING	S3
Build React screens: HomeScreen, ModeSelectScreen, SettingsScreen	PENDING	S3
Apply Tailwind navy/gold theme across all screens	PENDING	S3
Add i18next with en.json, de.json, fr.json, ko.json, pt.json, es.json	PENDING	S3
Add Supabase leaderboard table query and display component	PENDING	S3
Build Daily Challenge with seeded grid (date as seed)	PENDING	S3
Sprint 4 — Week 4: Monetisation + Analytics
Switch from test AdMob IDs to live Ad Unit IDs (rewarded + interstitial)	PENDING	S4
Implement GDPR UMP consent screen on first launch (EU detection)	PENDING	S4
Place rewarded ad: Hint button -> watch ad -> highlight correct number 5s	PENDING	S4
Place interstitial ad: result screen, frequency cap 1 per 3 minutes	PENDING	S4
Implement Remove Ads IAP (Rs.99) — test with Google sandbox account	PENDING	S4
Implement Hint Pack IAP (Rs.49) — 5 hints consumable	PENDING	S4
Store remove-ads flag in Capacitor Preferences — survives reinstall via Play restore	PENDING	S4
Add Firebase Analytics events: session_start, level_complete, tap_correct, tap_wrong, ad_impression	PENDING	S4
Verify Crashlytics crash reporting active (force a test crash, check console)	PENDING	S4
Add More from Gazetica panel (placeholder — no games yet, show coming soon)	PENDING	S4
Sprint 5 — Week 5: Polish, ASO, Submission
Play 30+ game sessions across all grid sizes — verify difficulty curve is fair	PENDING	S5
Test on minimum 2 different Android devices (different screen sizes)	PENDING	S5
Generate signed release AAB: keytool genkey + Capacitor release build	PENDING	S5
Back up release keystore file securely (losing this = cannot update the app ever)	PENDING	S5
Create 6 Play Store screenshots per language (Figma or Android device screenshots)	PENDING	S5
Record 30-second promo video showing game loop	PENDING	S5
Write English Play Store description (title, short desc, full desc)	PENDING	S5
Translate Play Store description to DE, FR, KO, PT, ES via i18n or DeepL	PENDING	S5
Complete IARC questionnaire in Play Console (PEGI 3)	PENDING	S5
Submit to Google Play internal testing track first — invite 1 tester	PENDING	S5
After internal pass: submit to production track	PENDING	S5
Monitor Play Store reviews for first 2 weeks — respond to all reviews	PENDING	Post-launch

 
12.2 L2 — Flow Lines Sprint Checklist

L2 — Flow Lines — com.gazetica.flowlines	Status	Sprint / Week
Sprint 1 — Week 1: Scaffolding (Fork Numtap)
Fork numtap repo, rename to flowlines, update bundle ID to com.gazetica.flowlines	PENDING	S1 Day 1
Update capacitor.config.ts: appId, appName	PENDING	S1 Day 1
Update tailwind.config.js: replace navy theme with purple/gold Flow Lines theme	PENDING	S1 Day 1
Register flowlines in Firebase — add new google-services.json	PENDING	S1 Day 1
Register flowlines in AdMob — get new App ID and 2 Ad Unit IDs	PENDING	S1 Day 1
Create Supabase tables: flowlines_scores, flowlines_daily	PENDING	S1 Day 1
Build GridEngine.ts: NxN grid data structure, dot-pair placement, path validation	PENDING	S1 Day 2-4
Build drag-path input in Phaser: touchstart, touchmove, touchend handlers	PENDING	S1 Day 3-5
Verify basic path rendering on physical device	PENDING	S1 Day 5
Sprint 2 — Week 2: Level Generator + Solver
Build PathSolver.ts (Claude Code): backtracking algorithm, validates 100% board coverage	PENDING	S2
Build LevelGenerator.ts: place N dot pairs, run solver, discard unsolvable, store JSON	PENDING	S2
Generate Pack 1 (6x6, 50 levels) — run generator script offline	PENDING	S2
Generate Pack 2 (7x7, 50 levels)	PENDING	S2
QA: manually play 10 random levels from each pack to verify solvable and non-trivial	PENDING	S2
Build board coverage calculator: fires win event only when all cells filled	PENDING	S2
Sprint 3 — Week 3: Visuals + Modes
Build Phaser animated line drawing: smooth curves between cells, colour glow	PENDING	S3
Add dot pulse animation on endpoints, completion cascade animation	PENDING	S3
Build React screens: Home, PackSelect, LevelSelectGrid (5x10 per pack)	PENDING	S3
Apply purple/gold Tailwind theme	PENDING	S3
Generate Pack 3 (8x8, 50 levels) and Pack 4 (9x9, 50 levels)	PENDING	S3
Build Zen Mode: no timer, no score, reduced ad frequency	PENDING	S3
Build Daily Challenge: seeded puzzle via Supabase date seed	PENDING	S3
Sprint 4 — Week 4: Monetisation
Rewarded ad: Path Hint reveals one correct cell path segment	PENDING	S4
Interstitial: shown on level complete screen, 1 per 3 min frequency cap	PENDING	S4
IAP: Remove Ads (Rs.99) + Hint Pack x5 (Rs.49)	PENDING	S4
Pack progress save to Capacitor Preferences: star ratings per level	PENDING	S4
Add More from Gazetica panel with Numtap card + Play Store link	PENDING	S4
Firebase events: level_start, level_complete, hint_used, ad_impression	PENDING	S4
Sprint 5-6 — Weeks 5-6: QA + Submission
Verify all 200 levels across 4 packs are solvable (zero unsolvable reports tolerance)	PENDING	S5
Test drag input on 2+ screen sizes — verify no false cells triggered	PENDING	S5
Generate signed AAB, back up keystore	PENDING	S5
Play Store screenshots, description, IARC, submit	PENDING	S5-6
Update Numtap More from Gazetica panel to include Flow Lines	PENDING	S6 post-launch

 
12.3 L3 — Word Drop Sprint Checklist

L3 — Word Drop — com.gazetica.worddrop	Status	Sprint / Week
Sprint 1 — Week 1: Scaffolding + Dictionary
Fork flowlines repo, rename to worddrop, update bundle ID to com.gazetica.worddrop	PENDING	S1 Day 1
Download SOWPODS dictionary (public domain): filter profanity, proper nouns, <3 letter words	PENDING	S1 Day 1
Output cleaned sowpods.json (~1.8MB) to src/data/ folder	PENDING	S1 Day 1
Build 8-column grid data structure and falling tile state in Zustand	PENDING	S1 Day 2
Build Phaser falling tile animation: tile falls from top at configurable speed	PENDING	S1 Day 3
Add swipe-left/right input: moves falling tile laterally before landing	PENDING	S1 Day 4
Add tap-to-hard-drop: tile instantly lands on current column	PENDING	S1 Day 5
Sprint 2 — Week 2: Trie + Word Validation
Build TrieBuilder.ts (Claude Code): parse sowpods.json into Trie at app load	PENDING	S2
Build WordScanner.ts: after each tile lands, scan all rows left-to-right for 3+ letter sequences	PENDING	S2
Validate manually: CAT, DOG, PLAY, WORD, GAME, DROP, JAZZ, QUIZ, QUAFF, FRACTURE must all pass	PENDING	S2 CRITICAL
Build word-clear cascade animation: matched word flashes green, cells disappear, above tiles fall	PENDING	S2
Build ScoreEngine.ts: Scrabble letter values, length bonus, combo multiplier, rare letter bonus	PENDING	S2
Build LetterDistributor.ts (Claude Code): English frequency weighted, vowel guarantee rule	PENDING	S2
Sprint 3 — Week 3: Modes + UI
Build Classic Mode: speed progression, game-over when column full	PENDING	S3
Build Blitz Mode: 60-second timer, fixed fast speed from start	PENDING	S3
Build Word Collection viewer (React): scrollable word history with definitions	PENDING	S3
Build Zen Mode: no speed increase, no game-over, board resets when full	PENDING	S3
Apply crimson/amber Tailwind theme	PENDING	S3
Build Daily Challenge: Supabase seeds target word for each day	PENDING	S3
Sprint 4 — Week 4: Monetisation
Rewarded ad: Hint suggests highest-scoring valid word from current board state	PENDING	S4
Interstitial: after round end result screen, max 1 per 4 minutes	PENDING	S4
IAP: Remove Ads (Rs.99) + Hint Pack x5 (Rs.49)	PENDING	S4
Add More from Gazetica panel: Numtap + Flow Lines cards	PENDING	S4
Firebase events: word_found (with length, word, pts), combo_achieved, level_fail	PENDING	S4
Sprints 5-6 — Weeks 5-6: QA + Submission
CRITICAL QA: play 30+ sessions verifying letter distribution feels fair	PENDING	S5
CRITICAL QA: verify no common 3-4 letter words are incorrectly rejected	PENDING	S5
Test on 2 device sizes — verify tile width fills screen correctly on all	PENDING	S5
Generate signed AAB, back up keystore	PENDING	S5-6
Play Store submission with screenshots showing word-clearing animation	PENDING	S6

 
12.4 L4 — Pulse Grid Sprint Checklist

L4 — Pulse Grid — com.gazetica.pulsegrid	Status	Sprint / Week
Sprint 1 — Week 1: Scaffolding + Wave Engine
Fork worddrop repo, rename to pulsegrid, update bundle ID to com.gazetica.pulsegrid	PENDING	S1 Day 1
Install @capacitor/haptics: npm i @capacitor/haptics && npx cap update	PENDING	S1 Day 1
Build NxN grid rendering in Phaser: cells as rectangle objects	PENDING	S1 Day 2
Build WaveEngine.ts (Claude Code): calculates ring membership + arrival timestamps per cell	PENDING	S1 Day 3
Build device calibration benchmark: 3 forced taps measure touch latency, adjust window coefficient	PENDING	S1 Day 4
Verify wave schedule accuracy: log ring arrival times, check spacing is correct ms intervals	PENDING	S1 Day 5
Sprint 2 — Week 2: Wave Animation + Tap Validation
Build Phaser tween timeline: expanding glow ring, colour shift purple to gold	PENDING	S2
Add particle burst on correct tap (Phaser particle emitter)	PENDING	S2
Build TapValidator.ts: timestamp comparison vs ring arrival, Perfect/Good/Miss result	PENDING	S2
Add haptic feedback: ImpactStyle.Light on tap, ImpactStyle.Medium on perfect ring completion	PENDING	S2
Build ScoreEngine.ts: base + timing bonus + ring completion + perfect + combo + speed multiplier	PENDING	S2
Verify at 60fps on physical device — wave animation smooth, no dropped frames	PENDING	S2 CRITICAL
Sprint 3 — Week 3: All Modes + UI
Build Classic Mode: 5x5, 5 waves, speed increases per wave, 50 level progression	PENDING	S3
Build Dual Pulse Mode: 2 simultaneous WaveEngine instances, different origins	PENDING	S3
Build Irregular Wave Mode: skip cells shown 2s before wave, memory + anticipation	PENDING	S3
Build Zen Mode: slow waves, no score pressure, ambient music reactive to taps	PENDING	S3
Apply deep space indigo/gold Tailwind theme	PENDING	S3
Build Wave Skin Gallery React screen: 5 skins, animated preview, 1 free unlock at Level 10	PENDING	S3
Sprint 4 — Week 4: Monetisation
Rewarded ad: Slow Wave — halves next wave speed for 1 round	PENDING	S4
Interstitial: after round result, 1 per 3 min cap	PENDING	S4
IAP: Remove Ads (Rs.99) + Wave Skin Pack — all 5 skins (Rs.49)	PENDING	S4
Add More from Gazetica: Numtap, Flow Lines, Word Drop cards	PENDING	S4
Firebase events: wave_perfect (ring, ms_early), wave_miss (ring, ms_late), perfect_round	PENDING	S4
Sprints 5-6 — Critical Timing QA + Submission
CRITICAL: recruit 3 people unfamiliar with game — watch them understand mechanic within 2 min	PENDING	S5
CRITICAL: test timing calibration on 2+ Android devices — verify wave feels fair on both	PENDING	S5
Verify Ring 1 miss rate < 15% in Firebase events after 20+ test sessions	PENDING	S5
Generate signed AAB, back up keystore	PENDING	S5-6
Promo video MUST show wave expanding — static screenshots insufficient for this game	PENDING	S6
Play Store submission	PENDING	S6

 
12.5 L5 — Echo Trail Sprint Checklist

L5 — Echo Trail — com.gazetica.echotrail	Status	Sprint / Week
Sprint 1 — Week 1: Scaffolding + Path Generator
Fork pulsegrid repo, rename to echotrail, update bundle ID to com.gazetica.echotrail	PENDING	S1 Day 1
Build NxN grid rendering in Phaser: cells, Start marker (S), End marker (E)	PENDING	S1 Day 2
Build PathGenerator.ts (Claude Code): random walk, backtrack, quality constraints	PENDING	S1 Day 3
Pre-generate levels: 200 Classic levels (4x4 to 9x9), 50 Flash levels, 50 Mirror levels	PENDING	S1 Day 4
QA generated levels: visually inspect 20 per grid size — reject straight-line paths	PENDING	S1 Day 4
Build dot traversal animation: Phaser tween moves dot cell-by-cell along path	PENDING	S1 Day 5
Build trail alpha decay: trail fades behind moving dot, full fade on reach End	PENDING	S1 Day 5
Sprint 2 — Week 2: Draw System + Accuracy
Build Phaser drag-draw input: touchmove registers cell contacts, validates adjacency	PENDING	S2
Render player draw path in amber as finger moves	PENDING	S2
Build AccuracyValidator.ts (Claude Code): compare player path vs correct path cell by cell	PENDING	S2
Add haptic pulse on each correctly drawn cell (reuse @capacitor/haptics from L4)	PENDING	S2
Add visual feedback: correct cell amber glow, incorrect cell red flash	PENDING	S2
Test drag input on physical device: verify no false cell registrations at cell edges	PENDING	S2 CRITICAL
Sprint 3 — Week 3: All Modes + UI
Build Flash Mode: dot traversal compressed to 1.5s regardless of path length	PENDING	S3
Build Mirror Mode + MirrorTransformer.ts: horizontal/vertical flip of path	PENDING	S3
Build Two-Path Mode: two dots, two paths, two colours (locked at Level 30)	PENDING	S3
Build Daily Echo: seeded path via Supabase, one attempt per day	PENDING	S3
Build Zen Mode: slow dot, no accuracy pressure, generative ambient music	PENDING	S3
Build Progress Tracker React screen: accuracy graph, longest path, perfect trails count	PENDING	S3
Apply deep teal/amber Tailwind theme	PENDING	S3
Build Memory Pack Gallery: 100 expert level pack preview (Rs.49 IAP)	PENDING	S3
Sprint 4 — Week 4: Monetisation
Rewarded ad: Replay Trail — shows dot traversal again at 70% speed	PENDING	S4
Interstitial: after result screen, 1 per 4 min cap	PENDING	S4
IAP: Remove Ads (Rs.99) + Memory Pack — 100 expert levels (Rs.49)	PENDING	S4
Add More from Gazetica: all 4 previous games shown as cards	PENDING	S4
Firebase events: path_complete (accuracy, path_length, mode), perfect_trail, daily_echo	PENDING	S4
Add shared Gazetica streak write to gazetica_streaks Supabase table on every session	PENDING	S4
Sprints 5-6 — QA + Portfolio Completion
CRITICAL: recruit 5 non-gamer adults — watch them play levels 1-10. If accuracy <60% on Level 5, reduce path length.	PENDING	S5
Test drag input on 3 different screen sizes — small phone, regular phone, large phone	PENDING	S5
Verify accuracy tracking Firebase data matches expected values (test with known path)	PENDING	S5
Verify Replay Trail rewarded ad plays and dot re-traverses correctly after ad	PENDING	S5
Generate signed AAB, back up keystore	PENDING	S5-6
Play Store screenshots MUST show both show phase and draw phase	PENDING	S6
Submit to Play Store	PENDING	S6
PORTFOLIO MILESTONE: All 5 Gazetica light games now live on Google Play	PENDING	Dec 2026
Update ALL 5 games More from Gazetica panels to show complete portfolio	PENDING	Dec 2026
Activate gazetica_streaks shared cross-game system across all 5 apps	PENDING	Dec 2026
Review all 5 games: retention data, revenue data, Play Store ratings	PENDING	Jan 2027
Begin Phase 2 planning: Unity environment setup, Gravity Sort Sprint 1	PENDING	Jan 2027

 
13. Portfolio-Level Success Metrics
Track these metrics across all 5 games collectively, in addition to per-game KPIs defined in individual game reports. Review monthly once first game is live.

Portfolio KPI	Target (Month 12)	Measurement
Total downloads across all 5 games	50,000+	Play Console combined
Portfolio total monthly ad revenue	$1,500+	AdMob dashboard combined
Average Play Store rating across portfolio	4.2+ stars	Play Console all apps
Cross-promotion install rate (game-to-game)	>=5% of DAU per game	Firebase referral events
Gazetica developer page monthly visitors	1,000+ organic	Google Play Console insights
Combined monthly active users (MAU)	10,000+	Firebase combined
Games with Remove Ads IAP conversion >1%	3 of 5 games	Google Play Console IAP data
Phase 2 readiness	Hardware + Unity ready	Internal milestone Jan 2027

Gazetica  |  gazetica.com  |  Voraky Retail LLP  |  Light Plan — 5 Games  |  Build Great Games
