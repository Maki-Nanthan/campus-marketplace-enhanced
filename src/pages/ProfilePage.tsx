import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { User } from "firebase/auth";
import { PageTitle } from "../components/PageTitle";
import { ThemeColors } from "../theme";

export function ProfilePage({
  user,
  photoURL,
  username,
  photoBusy,
  colors,
  savedCount,
  listingCount,
  firebaseConfigured,
  profileReady,
  error,
  onMyListings,
  onSaved,
  onSignIn,
  onSignOut,
  onSettings,
  onUploadPhoto,
}: {
  user: User | null;
  photoURL: string | null;
  username: string;
  photoBusy: boolean;
  colors: ThemeColors;
  savedCount: number;
  listingCount: number;
  firebaseConfigured: boolean;
  profileReady: boolean;
  error: string;
  onMyListings: () => void;
  onSaved: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onSettings: () => void;
  onUploadPhoto: () => void;
}) {
  const name =
    user?.displayName || user?.email?.split("@")[0] || "Campus guest";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <PageTitle
        title="Profile"
        subtitle="Your campus marketplace account"
        colors={colors}
      />

      {/* Hero / Avatar */}
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.avatarWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.initials, { color: colors.accent }]}>
                {user ? initials : "P"}
              </Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? "Upload profile photo" : "Sign in to add a profile photo"}
            disabled={photoBusy}
            onPress={user ? onUploadPhoto : onSignIn}
            style={[styles.photoEditButton, { backgroundColor: colors.accent }]}
          >
            {photoBusy ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Text style={[styles.photoEditIcon, { color: colors.accentText }]}>✎</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {user && username ? <Text style={[styles.username, { color: colors.accent }]}>@{username}</Text> : null}
          <Text style={[styles.email, { color: colors.muted }]}>
            {user?.email || "Sign in to sell and save"}
          </Text>
          <Pressable
            disabled={photoBusy}
            onPress={user ? onUploadPhoto : onSignIn}
            accessibilityRole="button"
            style={styles.photoAction}
          >
            <Text style={[styles.photoActionText, { color: colors.accent }]}>
              {photoBusy ? "Saving photo…" : user ? "Update profile photo" : "Add a profile photo"}
            </Text>
          </Pressable>
          {user && profileReady && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.verifiedText, { color: colors.accent }]}>
                ✓ Connected to Firebase
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Pressable
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onMyListings}
          accessibilityRole="button"
          accessibilityLabel="View my listings"
        >
          <Text style={[styles.statValue, { color: colors.accent }]}>{listingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Listings</Text>
        </Pressable>
        <Pressable
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onSaved}
          accessibilityRole="button"
          accessibilityLabel="View saved items"
        >
          <Text style={[styles.statValue, { color: colors.accent }]}>{savedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Saved</Text>
        </Pressable>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>🏫</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Campus</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your activity</Text>
      <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuRow
          icon="▣"
          label="My listings"
          value={`${listingCount} item${listingCount !== 1 ? "s" : ""}`}
          onPress={onMyListings}
          colors={colors}
        />
        <MenuRow
          icon="♡"
          label="Saved items"
          value={`${savedCount} saved`}
          onPress={onSaved}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Map Location</Text>
      <View
        style={[
          styles.locationCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.locationIconBox, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.locationIcon, { color: colors.accent }]}>⌖</Text>
        </View>
        <View style={styles.locationDetails}>
          <Text style={[styles.locationName, { color: colors.text }]}>North Campus</Text>
          <Text style={[styles.locationSubtitle, { color: colors.muted }]}>
            Your preferred meetup area
          </Text>
        </View>
        <View style={[styles.locationTag, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.locationTagText, { color: colors.accent }]}>CAMPUS</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
      <Pressable
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        style={[
          styles.settingsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.settingsIconBox, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.settingsIcon, { color: colors.accent }]}>⚙</Text>
        </View>
        <View style={styles.settingsDetails}>
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Appearance & currency</Text>
          <Text style={[styles.settingsSubtitle, { color: colors.muted }]}>
            Theme, currency and profile photo
          </Text>
        </View>
        <Text style={[styles.settingsChevron, { color: colors.muted }]}>›</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {user ? (
        <Pressable
          style={[styles.outline, { borderColor: colors.border }]}
          onPress={onSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={[styles.outlineText, { color: colors.accent }]}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.primary, { backgroundColor: colors.accent }]}
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in to continue"
        >
          <Text style={[styles.primaryText, { color: colors.accentText }]}>
            Sign in to continue
          </Text>
        </Pressable>
      )}

      <Text style={[styles.backend, { color: colors.muted }]}>
        {firebaseConfigured
          ? "🔒 Data saved securely to Firebase"
          : "Demo mode · Add Firebase keys to connect"}
      </Text>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  colors,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  colors: ThemeColors;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        last && styles.rowLast,
      ]}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={styles.rowLeft}>
        <Text
          style={[
            styles.rowIcon,
            { color: colors.accent, backgroundColor: colors.accentSoft },
          ]}
        >
          {icon}
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.muted, { color: colors.muted }]}>{value}</Text>
        {onPress && <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },

  // Hero card
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoEditButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEditIcon: { fontSize: 14, fontWeight: "800" },
  photoAction: { alignSelf: "flex-start", paddingVertical: 2 },
  photoActionText: { fontSize: 11, fontWeight: "700" },
  initials: { fontSize: 22, fontWeight: "800" },
  heroText: { flex: 1, gap: 4 },
  name: { fontSize: 20, fontWeight: "800" },
  username: { fontSize: 12, fontWeight: "700" },
  email: { fontSize: 12 },
  verifiedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  verifiedText: { fontSize: 11, fontWeight: "700" },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },

  // Menu
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 9,
    marginTop: 4,
  },
  menu: {
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowIcon: {
    fontSize: 18,
    width: 34,
    height: 34,
    lineHeight: 34,
    textAlign: "center",
    borderRadius: 11,
    overflow: "hidden",
    color: "#1F5D4C",
    backgroundColor: "#E6F0E6",
  },
  label: { fontWeight: "700", fontSize: 14 },
  muted: { fontSize: 12 },
  chevron: { fontSize: 20, fontWeight: "300" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  locationIcon: { fontSize: 26, fontWeight: "700" },
  locationDetails: { flex: 1, gap: 4 },
  locationName: { fontSize: 14, fontWeight: "800" },
  locationSubtitle: { fontSize: 11 },
  locationTag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  locationTagText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  settingsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  settingsIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIcon: { fontSize: 20 },
  settingsDetails: { flex: 1, gap: 4 },
  settingsTitle: { fontSize: 14, fontWeight: "800" },
  settingsSubtitle: { fontSize: 11 },
  settingsChevron: { fontSize: 26, fontWeight: "300" },

  // Buttons
  primary: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  outlineText: { fontWeight: "800" },
  error: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 16,
  },
  backend: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 22,
    marginBottom: 4,
  },
});
