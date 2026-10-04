import { User } from "firebase/auth";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { ThemeColors } from "../theme";
import {
  Conversation,
  MarketplaceMessage,
  PublicProfile,
} from "../types";
import {
  findUserByUsername,
  loadPublicProfile,
  openConversation,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
} from "../messaging";

export function MessagesPage({
  user,
  username,
  photoURL,
  startWithUserId,
  onStartHandled,
  onBrowse,
  colors,
}: {
  user: User;
  username: string;
  photoURL: string | null;
  startWithUserId: string | null;
  onStartHandled: () => void;
  onBrowse: () => void;
  colors: ThemeColors;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const currentProfile: PublicProfile = useMemo(
    () => ({
      uid: user.uid,
      username: username || user.uid.slice(0, 8),
      displayName: user.displayName || user.email?.split("@")[0] || "Campus student",
      photoURL,
    }),
    [photoURL, user, username],
  );

  useEffect(() => {
    setLoading(true);
    return subscribeToConversations(
      user.uid,
      (entries) => {
        setConversations(entries);
        setLoading(false);
      },
      (cause) => {
        setError(cause.message);
        setLoading(false);
      },
    );
  }, [user.uid]);

  useEffect(() => {
    if (!startWithUserId || startWithUserId === user.uid) {
      if (startWithUserId === user.uid) {
        setError("You can't message yourself.");
        onStartHandled();
      }
      return;
    }
    let active = true;
    setStarting(true);
    setError("");
    loadPublicProfile(startWithUserId)
      .then(async (other) => ({
        other,
        conversationId: await openConversation(currentProfile, other),
      }))
      .then(({ other, conversationId }) => {
        if (active) {
          setActiveConversation({
            id: conversationId,
            memberIds: [user.uid, startWithUserId],
            memberProfiles: { [other.uid]: other },
          });
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not start the conversation.");
      })
      .finally(() => {
        if (active) {
          setStarting(false);
          onStartHandled();
        }
      });
    return () => {
      active = false;
    };
  }, [startWithUserId, currentProfile, user.uid]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    return subscribeToMessages(
      activeConversation.id,
      setMessages,
      (cause) => setError(cause.message),
    );
  }, [activeConversation?.id]);

  const startByUsername = async () => {
    setError("");
    setStarting(true);
    try {
      const other = await findUserByUsername(searchUsername);
      const conversationId = await openConversation(currentProfile, other);
      setActiveConversation(
        conversations.find((entry) => entry.id === conversationId) || {
          id: conversationId,
          memberIds: [user.uid, other.uid],
          memberProfiles: { [other.uid]: other },
        },
      );
      setSearchUsername("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not find that user.");
    } finally {
      setStarting(false);
    }
  };

  const submitMessage = async () => {
    if (!activeConversation) return;
    if (!messageText.trim()) {
      setError("Write a message before sending.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await sendMessage(activeConversation.id, user.uid, messageText);
      setMessageText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message delivery failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const otherProfile = (conversation: Conversation): PublicProfile | undefined => {
    const otherId = conversation.memberIds.find((memberId) => memberId !== user.uid);
    return otherId ? conversation.memberProfiles?.[otherId] : undefined;
  };

  const formatTime = (value: Conversation["lastMessageAt"] | MarketplaceMessage["createdAt"]) => {
    if (value && "toDate" in value && typeof value.toDate === "function") {
      return value.toDate().toLocaleString();
    }
    return value instanceof Date ? value.toLocaleString() : "";
  };

  const openThread = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    const profile = otherProfile(conversation);
    if (profile) return;
    const otherId = conversation.memberIds.find((memberId) => memberId !== user.uid);
    if (!otherId) return;
    try {
      const loaded = await loadPublicProfile(otherId);
      setActiveConversation({ ...conversation, memberProfiles: { [otherId]: loaded } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load user profile.");
    }
  };

  if (activeConversation) {
    const peer = otherProfile(activeConversation);
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setActiveConversation(null)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.accent }]}>‹ Messages</Text>
          </Pressable>
          <Avatar profile={peer} colors={colors} />
          <View style={styles.peerInfo}>
            <Text style={[styles.peerName, { color: colors.text }]}>
              {peer?.displayName || peer?.username || "Conversation"}
            </Text>
            {peer?.username ? <Text style={[styles.username, { color: colors.muted }]}>@{peer.username}</Text> : null}
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.muted }]}>Start the conversation with a message.</Text>
          ) : messages.map((message) => {
            const mine = message.senderId === user.uid;
            return (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  { backgroundColor: mine ? colors.accent : colors.surface, alignSelf: mine ? "flex-end" : "flex-start" },
                ]}
              >
                <Text style={{ color: mine ? colors.accentText : colors.text }}>{message.text}</Text>
                <Text style={[styles.messageTime, { color: mine ? colors.accentText : colors.muted }]}>
                  {formatTime(message.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Write a message…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={4000}
            style={[styles.messageInput, { color: colors.text }]}
          />
          <Pressable
            disabled={sending || !messageText.trim()}
            onPress={submitMessage}
            style={[styles.sendButton, { backgroundColor: colors.accent, opacity: sending || !messageText.trim() ? 0.55 : 1 }]}
          >
            {sending ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: "800" }}>Send</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <PageTitle title="Messages" subtitle="Private, real-time conversations with campus users" colors={colors} />
      <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Start a conversation</Text>
        <Text style={[styles.helper, { color: colors.muted }]}>Find someone by their unique username.</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={searchUsername}
            onChangeText={setSearchUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter username"
            placeholderTextColor={colors.muted}
            style={[styles.usernameInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            onSubmitEditing={startByUsername}
          />
          <Pressable disabled={starting || !searchUsername.trim()} onPress={startByUsername} style={[styles.searchButton, { backgroundColor: colors.accent, opacity: starting || !searchUsername.trim() ? 0.55 : 1 }]}>
            {starting ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: "800" }}>Find</Text>}
          </Pressable>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Your conversations</Text>
      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : conversations.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
          <Text style={[styles.helper, { color: colors.muted }]}>Search by username or contact a seller from a listing.</Text>
          <Pressable onPress={onBrowse} style={[styles.searchButton, { backgroundColor: colors.accent, alignSelf: "center", marginTop: 12 }]}>
            <Text style={{ color: colors.accentText, fontWeight: "800" }}>Browse listings</Text>
          </Pressable>
        </View>
      ) : conversations.map((conversation) => {
        const peer = otherProfile(conversation);
        return (
          <Pressable
            key={conversation.id}
            onPress={() => void openThread(conversation)}
            style={[styles.thread, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Avatar profile={peer} colors={colors} />
            <View style={styles.threadInfo}>
              <View style={styles.threadHeading}>
                <Text style={[styles.peerName, { color: colors.text }]}>{peer?.displayName || peer?.username || "Campus user"}</Text>
                <Text style={[styles.messageTime, { color: colors.muted }]}>{formatTime(conversation.lastMessageAt)}</Text>
              </View>
              <Text style={[styles.username, { color: colors.muted }]}>{peer?.username ? `@${peer.username}` : " "}</Text>
              <Text style={[styles.preview, { color: colors.muted }]} numberOfLines={1}>{conversation.lastMessage || "Start a conversation"}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Avatar({ profile, colors }: { profile?: PublicProfile; colors: ThemeColors }) {
  return profile?.photoURL ? (
    <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accentSoft }]}>
      <Text style={{ color: colors.accent, fontWeight: "800" }}>
        {(profile?.displayName || profile?.username || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, paddingBottom: 94 },
  content: { padding: 20, paddingBottom: 110, flexGrow: 1 },
  searchCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  usernameInput: { flex: 1, minWidth: 0, height: 46, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12 },
  searchButton: { minWidth: 68, height: 46, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  thread: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 9 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  threadInfo: { flex: 1 },
  threadHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  peerName: { fontSize: 14, fontWeight: "800" },
  username: { fontSize: 11, marginTop: 2 },
  preview: { fontSize: 13, marginTop: 4 },
  messageTime: { fontSize: 10 },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: "center", marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  loader: { marginTop: 24 },
  error: { color: "#B64950", backgroundColor: "#FBECEE", borderRadius: 10, padding: 10, fontSize: 12, marginTop: 10 },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E3E9E2" },
  backButton: { paddingVertical: 8, paddingRight: 4 },
  backText: { fontWeight: "800", fontSize: 13 },
  peerInfo: { flex: 1 },
  messageList: { flexGrow: 1, paddingVertical: 16, gap: 10 },
  emptyHint: { textAlign: "center", marginTop: 30 },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, gap: 5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderWidth: 1, borderRadius: 14, padding: 8 },
  messageInput: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 8, paddingVertical: 8 },
  sendButton: { minWidth: 64, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
