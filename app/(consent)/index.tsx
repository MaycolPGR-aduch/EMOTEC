import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { traducirError } from '@/lib/auth-errors';
import { AppText, Button, Icon } from '@/components/ui';
import { color, radius, space } from '@/theme';

type ConsentDoc = { id: string; version: string; title: string; body_md: string };

export default function Consentimiento() {
  const { acceptConsent, signOut } = useSession();
  const [doc, setDoc] = useState<ConsentDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }

  if (loadingDoc) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText variant="body" color={color.textMuted}>
            Cargando...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.head}>
        <AppText variant="h1" color={color.brand}>
          {doc?.title ?? 'Consentimiento informado'}
        </AppText>
        {doc?.version && (
          <AppText variant="caption" color={color.textFaint}>
            Version {doc.version}
          </AppText>
        )}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Markdown text={doc?.body_md ?? ''} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.checkboxRow} onPress={() => setChecked((c) => !c)}>
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked && <Icon name="check" size={16} color={color.onBrand} />}
          </View>
          <AppText variant="small" color={color.textDefault} style={styles.checkboxLabel}>
            Declaro ser mayor de 18 anos y acepto estos terminos.
          </AppText>
        </Pressable>

        {error && (
          <AppText variant="body" color={color.danger}>
            {error}
          </AppText>
        )}

        <Button title="Aceptar y continuar" onPress={onAccept} loading={submitting} disabled={!checked} />
        <Button title="Ahora no, cerrar sesion" variant="ghost" onPress={signOut} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}

// Render minimo de markdown (encabezados y negritas): suficiente para el
// consentimiento, sin arrastrar una libreria.
function Markdown({ text }: { text: string }) {
  return (
    <View>
      {text.split('\n').map((raw, i) => {
        const line = raw.replace(/\*\*/g, '');
        if (line.startsWith('## '))
          return (
            <AppText key={i} variant="h3" color={color.textStrong} style={styles.mgTop}>
              {line.slice(3)}
            </AppText>
          );
        if (line.startsWith('# '))
          return (
            <AppText key={i} variant="h2" color={color.textStrong} style={styles.mgTop}>
              {line.slice(2)}
            </AppText>
          );
        if (line.trim() === '') return <View key={i} style={styles.mgGap} />;
        return (
          <AppText key={i} variant="body" color={color.textDefault}>
            {line}
          </AppText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { paddingHorizontal: space.xxl, paddingTop: space.sm, paddingBottom: space.md },
  body: { flex: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.border },
  bodyContent: { paddingHorizontal: space.xxl, paddingVertical: space.lg },
  mgTop: { marginTop: space.sm },
  mgGap: { height: space.sm },
  footer: { paddingHorizontal: space.xxl, paddingTop: space.md + 2, paddingBottom: space.sm, gap: space.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm - 2,
    borderWidth: 2,
    borderColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: color.brand },
  checkboxLabel: { flex: 1 },
});
