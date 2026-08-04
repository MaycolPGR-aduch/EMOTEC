import Animated from 'react-native-reanimated';
import { motion } from '@/lib/motion';

type StepTransitionProps = {
  stepKey: string | number;
  direction?: 'forward' | 'back';
  children: React.ReactNode;
};

// Envuelve el contenido de un paso de wizard y lo anima al cambiar stepKey.
// Reanimated monta/desmonta con las transiciones de lib/motion.
export function StepTransition({ stepKey, direction = 'forward', children }: StepTransitionProps) {
  return (
    <Animated.View
      key={stepKey}
      entering={motion.stepIn(direction)}
      exiting={motion.stepOut(direction)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}
