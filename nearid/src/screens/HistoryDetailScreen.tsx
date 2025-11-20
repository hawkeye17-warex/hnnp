import React from 'react';
import {StyleSheet, View} from 'react-native';

import Card from '../components/Card';
import ScreenContainer from '../components/ScreenContainer';
import StatusPill from '../components/StatusPill';
import {BodyText, MutedText, TitleText} from '../components/text';
import {HistoryEvent} from '../types/history';

type HistoryDetailScreenProps = {
  route: {params: {event: HistoryEvent}};
};

const HistoryDetailScreen = ({route}: HistoryDetailScreenProps) => {
  const {event} = route.params;

  const statusLabel =
    event.status === 'verified'
      ? 'Verified'
      : event.status === 'searching'
      ? 'Searching'
      : 'Error';

  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <Card>
          <View style={styles.header}>
            <TitleText style={styles.title}>{event.place}</TitleText>
            <StatusPill status={event.status} label={statusLabel} />
          </View>
          <BodyText style={styles.section}>Time</BodyText>
          <MutedText style={styles.value}>{event.time}</MutedText>
          {event.location ? (
            <>
              <BodyText style={styles.section}>Location</BodyText>
              <MutedText style={styles.value}>{event.location}</MutedText>
            </>
          ) : null}
          {event.note ? (
            <>
              <BodyText style={styles.section}>Notes</BodyText>
              <MutedText style={styles.value}>{event.note}</MutedText>
            </>
          ) : null}
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    marginRight: 12,
  },
  section: {
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    lineHeight: 22,
  },
});

export default HistoryDetailScreen;
