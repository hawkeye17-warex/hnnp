import React from 'react';
import {SectionList, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import HistoryListItem from '../components/HistoryListItem';
import {BodyText, TitleText} from '../components/text';
import useHistory from '../hooks/useHistory';
import {HistoryStackParamList} from '../navigation/HistoryStackNavigator';
import {useTheme} from '../theme/ThemeProvider';

type HistoryNav = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

const HistoryScreen = () => {
  const navigation = useNavigation<HistoryNav>();
  const {sections, loading, refresh} = useHistory();
  const {colors} = useTheme();

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={true}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({section}) => (
        <View style={[styles.sectionHeaderContainer, {backgroundColor: colors.bgPrimary}]}>
          <TitleText>{section.title}</TitleText>
        </View>
      )}
      renderItem={({item}) => (
        <HistoryListItem
          event={item}
          onPress={() => navigation.navigate('HistoryDetail', {event: item})}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <BodyText>No presence events yet.</BodyText>
        </View>
      }
      refreshing={loading}
      onRefresh={refresh}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeaderContainer: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
});

export default HistoryScreen;
