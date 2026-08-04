import { StyleSheet, View } from 'react-native';
import { space } from '@/theme';
import { Chip } from './Chip';

const CONTEXTS: { key: string; label: string }[] = [
  { key: 'academico', label: 'Academico' },
  { key: 'social', label: 'Social' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'salud', label: 'Salud' },
  { key: 'otro', label: 'Otro' },
];

type ContextPickerProps = {
  value: string | null;
  onChange: (key: string | null) => void;
};

// Selector de contexto (catalogo cerrado), ahora sobre <Chip>. Permite
// deseleccionar tocando el chip activo.
export function ContextPicker({ value, onChange }: ContextPickerProps) {
  return (
    <View style={styles.wrap}>
      {CONTEXTS.map((c) => (
        <Chip
          key={c.key}
          label={c.label}
          selected={value === c.key}
          onPress={() => onChange(value === c.key ? null : c.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
