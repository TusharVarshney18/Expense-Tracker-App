import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthProvider';
import { useConversations } from '@/hooks/useConversations';
import { searchProfiles } from '@/services/moderation';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

interface PersonRow {
  id: string;
  full_name: string | null;
  email: string;
}

export default function ChatListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { conversations, loading, reload } = useConversations();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const runSearch = useCallback(async () => {
    if (!user?.id) return;
    setSearching(true);
    try {
      setResults(await searchProfiles(query, user.id));
    } finally {
      setSearching(false);
    }
  }, [query, user?.id]);

  const openChat = useCallback(
    (id: string) => {
      setQuery('');
      setResults([]);
      router.push({ pathname: '/chat/[id]', params: { id } });
    },
    [router]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <Screen padded={false}>
      <View style={styles.search}>
        <TextField
          label="Find someone"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => void runSearch()}
          style={styles.searchInput}
        />
        <Button
          label="Search"
          onPress={() => void runSearch()}
          loading={searching}
          style={styles.searchButton}
        />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.partner.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <View style={styles.results}>
              <Text style={styles.sectionLabel}>Search results</Text>
              {results.map((person) => (
                <Pressable
                  key={person.id}
                  style={styles.row}
                  onPress={() => openChat(person.id)}
                >
                  <Avatar name={person.full_name ?? person.email} />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{person.full_name ?? 'Unnamed user'}</Text>
                    <Text style={styles.preview} numberOfLines={1}>
                      {person.email}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Text style={[styles.sectionLabel, styles.recentLabel]}>Recent</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openChat(item.partner.id)}>
            <Avatar name={item.partner.full_name ?? item.partner.email} />
            <View style={styles.rowText}>
              <Text style={styles.name}>
                {item.partner.full_name ?? item.partner.email}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage
                  ? `${formatDate(item.lastMessage.created_at)} · ${item.lastMessage.body}`
                  : 'No messages yet'}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Search for someone above to start a private chat."
            />
          )
        }
      />

      <View style={styles.blockedFooter}>
        <Link href="/settings" style={styles.blockedLink}>
          Manage blocked users in Settings
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: 20, paddingTop: 12 },
  searchInput: { height: 46 },
  searchButton: { height: 46 },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  results: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4
  },
  recentLabel: { marginTop: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border
  },
  rowText: { marginLeft: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  preview: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  blockedFooter: { padding: 16, alignItems: 'center' },
  blockedLink: { color: COLORS.primary, fontSize: 13, fontWeight: '600' }
});
