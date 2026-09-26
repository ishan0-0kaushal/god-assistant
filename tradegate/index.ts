import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './src/App';
import Gate from './src/gate/Gate';

registerRootComponent(App);
// Rendered by the native GateActivity when a guarded app is opened while armed.
AppRegistry.registerComponent('Gate', () => Gate);
