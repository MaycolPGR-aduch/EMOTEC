import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

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
      <View style={styles.header}>
        <Text style={styles.title}>Buscar apoyo</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Si estas pasando por un momento dificil, hablar con alguien ayuda. Estas lineas son
          gratuitas, atienden las 24 horas y puedes llamar de forma anonima.
        </Text>

        {items === null ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          items.map((r) => (
            <View key={r.id} style={[styles.card, r.is_emergency && styles.cardUrgent]}>
              <Text style={styles.name}>{r.name}</Text>
              {r.description && <Text style={styles.desc}>{r.description}</Text>}
              <View style={styles.actions}>
                {r.phone && (
                  <Pressable
                    style={styles.action}
                    onPress={() => Linking.openURL(`tel:${r.phone}`)}
                  >
                    <Text style={styles.actionText}>Llamar {r.phone}</Text>
                  </Pressable>
                )}
                {r.whatsapp && (
                  <Pressable
                    style={styles.actionAlt}
                    onPress={() => Linking.openURL(`https://wa.me/51${r.whatsapp}`)}
                  >
                    <Text style={styles.actionAltText}>WhatsApp</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}

        <Text style={styles.note}>
          EMOTEC no reemplaza la atencion de un profesional ni los servicios de emergencia.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  close: { color: '#888', fontSize: 15 },
  content: { padding: 16, gap: 12 },
  intro: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  cardUrgent: { borderColor: '#cfe3f7', backgroundColor: '#f5faff' },
  name: { fontSize: 16, fontWeight: '700', color: '#222' },
  desc: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  action: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  actionAlt: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  actionAltText: { color: '#208AEF', fontWeight: '600', fontSize: 15 },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', marginTop: 8 },
});
