import { Image, View } from 'react-native';
import { c } from '../theme';

export default function AppIcon({ icon, size = 36 }: { icon?: string | null; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 4 };
  return icon ? (
    <Image source={{ uri: `data:image/png;base64,${icon}` }} style={style} />
  ) : (
    <View style={[style, { backgroundColor: c.surface }]} />
  );
}
