import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Currency, formatPrice } from "../currency";
import { ThemeColors } from "../theme";
import { Listing } from "../types";

export function ListingCard({
  item,
  saved,
  currency,
  exchangeRate,
  colors,
  onSave,
  onOpen,
}: {
  item: Listing;
  saved: boolean;
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
  onSave: () => void;
  onOpen: () => void;
}) {
  const isSold = item.status === "sold";
  const displayPrice = item.offer?.offerPrice ?? item.price;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isSold && styles.soldCard,
      ]}
      onPress={onOpen}
    >
      <View style={[styles.photo, { backgroundColor: colors.surfaceMuted }]}>
        <Image
          source={{ uri: item.image }}
          style={[styles.image, isSold && styles.soldImage]}
        />
        {isSold && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>SOLD OUT</Text>
          </View>
        )}
        {item.offer && !isSold && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>SPECIAL OFFER</Text>
          </View>
        )}
        <Pressable
          accessibilityLabel={saved ? "Remove saved item" : "Save item"}
          style={styles.save}
          onPress={onSave}
        >
          <Text style={[styles.heart, saved && styles.red]}>
            {saved ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.priceColumn}>
            <Text style={[styles.price, { color: colors.accent }, isSold && styles.soldPrice]}>
              {formatPrice(displayPrice, currency, exchangeRate)}
            </Text>
            {item.offer && (
              <Text style={[styles.originalPrice, { color: colors.muted }]}>
                {formatPrice(item.offer.originalPrice, currency, exchangeRate)}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.muted, { color: colors.muted }]}>
          {item.condition} · {item.campus}
        </Text>
        <Text style={[styles.tiny, { color: colors.muted }]}>
          {isSold ? "● Sold out" : `Listed by ${item.seller}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9ECE6",
  },
  photo: { height: 148, backgroundColor: "#E5ECE5" },
  image: { width: "100%", height: "100%" },
  save: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  heart: { color: "#365B4C", fontSize: 21 },
  red: { color: "#C3535B" },
  body: { padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  priceColumn: { alignItems: "flex-end", gap: 2 },
  title: {
    flex: 1,
    minHeight: 34,
    color: "#1B3A33",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  price: { color: "#1C7057", fontSize: 14, fontWeight: "800" },
  muted: { color: "#87918C", fontSize: 12 },
  tiny: { color: "#A0AAA4", fontSize: 10, marginTop: 5 },
  soldCard: {
    opacity: 0.9,
  },
  soldImage: {
    opacity: 0.72,
  },
  soldBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#173C34",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 2,
  },
  soldBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  offerBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "#C3535B",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  offerBadgeText: { color: "#FFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  originalPrice: { fontSize: 10, textDecorationLine: "line-through", textAlign: "right" },
  soldPrice: {
    color: "#87918C",
    textDecorationLine: "line-through",
  },
});
