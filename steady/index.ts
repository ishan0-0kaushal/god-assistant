import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './src/App';
import Extend from './src/gate/Extend';

registerRootComponent(App);
// Rendered by the native GateActivity when "I need it for something specific" is tapped.
AppRegistry.registerComponent('Extend', () => Extend);
