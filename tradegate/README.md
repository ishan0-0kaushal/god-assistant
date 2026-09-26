# TradeGate

Personal anti-overtrading kill switch for Android. When armed, opening any guarded app forces a 3-step gate: 30s breathing → 20 squats → a typed (not pasted) 2-line reflection. Disarm only from inside TradeGate.

## Run

```bash
npm install
npx expo run:android      # dev client build on a USB device (needs Android SDK)
npx eas-cli@latest build -p android --profile preview   # cloud-built installable APK
npm test                  # gate rules (paste diff + reflection quality)
```

## How it works

- `modules/tradegate-native` — local Expo module (Kotlin)
  - `GuardService` — foreground service, polls `UsageStatsManager` every 400ms while armed.
  - `GateActivity` — full-screen activity rendering the JS `Gate` component. Own task, excluded from recents, `noHistory` (leaving it destroys progress), back is swallowed.
  - `SYSTEM_ALERT_WINDOW` is what lets the service start the gate from the background.
  - State (armed + guarded list) lives in native SharedPreferences instead of AsyncStorage: the service and boot receiver must read it with no JS running, and one store means nothing to keep in sync.
- `src/gate` — the 3 steps. `rules.ts` holds the pure logic.

Why an activity instead of a raw `TYPE_APPLICATION_OVERLAY` view: RN pauses JS timers when its host activity is backgrounded (breaking the 30s timer), and IME/text input inside a service-owned window is unreliable. A real activity avoids both and is enforced the same way: if you escape it, the service re-launches a fresh gate within ~1.5s as long as the guarded app is in front.

## Paste blocking (3 layers)

1. `contextMenuHidden` — RN removes both the selection and insertion action modes on Android, so long-press has no Paste.
2. `keyboardType="visible-password"` + autocorrect/autofill off — kills Gboard's suggestion strip and clipboard chip.
3. `isTypedEdit` — every change is diffed (common prefix/suffix); any insert > 2 chars is rejected, the native text is reverted, and "Typing only — no pasting" is shown. Catches IME clipboard commits, hardware Ctrl+V, drag-and-drop, paste-over-selection.

## Device test checklist

- [ ] Paste: long-press field (empty and with text), double-tap word → no Paste option
- [ ] Paste: Gboard clipboard icon/chip → rejected with "Typing only — no pasting"
- [ ] Paste: select text and paste over it; Ctrl+V on a BT keyboard → rejected
- [ ] Back button / back gesture on each step → nothing
- [ ] Home during step 2, reopen guarded app → starts again at step 1
- [ ] Recents → switch straight to the guarded app → gate reappears
- [ ] After "Open X" → app usable; go home, reopen → gated again
- [ ] Disarm in TradeGate → guarded apps open freely; reboot while armed → still armed

Notes: in a dev-client build, if the process was cold-started by the service, the gate may need Metro connected. Release builds (`npx expo run:android --variant release`) don't have this issue.
