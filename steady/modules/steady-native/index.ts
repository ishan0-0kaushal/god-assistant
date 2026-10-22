import { requireNativeModule } from 'expo';
import type { Limits, Pending } from '../../src/limits';

export type InstalledApp = { packageName: string; label: string; icon: string | null };
export type Permissions = { usage: boolean; overlay: boolean; battery: boolean };
export type Usage = { perApp: Record<string, number>; totalMs: number; pickups: number };
export type Extension = { ts: number; pkg: string; reason: string };
export type Session = { start: number; end: number; completed: boolean };

export type State = {
  enabled: boolean;
  why: string;
  limits: Limits;
  pending: Pending[];
  extensionsToday: Record<string, number>;
  focusStart: number;
  focusEnd: number;
  focusStrict: boolean;
};

type Raw = {
  getState(): Omit<State, 'limits' | 'pending' | 'extensionsToday'> & {
    limits: string;
    pending: string;
    extensionsToday: string;
  };
  getLog(): { extensions: string; sessions: string };
  setEnabled(on: boolean): void;
  setWhy(why: string): void;
  setLimits(limitsJson: string, pendingJson: string): void;
  startFocus(minutes: number, strict: boolean): void;
  endFocus(): void;
  getUsage(fromMs: number, toMs: number): Promise<Usage>;
  getInstalledApps(): Promise<InstalledApp[]>;
  getStatus(): { running: boolean; lastSeen: string | null };
  getPermissions(): Permissions;
  openUsageSettings(): void;
  openOverlaySettings(): void;
  requestBatteryExemption(): void;
  grantExtension(packageName: string, reason: string): void;
  closeGate(): void;
};

const raw = requireNativeModule<Raw>('SteadyNative');

// Native stores lists/maps as JSON; parse them once here so the rest of the app sees plain objects.
// Methods are forwarded one by one: native module objects aren't safe to spread.
export default {
  setEnabled: (on: boolean) => raw.setEnabled(on),
  setWhy: (why: string) => raw.setWhy(why),
  startFocus: (minutes: number, strict: boolean) => raw.startFocus(minutes, strict),
  endFocus: () => raw.endFocus(),
  getUsage: (fromMs: number, toMs: number) => raw.getUsage(fromMs, toMs),
  getInstalledApps: () => raw.getInstalledApps(),
  getStatus: () => raw.getStatus(),
  getPermissions: () => raw.getPermissions(),
  openUsageSettings: () => raw.openUsageSettings(),
  openOverlaySettings: () => raw.openOverlaySettings(),
  requestBatteryExemption: () => raw.requestBatteryExemption(),
  grantExtension: (pkg: string, reason: string) => raw.grantExtension(pkg, reason),
  closeGate: () => raw.closeGate(),
  getState(): State {
    const s = raw.getState();
    return {
      ...s,
      limits: JSON.parse(s.limits),
      pending: JSON.parse(s.pending),
      extensionsToday: JSON.parse(s.extensionsToday),
    };
  },
  getLog(): { extensions: Extension[]; sessions: Session[] } {
    const l = raw.getLog();
    return { extensions: JSON.parse(l.extensions), sessions: JSON.parse(l.sessions) };
  },
  setLimits(limits: Limits, pending: Pending[]) {
    raw.setLimits(JSON.stringify(limits), JSON.stringify(pending));
  },
};
