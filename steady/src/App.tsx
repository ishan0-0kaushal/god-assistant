import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Native, { Permissions as Perms } from '../modules/steady-native';
import { c } from './theme';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import Limits from './screens/Limits';
import Focus from './screens/Focus';
import Disable from './screens/Disable';
import Permissions from './screens/Permissions';

type Screen = 'perms' | 'onboard' | 'today' | 'limits' | 'focus' | 'disable';

export default function App() {
  const [state, setState] = useState(() => Native.getState());
  const [perms, setPerms] = useState<Perms>(() => Native.getPermissions());
  const [screen, setScreen] = useState<Screen>(() =>
    !(perms.usage && perms.overlay) ? 'perms' : Object.keys(state.limits).length ? 'today' : 'onboard'
  );

  const refresh = useCallback(() => {
    const next = Native.getState();
    // Re-start the service if Android killed it (e.g. after a force-stop).
    if (next.enabled) Native.setEnabled(true);
    setState(next);
    setPerms(Native.getPermissions());
  }, []);

  useEffect(refresh, [refresh]);

  // Permissions are granted in system Settings; re-read whenever we come back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  // steady://focus — from the block screen's "Start a focus" / "Back to focus".
  useEffect(() => {
    const open = (url: string | null) => url?.startsWith('steady://focus') && setScreen('focus');
    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);

  const home = () => setScreen('today');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" />
        {screen === 'perms' && (
          <Permissions perms={perms} onDone={() => setScreen(Object.keys(state.limits).length ? 'today' : 'onboard')} />
        )}
        {screen === 'onboard' && <Onboarding onDone={() => (refresh(), home())} />}
        {screen === 'today' && (
          <Today
            state={state}
            perms={perms}
            onChange={refresh}
            onLimits={() => setScreen('limits')}
            onFocus={() => setScreen('focus')}
            onPerms={() => setScreen('perms')}
            onDisable={() => setScreen('disable')}
          />
        )}
        {screen === 'limits' && <Limits state={state} onChange={refresh} onBack={home} />}
        {screen === 'focus' && <Focus state={state} onChange={refresh} onBack={home} />}
        {screen === 'disable' && <Disable onDone={() => (refresh(), home())} onBack={home} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg } });
