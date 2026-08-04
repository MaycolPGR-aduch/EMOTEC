import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Wrapper de expo-haptics. Cada metodo va en try/catch y guardado por plataforma
// (haptics no existe en web y puede no estar disponible en algunos dispositivos).
// Falla en silencio: un haptic es un extra, nunca debe romper una interaccion.

function safe(fn: () => Promise<unknown>) {
  if (Platform.OS === 'web') return;
  try {
    void fn();
  } catch {
    // ignorar: el haptic es opcional
  }
}

export const haptics = {
  selection() {
    safe(() => Haptics.selectionAsync());
  },
  impact(weight: 'light' | 'medium' | 'heavy' = 'light') {
    const style =
      weight === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : weight === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    safe(() => Haptics.impactAsync(style));
  },
  success() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
