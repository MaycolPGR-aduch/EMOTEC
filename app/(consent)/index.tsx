import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { traducirError } from '@/lib/auth-errors';

type ConsentDoc = {
  id: string;
  version: string;
  title: string;
  body_md: string;
};

export default function Consentimiento() {
  const { acceptConsent, signOut } = useSession();
  const [doc, setDoc] = useState<ConsentDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Documento vigente. consent_documents es legible por cualquier autenticado,
    // asi que puede leerse ANTES de consentir (no esta tras la puerta).
    supabase
      .from('consent_documents')
      .select('id, version, title, body_md')
      .eq('is_current', true)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) setError('No se pudo cargar el consentimiento. Revisa tu conexion.');
        else setDoc(data as ConsentDoc);
        setLoadingDoc(false);
      });
  }, []);

  async function onAccept() {
    if (!doc || !checked) return;
    setSubmitting(true);
    setError(null);
    const res = await acceptConsent(doc.id);
    setSubmitting(false);
    if (res.error) setError(traducirError(res.error));
    // Si acepta bien, hasConsent pasa a true y el layout redirige a (app) solo.
  }

  if (loadingDoc) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{doc?.title ?? 'Consentimiento informado'}</Text>
        {doc?.version && <Text style={styles.version}>Version {doc.version}</Text>}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Markdown text={doc?.body_md ?? ''} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.checkboxRow} onPress={() => setChecked((c) => !c)}>
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Declaro ser mayor de 18 anos y acepto estos terminos.
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!checked || submitting) && styles.buttonDisabled]}
          onPress={onAccept}
          disabled={!checked || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Aceptar y continuar</Text>
          )}
        </Pressable>

        <Pressable onPress={signOut} disabled={submitting}>
          <Text style={styles.declineText}>Ahora no, cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Render minimo de markdown: encabezados (#, ##), negritas (**), vinetas (-).
// Suficiente para el texto de consentimiento; no arrastramos una libreria.
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.replace(/\*\*/g, '');
        if (line.startsWith('## ')) {
          return (
            <Text key={i} style={styles.h2}>
              {line.slice(3)}
            </Text>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <Text key={i} style={styles.h1}>
              {line.slice(2)}
            </Text>
          );
        }
        if (line.trim() === '') {
          return <View key={i} style={{ height: 8 }} />;
        }
        return (
          <Text key={i} style={styles.p}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#208AEF' },
  version: { fontSize: 12, color: '#999', marginTop: 2 },
  body: { flex: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  bodyContent: { paddingHorizontal: 24, paddingVertical: 16 },
  h1: { fontSize: 20, fontWeight: '700', color: '#222', marginTop: 8, marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 10, marginBottom: 2 },
  p: { fontSize: 15, color: '#444', lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8, gap: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#208AEF' },
  checkboxTick: { color: '#fff', fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#333' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  declineText: { textAlign: 'center', color: '#888', fontSize: 14, paddingVertical: 4 },
  error: { color: '#c0392b', fontSize: 14 },
});
