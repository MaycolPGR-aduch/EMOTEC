import { supabase } from './supabase';

// Catalogos leidos de la base con cache en memoria por sesion de app.
//
// Antes habia listas hardcodeadas DUPLICADAS (CONTEXTS en lib/activities.ts y
// otra copia en components/ui/ContextPicker.tsx, con riesgo de deriva; y
// PRIMARY_EMOTIONS con labels que se guardaban tal cual). Ahora las cadenas
// vienen de la base, que es la misma fuente que valida las FK: si el catalogo
// cambia, la app lo refleja sin desplegar.
//
// Ver docs/contrato-datos.md.

export type LifeArea = { code: string; label: string };
export type Emotion = {
  code: string;
  label: string;
  valence: 'agradable' | 'desagradable' | 'neutra';
  parent_code: string | null;
};

let lifeAreasCache: LifeArea[] | null = null;
let emotionsCache: Emotion[] | null = null;

export async function getLifeAreas(): Promise<LifeArea[]> {
  if (lifeAreasCache) return lifeAreasCache;
  const { data } = await supabase
    .from('life_area_catalog')
    .select('code, label')
    .order('sort_order', { ascending: true });
  lifeAreasCache = (data as LifeArea[]) ?? [];
  return lifeAreasCache;
}

export async function getEmotions(): Promise<Emotion[]> {
  if (emotionsCache) return emotionsCache;
  const { data } = await supabase
    .from('emotion_catalog')
    .select('code, label, valence, parent_code')
    .order('sort_order', { ascending: true });
  emotionsCache = (data as Emotion[]) ?? [];
  return emotionsCache;
}

export async function getPrimaryEmotions(): Promise<Emotion[]> {
  return (await getEmotions()).filter((e) => e.parent_code === null);
}

export async function getSecondaryEmotions(parentCode: string): Promise<Emotion[]> {
  return (await getEmotions()).filter((e) => e.parent_code === parentCode);
}
