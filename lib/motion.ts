import {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  Easing,
} from 'react-native-reanimated';

// Presets de animacion (reanimated). Centralizan duraciones y transiciones para
// que StepTransition, GuidedSequence y las entradas de pantalla sean consistentes.

export const motion = {
  duration: { fast: 150, base: 250, slow: 400 },
  easing: Easing.out(Easing.cubic),

  // Entradas suaves de contenido.
  enterFade: FadeIn.duration(250),
  enterUp: FadeInUp.duration(300).easing(Easing.out(Easing.cubic)),

  // Transicion entre pasos de un wizard (hacia adelante vs atras).
  stepIn(direction: 'forward' | 'back' = 'forward') {
    return direction === 'forward'
      ? FadeInDown.duration(250)
      : FadeInUp.duration(250);
  },
  stepOut(direction: 'forward' | 'back' = 'forward') {
    return direction === 'forward'
      ? FadeOutDown.duration(150)
      : FadeOut.duration(150);
  },
};
