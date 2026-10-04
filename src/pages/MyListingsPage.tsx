import { FlatList, ScrollView, StyleSheet } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { ListingCard } from "../components/ListingCard";
import { PageTitle } from "../components/PageTitle";
import { Listing } from "../types";
import { Currency } from "../currency";
import { ThemeColors } from "../theme";
export function MyListingsPage({
  items,
  currency,
  exchangeRate,
  colors,
  onOpen,
  onSell,
}: {
  items: Listing[];
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
  onOpen: (item: Listing) => void;
  onSell: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
      <PageTitle
        title="My listings"
        subtitle="Items you have posted to campus marketplace"
        colors={colors}
      />
      <FlatList
        data={items}
        scrollEnabled={false}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <EmptyState
            colors={colors}
            title="No listings yet"
            message="Publish an item and it will appear here."
            action="Sell an item"
            onAction={onSell}
          />
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            saved={false}
            currency={currency}
            exchangeRate={exchangeRate}
            colors={colors}
            onSave={() => undefined}
            onOpen={() => onOpen(item)}
          />
        )}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  columns: { gap: 14 },
  grid: { gap: 14 },
});
