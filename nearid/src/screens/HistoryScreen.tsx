import React from 'react';
import {SectionList, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import HistoryListItem from '../components/HistoryListItem';
import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/text';
import useHistory from '../hooks/useHistory';
import {HistoryStackParamList} from '../navigation/HistoryStackNavigator';

type HistoryNav = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

const HistoryScreen = () => {
  const navigation = useNavigation<HistoryNav>();
  const {sections, loading, refresh} = useHistory();

  return (
    <ScreenContainer scroll>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({section}) => (
          <TitleText style={styles.sectionHeader}>{section.title}</TitleText>
        )}
        renderItem={({item}) => (
          <HistoryListItem
            event={item}
            onPress={() => navigation.navigate('HistoryDetail', {event: item})}
            containerStyle={styles.item}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <TitleText style={styles.emptyTitle}>History</TitleText>
            <BodyText>{loading ? 'Loading…' : 'No presence events yet.'}</BodyText>
          </View>
        }
        refreshing={loading}
        onRefresh={refresh}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  item: {
    marginBottom: 12,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
  },
});

export default HistoryScreen;
