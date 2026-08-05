import { supabase } from './supabase';

export type SceneEmotion = { id: string; label: string; plausible: boolean };
export type SceneSignal = { id: string; text: string };
export type SceneResponse = { id: string; text: string; best: boolean; reflexion: string };

export type EmotionScene = {
  code: string;
  category: string;
  title: string;
  scene: string;
  content: {
    emotions: SceneEmotion[];
    signals: SceneSignal[];
    responses: SceneResponse[];
    explanation: string;
  };
};

export async function getEmotionScenes(): Promise<EmotionScene[]> {
  const { data } = await supabase
    .from('emotion_scene_catalog')
    .select('code, category, title, scene, content')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data as EmotionScene[]) ?? [];
}

// Registra la eleccion (privada, sin acceso del tutor). Best-effort desde la UI.
export async function saveSceneResponse(
  userId: string,
  sceneCode: string,
  chosenEmotions: string[],
  chosenSignals: string[],
  chosenResponseId: string,
  sessionId: string | null = null,
): Promise<{ error: string | null }> {
  // chose_best / plausible_hits los calcula un TRIGGER desde el catalogo (0030):
  // el cliente no debe poder decidir si acerto (seria falsificable).
  const { error } = await supabase.from('emotion_scene_responses').insert({
    student_id: userId,
    scene_code: sceneCode,
    chosen_emotions: chosenEmotions,
    chosen_signals: chosenSignals,
    chosen_response_id: chosenResponseId,
    session_id: sessionId,
  });
  return { error: error?.message ?? null };
}
