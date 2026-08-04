import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color as colors, space } from '@/theme';
import { ScreenHeader } from './ScreenHeader';

type Background = 'canvas' | 'surface' | 'immersive';

type ScreenProps = {
  header?: { title: string; subtitle?: string; onClose?: () => void; showClose?: boolean; right?: React.ReactNode };
  scroll?: boolean;
  loading?: boolean;
  keyboardAvoiding?: boolean;
  background?: Background;
  center?: boolean; // centra el contenido (wizards)
  footer?: React.ReactNode; // fijo abajo (p.ej. SupportLink)
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const BG: Record<Background, string> = {
  canvas: colors.canvas,
  surface: colors.surface,
  immersive: colors.immersive.bg,
};

// Envoltorio de pantalla: SafeArea + header opcional + carga + scroll +
// teclado + fondo. Quita el boilerplate repetido en ~8 pantallas.
export function Screen({
  header,
  scroll = false,
  loading = false,
  keyboardAvoiding = false,
  background = 'surface',
  center = false,
  footer,
  contentContainerStyle,
  children,
}: ScreenProps) {
  const bg = { flex: 1, backgroundColor: BG[background] };

  if (loading) {
    return (
      <SafeAreaView style={[bg, styles.center]}>
        <ActivityIndicator color={background === 'immersive' ? colors.immersive.textSecondary : colors.brand} />
      </SafeAreaView>
    );
  }

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, center && styles.centerContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.plainContent, center && styles.centerContent, contentContainerStyle]}>
      {children}
    </View>
  );

  const inner = (
    <>
      {header && <ScreenHeader {...header} />}
      {body}
      {footer}
    </>
  );

  return (
    <SafeAreaView style={bg}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: space.lg, gap: space.md, flexGrow: 1 },
  plainContent: { flex: 1, padding: space.lg, gap: space.md },
  centerContent: { justifyContent: 'center' },
});
