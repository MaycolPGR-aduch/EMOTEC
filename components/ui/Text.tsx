import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import {
  color as colors,
  text as variants,
  fontFamilyFor,
  weightFor,
  type Weight,
  type TextVariantName,
} from '@/theme';

type AppTextProps = {
  variant?: TextVariantName;
  color?: string; // token resuelto o hex libre
  weight?: Weight; // sobreescribe el peso de la variante
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
};

// Todo el texto de la app pasa por aqui: garantiza la familia de marca (Nunito
// cuando este instalada) y centraliza tamano/peso/color. RN no hereda fontFamily
// de forma fiable, por eso se aplica en cada Text.
export function AppText({
  variant = 'body',
  color = colors.textDefault,
  weight,
  align,
  numberOfLines,
  style,
  children,
}: AppTextProps) {
  const v = variants[variant];
  const w = weight ?? v.weight;
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          fontFamily: fontFamilyFor(w),
          fontWeight: weightFor(w),
          color,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
