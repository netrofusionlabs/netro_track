import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  spacing?: number;
  style?: ViewStyle;
}

export function Divider({ direction = 'horizontal', spacing = 0, style }: DividerProps) {
  const theme = useTheme();

  const dividerStyle: ViewStyle =
    direction === 'horizontal'
      ? {
          height: 1,
          width: '100%',
          backgroundColor: theme.colors.surface.divider,
          marginVertical: spacing,
        }
      : {
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.surface.divider,
          marginHorizontal: spacing,
        };

  return <View style={[dividerStyle, style]} />;
}
