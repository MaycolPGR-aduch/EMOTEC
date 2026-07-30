import { supabase } from './supabase';
import { todayStr } from './checkins';

export type ScenarioOption = {
  id: string;
  text: string;
  coping_style: string;
  reflexion: string;
};

export type Scenario = {
  code: string;
  category: string;
  title: string;
  prompt: string;
  options: ScenarioOption[];
};

export async function getScenarios(): Promise<Scenario[]> {
  const { data } = await supabase
    .from('scenario_catalog')
    .select('code, category, title, prompt, options')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data as Scenario[]) ?? [];
}

// Registra la eleccion del estudiante. El dato es coping_style (preferencia de
// afrontamiento); es privado (el tutor no tiene acceso a scenario_responses).
export async function saveScenarioResponse(
  userId: string,
  scenarioCode: string,
  option: ScenarioOption,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('scenario_responses').insert({
    student_id: userId,
    scenario_code: scenarioCode,
    option_id: option.id,
    coping_style: option.coping_style,
    local_date: todayStr(),
  });
  return { error: error?.message ?? null };
}
