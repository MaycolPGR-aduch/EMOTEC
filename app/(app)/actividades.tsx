import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

const ACTIVITIES = [
  {
    href: '/termometro' as const,
    emoji: '🌡️',
    title: 'Termometro emocional',
    desc: 'Registra rapido que tan intenso te sientes ahora.',
  },
  {
    href: '/rueda' as const,
    emoji: '🎡',
    title: 'Rueda de emociones',
    desc: 'Pon nombre a lo que sientes y su contexto.',
  },
  {
    href: '/respiracion' as const,
    emoji: '🫁',
    title: 'Respiracion guiada',
    desc: 'Una pausa breve para regularte.',
  },
];

export default function Actividades() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {ACTIVITIES.map((a) => (
          <Link key={a.href} href={a.href} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.emoji}>{a.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.cardDesc}>{a.desc}</Text>
              </View>
            </Pressable>
          </Link>
        ))}
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
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  emoji: { fontSize: 32 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 2 },
});
