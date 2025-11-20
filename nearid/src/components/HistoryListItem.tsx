import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {HistoryEvent} from '../types/history';
import {useTheme} from '../theme/ThemeProvider';
import StatusPill from './StatusPill';
import {BodyText, MutedText, TitleText} from './text';

type HistoryListItemProps = {
  event: HistoryEvent;
  onPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const HistoryListItem = ({
  event,
  onPress,
  containerStyle,
}: HistoryListItemProps) => {
  const {colors} = useTheme();

  const label =
    event.status === 'verified'
      ? 'Verified'
      : event.status === 'searching'
      ? 'Searching'
      : 'Error';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        containerStyle,
      ]}
      android_ripple={{color: colors.borderSubtle}}>
      <View style={styles.textCol}>
        <TitleText style={styles.place}>{event.place}</TitleText>
        <MutedText>{event.time}</MutedText>
      </View>
      <StatusPill status={event.status === 'verified' ? 'verified' : event.status} label={label} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
    marginRight: 12,
  },
  place: {
    marginBottom: 4,
  },
});

export default HistoryListItem;
