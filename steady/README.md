# Steady

Daily screen-time limits for Android that actually hold. When an app's time for the day runs out, Steady covers it with a calm full-screen block screen. Getting more time costs friction that grows each time, and loosening a rule only takes effect at midnight. Everything stays on the phone: no account, no server, no analytics.

## Run

```bash
npm install
npx expo run:android      # dev client build on a USB device (needs Android SDK)
npm test                  # limit rules + typed-reason rules
```

CI (`.github/workflows/steady-apk.yml`) builds an installable release APK on every push that touches `steady/`.

## What it does

- **Daily limits per app.** Onboarding suggests 70% of your own 7-day average for each app you pick.
- **Warnings** at 5 and 1 minute left.
- **Block screen** when time runs out, shown as a native overlay. It shows the app, how long you used it, the time until midnight, **your own "why"** (written at onboarding), and today's screen time expressed in Pomodoros. **Close app** is the big button. "I need it for something specific" is small grey text.
- **Extension ladder:**
  - 1st: 30s breathing plus one typed reason, for 5 minutes.
  - 2nd: a 2-minute wait plus two typed lines, for 5 minutes.
  - No 3rd.

  Reasons can't be pasted and are shown back on the Today screen ("Your reasons this week").
- **Loosening waits until midnight.** Raising or removing a limit is queued; lowering or adding applies now.
- **Focus sessions** (25/50/90 min) block every limited app while the timer runs. In strict mode (on by default from 50 min), ending early takes a typed reason plus a 5-minute wait.
- **Turning Steady off** takes a typed reason plus a 10-minute wait. Leaving the screen restarts the wait.
- **Tamper awareness.** If usage access or the overlay permission is revoked, a "Protection is off" notification appears, along with a banner in the app.

## How it works

- `modules/steady-native` is a local Expo module written in Kotlin.
  - `GuardService`: a foreground service. It polls `UsageStatsManager` every 400ms, keeps today's per-app tally, sends warnings, and shows the block screen.
  - `UsageTally`: per-app foreground time built from usage events. An app is "in front" from `ACTIVITY_RESUMED` until another app resumes or the screen turns off or locks. Time before midnight is never credited.
  - `BlockScreen`: the overlay. It is native, so it appears without JS and covers the app for as long as the app stays in front.
  - `GateActivity`: hosts the JS `Extend` flow (`src/gate/Extend.tsx`). It is excluded from recents, back does nothing, and leaving it destroys any progress.
  - `Prefs`: SharedPreferences holding limits, pending changes, extensions, and focus sessions. The service and the boot receiver read it with no JS running.
- `src/limits.ts` holds the pure rules: suggested limits, tighten-vs-loosen, the extension ladder, and the limit state machine. `src/rules.ts` holds the typed-reason rules.

## Limits worth knowing

On a phone without device-admin, anyone can force-stop or uninstall the app. Steady makes breaking your own rules slow and visible. It does not make it impossible.

## Device test checklist

- [ ] 2-min limit on an app: both warnings fire, and the block screen appears within ~1s of 0
- [ ] "Close app" goes home; reopening the app shows the block screen again straight away
- [ ] Block screen can't be escaped via back or recents
- [ ] Extension 1 gives 5 min; extension 2 needs the 2-min wait; extension 3 isn't offered
- [ ] Raising a limit shows "from midnight"; lowering applies at once; Cancel undoes a queued change
- [ ] Focus session: limited apps blocked even with time left; strict end needs reason + 5-min wait
- [ ] Revoke usage access → "Protection is off" notification + banner
- [ ] Reboot → limits still enforced; midnight → apps unblock
- [ ] Today's total roughly matches Digital Wellbeing
