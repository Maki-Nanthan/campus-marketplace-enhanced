import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PageTitle } from "../components/PageTitle";
import { Currency } from "../currency";
import { AppTheme, ThemeColors } from "../theme";

export function SettingsPage({
  photoURL,
  theme,
  currency,
  exchangeRate,
  exchangeRateError,
  photoBusy,
  colors,
  onBack,
  onUploadPhoto,
  onThemeChange,
  onCurrencyChange,
}: {
  photoURL: string | null;
  theme: AppTheme;
  currency: Currency;
  exchangeRate?: number;
  exchangeRateError: string;
  photoBusy: boolean;
  colors: ThemeColors;
  onBack: () => void;
  onUploadPhoto: () => void;
  onThemeChange: (value: AppTheme) => void;
  onCurrencyChange: (value: Currency) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: colors.background },
      ]}
    >
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go to Profile">
        <Text style={[styles.backText, { color: colors.accent }]}>‹ Profile</Text>
      </Pressable>
      <PageTitle
        title="Settings"
        subtitle="Personalize your campus marketplace"
        colors={colors}
      />

      {/* ── Profile Photo ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile photo</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>P</Text>
          </View>
        )}
        <View style={styles.photoDescription}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your profile picture</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            Choose a clear image, up to 5 MB.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={photoBusy}
          onPress={onUploadPhoto}
          style={[styles.smallButton, { backgroundColor: colors.accentSoft }]}
        >
          <Text style={[styles.smallButtonText, { color: colors.accent }]}>
            {photoBusy ? "Saving…" : "Change"}
          </Text>
        </Pressable>
      </View>

      {/* ── Appearance / Theme ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
      <View style={[styles.cardColumn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Color theme</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Choose the appearance used across the app.
        </Text>

        {/* Visual theme cards */}
        <View style={styles.themeCards}>
          {/* Light mode card */}
          <Pressable
            onPress={() => onThemeChange("light")}
            style={[
              styles.themeCard,
              styles.themeCardLight,
              theme === "light" && styles.themeCardSelected,
              theme === "light" && { borderColor: colors.accent },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: theme === "light" }}
          >
            {/* Mini UI mockup */}
            <View style={styles.themeMockup}>
              <View style={[styles.mockNavBar, { backgroundColor: "#FFF" }]} />
              <View style={styles.mockContent}>
                <View style={[styles.mockCard, { backgroundColor: "#F1F4EF" }]} />
                <View style={[styles.mockCard, { backgroundColor: "#F1F4EF" }]} />
              </View>
            </View>
            <View style={styles.themeCardLabel}>
              <Text style={styles.themeSun}>☀️</Text>
              <Text style={[styles.themeCardText, { color: "#173C34" }]}>Light</Text>
            </View>
            {theme === "light" && (
              <View style={[styles.themeCheck, { backgroundColor: colors.accent }]}>
                <Text style={styles.themeCheckMark}>✓</Text>
              </View>
            )}
          </Pressable>

          {/* Dark mode card */}
          <Pressable
            onPress={() => onThemeChange("dark")}
            style={[
              styles.themeCard,
              styles.themeCardDark,
              theme === "dark" && styles.themeCardSelected,
              theme === "dark" && { borderColor: colors.accent },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: theme === "dark" }}
          >
            {/* Mini UI mockup */}
            <View style={styles.themeMockup}>
              <View style={[styles.mockNavBar, { backgroundColor: "#1B2722" }]} />
              <View style={styles.mockContent}>
                <View style={[styles.mockCard, { backgroundColor: "#24332C" }]} />
                <View style={[styles.mockCard, { backgroundColor: "#24332C" }]} />
              </View>
            </View>
            <View style={styles.themeCardLabel}>
              <Text style={styles.themeSun}>🌙</Text>
              <Text style={[styles.themeCardText, { color: "#E8F0EB" }]}>Dark</Text>
            </View>
            {theme === "dark" && (
              <View style={[styles.themeCheck, { backgroundColor: colors.accent }]}>
                <Text style={styles.themeCheckMark}>✓</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Currency ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Currency</Text>
      <View style={[styles.cardColumn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Display prices in</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Listing prices are stored in USD and converted for display using the latest available exchange rate.
        </Text>

        {/* Currency cards */}
        <View style={styles.currencyCards}>
          <Pressable
            onPress={() => onCurrencyChange("USD")}
            style={[
              styles.currencyCard,
              {
                backgroundColor: currency === "USD" ? colors.accentSoft : colors.surfaceMuted,
                borderColor: currency === "USD" ? colors.accent : colors.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: currency === "USD" }}
          >
            <Text style={styles.currencyFlag}>🇺🇸</Text>
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencyCode, { color: currency === "USD" ? colors.accent : colors.text }]}>
                USD
              </Text>
              <Text style={[styles.currencyName, { color: colors.muted }]}>US Dollar</Text>
              <Text style={[styles.currencySample, { color: currency === "USD" ? colors.accent : colors.muted }]}>
                $25.00
              </Text>
            </View>
            {currency === "USD" && (
              <Text style={[styles.currencyCheck, { color: colors.accent }]}>✓</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => onCurrencyChange("LKR")}
            style={[
              styles.currencyCard,
              {
                backgroundColor: currency === "LKR" ? colors.accentSoft : colors.surfaceMuted,
                borderColor: currency === "LKR" ? colors.accent : colors.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: currency === "LKR" }}
          >
            <Text style={styles.currencyFlag}>🇱🇰</Text>
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencyCode, { color: currency === "LKR" ? colors.accent : colors.text }]}>
                LKR
              </Text>
              <Text style={[styles.currencyName, { color: colors.muted }]}>Sri Lankan Rupee</Text>
              <Text style={[styles.currencySample, { color: currency === "LKR" ? colors.accent : colors.muted }]}>
                {exchangeRate ? `Rs ${(25 * exchangeRate).toLocaleString("en-LK", { maximumFractionDigits: 0 })}` : "Rs —"}
              </Text>
            </View>
            {currency === "LKR" && (
              <Text style={[styles.currencyCheck, { color: colors.accent }]}>✓</Text>
            )}
          </Pressable>
        </View>

        {currency === "LKR" && (
          <View style={[styles.rateBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={styles.rateIcon}>↔️</Text>
            <Text style={[styles.rateText, { color: colors.muted }]}>
              {exchangeRate
                ? `Live rate: 1 USD = ${exchangeRate.toFixed(2)} LKR`
                : "Fetching the USD / LKR rate…"}
            </Text>
          </View>
        )}
      </View>

      {exchangeRateError ? (
        <Text style={styles.error}>{exchangeRateError}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110, flexGrow: 1 },
  back: { alignSelf: "flex-start", paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10, marginTop: 8 },

  // Profile photo card
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  cardColumn: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800" },
  photoDescription: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  muted: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  smallButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  smallButtonText: { fontSize: 12, fontWeight: "800" },

  // Theme cards
  themeCards: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  themeCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
  },
  themeCardLight: {
    backgroundColor: "#F8F8F4",
    borderColor: "#E0E5DE",
  },
  themeCardDark: {
    backgroundColor: "#121A17",
    borderColor: "#2D3D36",
  },
  themeCardSelected: {
    borderWidth: 2.5,
  },
  themeMockup: {
    height: 72,
    padding: 8,
    gap: 6,
  },
  mockNavBar: {
    height: 12,
    borderRadius: 4,
  },
  mockContent: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  mockCard: {
    flex: 1,
    borderRadius: 6,
  },
  themeCardLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    paddingTop: 6,
  },
  themeSun: { fontSize: 16 },
  themeCardText: { fontWeight: "800", fontSize: 13 },
  themeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  themeCheckMark: { color: "#FFF", fontSize: 11, fontWeight: "900" },

  // Currency cards
  currencyCards: {
    gap: 10,
    marginTop: 14,
  },
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  currencyFlag: { fontSize: 28 },
  currencyInfo: { flex: 1 },
  currencyCode: { fontSize: 16, fontWeight: "800" },
  currencyName: { fontSize: 12, marginTop: 1 },
  currencySample: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  currencyCheck: { fontSize: 20, fontWeight: "900" },

  rateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  rateIcon: { fontSize: 14 },
  rateText: { fontSize: 12 },

  error: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
});
