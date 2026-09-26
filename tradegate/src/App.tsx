import { useCallback, useEffect, useState } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import Native, { Permissions as Perms } from '../modules/tradegate-native';
import { c } from './theme';
import Home from './screens/Home';
import Apps from './screens/Apps';
import Permissions from './screens/Permissions';

type Screen = 'home' | 'apps' | 'perms';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [state, setState] = useState(Native.getState);
  const [perms, setPerms] = useState<Perms>(Native.getPermissions);

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
          needsPerms={!ready || !perms.battery}
          onToggle={toggle}
          onApps={() => setScreen('apps')}
          onPerms={() => setScreen('perms')}
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
      {screen === 'perms' && <Permissions perms={perms} onBack={() => setScreen('home')} />}
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg } });
