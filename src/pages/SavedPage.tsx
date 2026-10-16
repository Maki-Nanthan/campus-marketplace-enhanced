import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { ListingCard } from "../components/ListingCard";
import { PageTitle } from "../components/PageTitle";
import { Listing } from "../types";
import { Currency } from "../currency";
import { ThemeColors } from "../theme";
export function SavedPage({
  items,
  currency,
  exchangeRate,
  colors,
  onSave,
  onOpen,
}: {
  items: Listing[];
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
  onSave: (id: string) => void;
  onOpen: (item: Listing) => void;
}) {
  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
      <PageTitle
        title="Saved items"
        subtitle="Your shortlist, all in one place"
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
            title="Nothing saved yet"
            message="Tap the heart on an item you want to come back to."
          />
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            saved
            currency={currency}
            exchangeRate={exchangeRate}
            colors={colors}
            onSave={() => onSave(item.id)}
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
