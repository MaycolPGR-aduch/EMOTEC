import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { AppText, Button, Card, ScreenHeader } from '@/components/ui';
import { color, space } from '@/theme';

type Recurso = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  url: string | null;
  is_emergency: boolean;
};

export default function Ayuda() {
  const [items, setItems] = useState<Recurso[] | null>(null);

  useEffect(() => {
    // help_resources es legible incluso por anon: esta pantalla funciona sin sesion.
    supabase
      .from('help_resources')
      .select('id, name, description, phone, whatsapp, url, is_emergency')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setItems((data as Recurso[]) ?? []));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Buscar apoyo" />
      <View style={styles.content}>
        <AppText variant="body" color={color.textDefault}>
          Si estas pasando por un momento dificil, hablar con alguien ayuda. Estas lineas son
          gratuitas, atienden las 24 horas y puedes llamar de forma anonima.
        </AppText>

        {items === null ? (
          <ActivityIndicator style={styles.spin} color={color.brand} />
        ) : (
          items.map((r) => (
            <Card key={r.id} variant={r.is_emergency ? 'brandSubtle' : 'plain'} style={styles.card}>
              <AppText variant="bodyStrong" color={color.textStrong}>
                {r.name}
              </AppText>
              {r.description && (
                <AppText variant="body" color={color.textSecondary}>
                  {r.description}
                </AppText>
              )}
              <View style={styles.actions}>
                {r.phone && (
                  <Button
                    title={`Llamar ${r.phone}`}
                    size="md"
                    onPress={() => Linking.openURL(`tel:${r.phone}`)}
                  />
                )}
                {r.whatsapp && (
                  <Button
                    title="WhatsApp"
                    variant="secondary"
                    size="md"
                    onPress={() => Linking.openURL(`https://wa.me/51${r.whatsapp}`)}
                  />
                )}
              </View>
            </Card>
          ))
        )}

        <AppText variant="caption" color={color.textFaint} align="center">
          EMOTEC no reemplaza la atencion de un profesional ni los servicios de emergencia.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.lg, gap: space.md },
  spin: { marginTop: space.xxl },
  card: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs },
});
