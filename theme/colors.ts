// Tokens de color. Consolidan los ~335 hex hardcodeados que estaban dispersos en
// 20 archivos a un conjunto semantico. Objetos estaticos: sin Context ni theming
// en runtime. La unica "segunda piel" es `immersive` (modo oscuro de respiracion).

export const color = {
  // Marca y superficies
  brand: '#208AEF',
  brandInk: '#1c5a94', // texto azul oscuro (titulos de acompanamiento)
  onBrand: '#ffffff',
  canvas: '#f6f8fa', // fondo gris de pagina
  surface: '#ffffff', // tarjetas / superficie base
  surfaceBrand: '#f2f7fd', // tinte azul claro (colapsa #f2f7fd/#f5faff/#f7fafd)

  // Texto (5 peldanos; colapsa ~7 grises)
  textStrong: '#1c2b36',
  textDefault: '#3a4a57',
  textSecondary: '#5a6b7b',
  textMuted: '#8a97a5',
  textFaint: '#9aa5b1',

  // Bordes (colapsa ~4)
  border: '#eef1f4', // hairline de tarjeta/header
  borderInput: '#c9d6e5', // inputs, chips, opciones

  // Feedback / semanticos
  danger: '#c0392b',
  success: '#1e7e34',
  successSurface: '#e6f4ea',
  warningSurface: '#fdf0e3',
  star: '#f5b301',

  // Niveles de alerta (tutor). Antes duplicado literal en 2 archivos.
  // 'critica' reusa danger a proposito.
  alert: {
    informativa: '#7a8a99',
    preventiva: '#c9902a',
    prioritaria: '#d96a2a',
    critica: '#c0392b',
  },

  // Modo inmersivo (respiracion / relajacion muscular). Sub-namespace, no theme.
  immersive: {
    bg: '#0f2233',
    ring: '#2f6ea5',
    textPrimary: '#ffffff',
    textSecondary: '#cfe0ee',
    textFaint: '#9fb4c6',
    border: '#5a7488',
  },
} as const;

export type ColorToken = keyof typeof color;
