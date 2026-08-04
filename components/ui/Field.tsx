import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { color as colors, radius, space, text as textVariants } from '@/theme';
import { AppText } from './Text';

type FieldProps = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
};

// Input etiquetado. Reemplaza los TextInput ad-hoc de gratitud/caja/checkin.
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  editable = true,
  autoFocus = false,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: FieldProps) {
  return (
    <View style={styles.wrap}>
      {label && (
        <AppText variant="bodyStrong" color={colors.textStrong}>
          {label}
        </AppText>
      )}
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    padding: space.md + 2,
    fontSize: textVariants.bodyStrong.fontSize,
    color: colors.textStrong,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});
