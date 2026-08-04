import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { color as colors, radius, space } from '@/theme';
import { AppText } from './Text';
import { Icon, type IconName } from './Icon';

type ActivityCardProps = {
  href: Href;
  icon: IconName;
  title: string;
  description: string;
};

// Tarjeta de actividad del hub: icono en circulo + titulo + descripcion.
export function ActivityCard({ href, icon, title, description }: ActivityCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={24} color={colors.brand} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong" color={colors.textStrong}>
            {title}
          </AppText>
          <AppText variant="small" color={colors.textMuted}>
            {description}
          </AppText>
        </View>
        <Icon name="chevron" size={20} color={colors.textFaint} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.9 },
});
