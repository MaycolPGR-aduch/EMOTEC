import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { color as colors, space } from '@/theme';
import { AppText } from './Text';
import { Icon } from './Icon';

type SupportLinkProps = {
  label?: string;
  align?: 'left' | 'center';
};

// "Buscar apoyo" -> /ayuda. Siempre accesible; reemplaza las copias sueltas.
export function SupportLink({ label = 'Buscar apoyo', align = 'center' }: SupportLinkProps) {
  return (
    <Link href="/ayuda" asChild>
      <Pressable>
        <View style={[styles.row, align === 'center' && styles.center]}>
          <Icon name="support" size={16} color={colors.brand} />
          <AppText variant="body" weight="semibold" color={colors.brand}>
            {label}
          </AppText>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  center: { justifyContent: 'center' },
});
