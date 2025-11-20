import React from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';

import Card from './Card';
import {MutedText, TitleText} from './text';

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const SettingsSection = ({
  title,
  description,
  children,
  style,
}: SettingsSectionProps) => {
  return (
    <Card style={[styles.card, style]}>
      <TitleText style={styles.title}>{title}</TitleText>
      {description ? (
        <MutedText style={styles.description}>{description}</MutedText>
      ) : null}
      {children}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    marginBottom: 4,
  },
});

export default SettingsSection;
