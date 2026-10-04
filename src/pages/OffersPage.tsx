import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PageTitle } from "../components/PageTitle";
import { Currency, formatPrice } from "../currency";
import { ThemeColors } from "../theme";
import { Listing } from "../types";

export function OffersPage({
  items,
  currency,
  exchangeRate,
  colors,
  onOpen,
}: {
  items: Listing[];
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
  onOpen: (item: Listing) => void;
}) {
  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
      <PageTitle title="Special offers" subtitle="Limited-time deals from campus sellers" colors={colors} />
      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active offers right now</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Check back soon for special prices and discounts.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => {
            const offer = item.offer!;
            const discount = Math.round((1 - offer.offerPrice / offer.originalPrice) * 100);
            return (
              <Pressable
                key={item.id}
                onPress={() => onOpen(item)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.imageWrap}>
                  <Image source={{ uri: item.image }} style={styles.image} />
                  <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% OFF</Text></View>
                </View>
                <View style={styles.body}>
                  <Text style={[styles.offerTitle, { color: colors.accent }]} numberOfLines={1}>{offer.title}</Text>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.offerPrice, { color: colors.accent }]}>{formatPrice(offer.offerPrice, currency, exchangeRate)}</Text>
                    <Text style={[styles.originalPrice, { color: colors.muted }]}>{formatPrice(offer.originalPrice, currency, exchangeRate)}</Text>
                  </View>
                  {offer.description ? <Text style={[styles.description, { color: colors.muted }]} numberOfLines={3}>{offer.description}</Text> : null}
                  {offer.expiresAt ? <Text style={[styles.expiry, { color: colors.muted }]}>Valid until {new Date(offer.expiresAt).toLocaleDateString()}</Text> : null}
                  <Text style={[styles.seller, { color: colors.muted }]}>By {item.seller}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110, flexGrow: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", minWidth: 145, flexGrow: 1, borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  imageWrap: { height: 140, backgroundColor: "#E5ECE5" },
  image: { width: "100%", height: "100%" },
  discountBadge: { position: "absolute", top: 9, left: 9, backgroundColor: "#C3535B", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  discountText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
  body: { padding: 12, gap: 5 },
  offerTitle: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  itemTitle: { fontSize: 14, fontWeight: "800", minHeight: 36 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 7, flexWrap: "wrap" },
  offerPrice: { fontSize: 16, fontWeight: "900" },
  originalPrice: { fontSize: 11, textDecorationLine: "line-through" },
  description: { fontSize: 11, lineHeight: 16 },
  expiry: { fontSize: 10, marginTop: 2 },
  seller: { fontSize: 10, marginTop: 2 },
  empty: { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: "center", marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 7 },
});
