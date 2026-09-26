import { useCallback, useEffect, useState } from 'react';
import { AppState, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Native, { Permissions as Perms } from '../modules/tradegate-native';
import { c } from './theme';
import Home from './screens/Home';
import Apps from './screens/Apps';
import Permissions from './screens/Permissions';

type Screen = 'home' | 'apps' | 'perms';

export default function App() {
  const [state, setState] = useState(() => Native.getState());
  const [perms, setPerms] = useState<Perms>(() => Native.getPermissions());
  const [status, setStatus] = useState(() => Native.getStatus());
  // Onboarding shows first until the two required permissions are granted.
  const [screen, setScreen] = useState<Screen>(() => (perms.usage && perms.overlay ? 'home' : 'perms'));

  const refresh = useCallback(() => {
    const next = Native.getState();
    // Re-start the service if Android killed it (e.g. after a force-stop).
    if (next.armed) Native.setArmed(true);
    setState(next);
    setPerms(Native.getPermissions());
  }, []);

  useEffect(refresh, [refresh]);

  // Diagnostics: shows whether the background service is alive and what it last saw.
  useEffect(() => {
    const id = setInterval(() => setStatus(Native.getStatus()), 2000);
    return () => clearInterval(id);
  }, []);

  // Permissions are granted in system Settings; re-read whenever we come back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const ready = perms.usage && perms.overlay;

  const toggle = () => {
    if (state.armed) {
      Native.setArmed(false);
    } else if (!ready) {
      return setScreen('perms');
    } else if (!state.guarded.length) {
      return setScreen('apps');
    } else {
      Native.setArmed(true);
    }
    refresh();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" />
        {screen === 'home' && (
          <Home
            armed={state.armed}
            count={state.guarded.length}
          status={status}
            onToggle={toggle}
            onApps={() => setScreen('apps')}
          />
        )}
        {screen === 'apps' && (
          <Apps
            guarded={state.guarded}
            onChange={(pkgs) => {
              Native.setGuarded(pkgs);
              refresh();
            }}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'perms' && <Permissions perms={perms} onDone={() => setScreen('home')} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg } });
