import { useCallback, useEffect, useState } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import Native, { Permissions as Perms } from '../modules/tradegate-native';
import { c } from './theme';
import Home from './screens/Home';
import Apps from './screens/Apps';
import Permissions from './screens/Permissions';

type Screen = 'home' | 'apps' | 'perms';

export default function App() {
  const [state, setState] = useState(Native.getState);
  const [perms, setPerms] = useState<Perms>(Native.getPermissions);
  // Onboarding shows first until the two required permissions are granted.
  const [screen, setScreen] = useState<Screen>(() => (perms.usage && perms.overlay ? 'home' : 'perms'));

  const refresh = useCallback(() => {
    setState(Native.getState());
    setPerms(Native.getPermissions());
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
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={c.bg} />
      {screen === 'home' && (
        <Home
          armed={state.armed}
          count={state.guarded.length}
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
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg } });
