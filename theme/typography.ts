// Escala tipografica. Consolida los ~17 fontSize sueltos a peldanos con nombre.
//
// Sobre la fuente de marca (Nunito): mientras @expo-google-fonts/nunito no este
// instalado (la red bloquea npm; se instala desde el hotspot), fontFamilyFor()
// devuelve undefined y la app usa la fuente del sistema con el peso indicado
// (los titulos igual se ven en negrita). Al instalar la fuente, basta cambiar
// FONT_ENABLED a true: AppText aplicara la familia Nunito. Cambio de un archivo.

const FONT_ENABLED = true; // Nunito instalada y cargada en app/_layout.tsx

export const fontFamily = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

export type Weight = 'light' | 'regular' | 'semibold' | 'bold';

const weightValue: Record<Weight, '300' | '400' | '600' | '700'> = {
  light: '300',
  regular: '400',
  semibold: '600',
  bold: '700',
};

// Familia a aplicar segun el peso (undefined = fuente del sistema por ahora).
export function fontFamilyFor(weight: Weight): string | undefined {
  if (!FONT_ENABLED) return undefined;
  if (weight === 'bold') return fontFamily.bold;
  if (weight === 'semibold') return fontFamily.semibold;
  return fontFamily.regular; // light y regular comparten el regular de Nunito
}

export function weightFor(weight: Weight): '300' | '400' | '600' | '700' {
  return weightValue[weight];
}

// Variantes de texto: size + lineHeight + peso por defecto.
export type TextVariant = {
  fontSize: number;
  lineHeight: number;
  weight: Weight;
};

export const text = {
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular' },
  small: { fontSize: 13, lineHeight: 18, weight: 'regular' },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular' },
  bodyStrong: { fontSize: 16, lineHeight: 22, weight: 'semibold' },
  subtitle: { fontSize: 17, lineHeight: 24, weight: 'regular' },
  h3: { fontSize: 18, lineHeight: 24, weight: 'bold' },
  h2: { fontSize: 20, lineHeight: 26, weight: 'bold' },
  h1: { fontSize: 24, lineHeight: 30, weight: 'bold' },
  hero: { fontSize: 26, lineHeight: 32, weight: 'bold' },
  display: { fontSize: 30, lineHeight: 36, weight: 'bold' },
  digitLg: { fontSize: 40, lineHeight: 44, weight: 'light' },
  digitXl: { fontSize: 72, lineHeight: 78, weight: 'light' },
} as const satisfies Record<string, TextVariant>;

export type TextVariantName = keyof typeof text;
