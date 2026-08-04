import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color as colors, space } from '@/theme';
import { haptics } from '@/lib/haptics';

type RatingStarsProps = {
  value: number | null;
  onChange: (n: number) => void;
  count?: number;
  size?: number;
};

export function RatingStars({ value, onChange, count = 5, size = 40 }: RatingStarsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const on = value != null && n <= value;
        return (
          <Pressable
            key={n}
            hitSlop={6}
            onPress={() => {
              haptics.selection();
              onChange(n);
            }}
          >
            <Ionicons
              name={on ? 'star' : 'star-outline'}
              size={size}
              color={on ? colors.star : colors.borderInput}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
