import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/theme';
import { getLifeAreas, type LifeArea } from '@/lib/catalogs';
import { Chip } from './Chip';

type LifeAreaPickerProps = {
  value: string | null;
  onChange: (code: string | null) => void;
  /** Si es false, tocar el chip activo no lo deselecciona (campo obligatorio). */
  clearable?: boolean;
};

// Selector de area de vida. Las opciones vienen del catalogo de la BASE
// (life_area_catalog), que es la misma fuente que valida la FK: si el catalogo
// cambia, la app lo refleja sin desplegar. Antes habia dos listas hardcodeadas
// duplicadas con valores que ni siquiera cruzaban entre tablas.
export function LifeAreaPicker({ value, onChange, clearable = true }: LifeAreaPickerProps) {
  const [areas, setAreas] = useState<LifeArea[]>([]);

  useEffect(() => {
    getLifeAreas().then(setAreas);
  }, []);

  return (
    <View style={styles.wrap}>
      {areas.map((a) => (
        <Chip
          key={a.code}
          label={a.label}
          selected={value === a.code}
          onPress={() => onChange(clearable && value === a.code ? null : a.code)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
