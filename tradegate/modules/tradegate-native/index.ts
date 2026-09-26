import { requireNativeModule } from 'expo';

export type InstalledApp = { packageName: string; label: string; icon: string | null };
export type Permissions = { usage: boolean; overlay: boolean; battery: boolean };

type TradegateNative = {
  getState(): { armed: boolean; guarded: string[] };
  setArmed(armed: boolean): void;
  setGuarded(packages: string[]): void;
  getInstalledApps(): Promise<InstalledApp[]>;
  getPermissions(): Permissions;
  openUsageSettings(): void;
  openOverlaySettings(): void;
  requestBatteryExemption(): void;
  completeGate(packageName: string): void;
};

export default requireNativeModule<TradegateNative>('TradegateNative');
