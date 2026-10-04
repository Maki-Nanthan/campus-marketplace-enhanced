import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ListingCard } from "../components/ListingCard";
import { categories } from "../data";
import { Currency } from "../currency";
import { ThemeColors } from "../theme";
import { Listing } from "../types";

function priceDraft(usd: number, currency: Currency, exchangeRate?: number): string {
  if (usd <= 0) return "";
  return String(currency === "LKR" ? Math.round(usd * (exchangeRate || 1)) : usd);
}

export function ExplorePage({
  items,
  query,
  category,
  minPrice,
  maxPrice,
  sortBy,
  savedIds,
  photoURL,
  currency,
  exchangeRate,
  colors,
  onQueryChange,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortByChange,
  onResetFilters,
  onSave,
  onOpen,
  onProfile,
}: {
  items: Listing[];
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number | null;
  sortBy: "newest" | "price-asc" | "price-desc";
  savedIds: string[];
  photoURL: string | null;
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number | null) => void;
  onSortByChange: (value: "newest" | "price-asc" | "price-desc") => void;
  onResetFilters: () => void;
  onSave: (id: string) => void;
  onOpen: (item: Listing) => void;
  onProfile: () => void;
}) {
  const unitKey = `${currency}:${exchangeRate || ""}`;
  const previousUnit = useRef(unitKey);
  const [minDraft, setMinDraft] = useState(() =>
    priceDraft(minPrice, currency, exchangeRate),
  );
  const [maxDraft, setMaxDraft] = useState(() =>
    maxPrice !== null ? priceDraft(maxPrice, currency, exchangeRate) : "",
  );
  useEffect(() => {
    if (previousUnit.current === unitKey) return;
    previousUnit.current = unitKey;
    setMinDraft(priceDraft(minPrice, currency, exchangeRate));
    setMaxDraft(maxPrice !== null ? priceDraft(maxPrice, currency, exchangeRate) : "");
  }, [currency, exchangeRate, maxPrice, minPrice, unitKey]);
  const updateRange = (value: string, edge: "min" | "max") => {
    const number = Number(value);
    if (!value.trim()) {
      if (edge === "min") onMinPriceChange(0);
      else onMaxPriceChange(null);
    } else if (Number.isFinite(number) && number >= 0) {
      const inUsd = currency === "LKR" ? number / (exchangeRate || 1) : number;
      if (edge === "min") onMinPriceChange(inUsd);
      else onMaxPriceChange(inUsd);
    }
    if (edge === "min") setMinDraft(value);
    else setMaxDraft(value);
  };
  const invalidRange = maxPrice !== null && minPrice > maxPrice;
  const clearFilters = () => {
    setMinDraft("");
    setMaxDraft("");
    onResetFilters();
  };
  const hasActiveFilters =
    query.trim().length > 0 ||
    category !== "All items" ||
    minPrice > 0 ||
    maxPrice !== null ||
    sortBy !== "newest";
  return (
    <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>CAMPUS MARKETPLACE</Text>
          <Text style={[styles.heading, { color: colors.text }]}>
            Find your next{"\n"}favorite thing.
          </Text>
        </View>
        <Pressable
          style={[styles.avatar, { backgroundColor: colors.accentSoft }]}
          onPress={onProfile}
          accessibilityRole="button"
          accessibilityLabel="Open Profile"
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.accent }]}>P</Text>
          )}
        </Pressable>
      </View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.icon, { color: colors.muted }]}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search textbooks, desks, tech..."
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => onQueryChange("")}
            hitSlop={8}
            style={[styles.clearBtn, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.clearText, { color: colors.muted }]}>✕</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.section}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse near you</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>Good finds, close by</Text>
        </View>
        <Text style={[styles.seeAll, { color: colors.accent }]}>{items.length} items</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {categories.map((value) => (
          <Pressable
            key={value}
            onPress={() => onCategoryChange(value)}
            style={[
              styles.category,
              {
                backgroundColor:
                  category === value ? colors.accent : colors.surfaceMuted,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: category === value ? colors.accentText : colors.muted },
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort & Price Filters */}
      <View
        style={[
          styles.filterSection,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.filterGroupTitle, { color: colors.muted }]}>
          Sort by Price
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => onSortByChange("newest")}
            style={[
              styles.filterChip,
              {
                backgroundColor: sortBy === "newest" ? colors.accent : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: sortBy === "newest" ? colors.accentText : colors.text },
              ]}
            >
              Newest
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSortByChange("price-asc")}
            style={[
              styles.filterChip,
              {
                backgroundColor: sortBy === "price-asc" ? colors.accent : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: sortBy === "price-asc" ? colors.accentText : colors.text },
              ]}
            >
              Price: Low to High ↑
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSortByChange("price-desc")}
            style={[
              styles.filterChip,
              {
                backgroundColor: sortBy === "price-desc" ? colors.accent : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: sortBy === "price-desc" ? colors.accentText : colors.text },
              ]}
            >
              Price: High to Low ↓
            </Text>
          </Pressable>
        </ScrollView>

        <Text style={[styles.filterGroupTitle, { color: colors.muted, marginTop: 12 }]}>
          Price range ({currency})
        </Text>
        <View style={styles.priceRangeRow}>
          <View style={styles.priceRangeField}>
            <Text style={[styles.priceRangeLabel, { color: colors.muted }]}>Minimum</Text>
            <TextInput
              value={minDraft}
              onChangeText={(value) => updateRange(value, "min")}
              keyboardType="decimal-pad"
              placeholder="No minimum"
              placeholderTextColor={colors.muted}
              style={[styles.priceInput, { backgroundColor: colors.surface, borderColor: invalidRange ? "#C3535B" : colors.border, color: colors.text }]}
            />
          </View>
          <View style={styles.priceRangeField}>
            <Text style={[styles.priceRangeLabel, { color: colors.muted }]}>Maximum</Text>
            <TextInput
              value={maxDraft}
              onChangeText={(value) => updateRange(value, "max")}
              keyboardType="decimal-pad"
              placeholder="No maximum"
              placeholderTextColor={colors.muted}
              style={[styles.priceInput, { backgroundColor: colors.surface, borderColor: invalidRange ? "#C3535B" : colors.border, color: colors.text }]}
            />
          </View>
        </View>
        {invalidRange ? <Text style={styles.rangeError}>Minimum price cannot be greater than maximum price.</Text> : null}
        {(minPrice > 0 || maxPrice !== null) ? (
          <Pressable onPress={() => { setMinDraft(""); setMaxDraft(""); onMinPriceChange(0); onMaxPriceChange(null); }} style={styles.anyPriceButton}>
            <Text style={[styles.anyPriceText, { color: colors.accent }]}>Clear price range</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <View style={[styles.activeFiltersBar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.activeFiltersCount, { color: colors.accent }]}>
            {items.length} {items.length === 1 ? "item found" : "items found"}
          </Text>
          <Pressable onPress={clearFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Clear all filters ✕</Text>
          </Pressable>
        </View>
      )}

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
            title="No items found"
            message={
              query
                ? `We couldn't find anything matching "${query}". Try checking your spelling or clearing filters.`
                : "No items match your selected category or price filters."
            }
            action="Clear all filters"
            onAction={clearFilters}
          />
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            saved={savedIds.includes(item.id)}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 28,
    paddingBottom: 24,
  },
  eyebrow: {
    color: "#65766D",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  heading: {
    color: "#173C34",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D6E5D7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { color: "#225347", fontWeight: "800" },
  search: {
    height: 52,
    backgroundColor: "#FFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E6E9E2",
  },
  icon: { color: "#49635A", fontSize: 28, marginRight: 8 },
  input: { flex: 1, color: "#173C34", fontSize: 14 },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#ECEFE9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  clearText: {
    color: "#65766D",
    fontSize: 12,
    fontWeight: "bold",
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#173C34",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  muted: { color: "#87918C", fontSize: 12 },
  seeAll: { color: "#23775D", fontWeight: "700", fontSize: 12 },
  categories: { gap: 8, paddingBottom: 22 },
  category: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#ECEFE9",
  },
  activeCategory: { backgroundColor: "#1F5D4C" },
  categoryText: { color: "#64736C", fontSize: 12, fontWeight: "700" },
  activeText: { color: "#FFF" },
  grid: { gap: 14 },
  columns: { gap: 14 },
  empty: { textAlign: "center", color: "#87918C", padding: 30 },
  filterSection: {
    backgroundColor: "#F7F9F6",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E6ECE3",
  },
  filterGroupTitle: {
    color: "#5C6E66",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDE4DA",
  },
  activeFilterChip: {
    backgroundColor: "#1F5D4C",
    borderColor: "#1F5D4C",
  },
  filterChipText: {
    color: "#54655E",
    fontSize: 12,
    fontWeight: "600",
  },
  priceRangeRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  priceRangeField: { flex: 1, gap: 5 },
  priceRangeLabel: { fontSize: 11, fontWeight: "700" },
  priceInput: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13 },
  rangeError: { color: "#B64950", fontSize: 11, marginTop: 7 },
  anyPriceButton: { alignSelf: "flex-end", paddingTop: 10 },
  anyPriceText: { fontSize: 12, fontWeight: "700" },
  activeFilterChipText: {
    color: "#FFF",
    fontWeight: "700",
  },
  activeFiltersBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F1EC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  activeFiltersCount: {
    color: "#1F5D4C",
    fontSize: 12,
    fontWeight: "700",
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(195, 83, 91, 0.1)",
  },
  resetBtnText: {
    color: "#C3535B",
    fontSize: 12,
    fontWeight: "700",
  },
});
