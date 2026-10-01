import { StatusBar } from "expo-status-bar";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { EmptyState } from "./components/EmptyState";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SavedPage } from "./pages/SavedPage";
import { seedListings } from "./data";
import { auth, db, firebaseConfigured } from "./firebase";
import { Listing, Tab } from "./types";

async function registerUser(user: User) {
  if (!db) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      displayName:
        user.displayName || user.email?.split("@")[0] || "Campus student",
      email: user.email || "",
      photoURL: user.photoURL || null,
      campus: "North Campus",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Explore");
  const [items, setItems] = useState(seedListings);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("All items");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = (nextUser: User | null) => {
      setUser(nextUser);
      if (nextUser)
        registerUser(nextUser)
          .then(() => setProfileReady(true))
          .catch((error) =>
            setAuthError(
              error instanceof Error
                ? error.message
                : "Could not create profile.",
            ),
          );
      else setProfileReady(false);
    };
    let unsubscribe: () => void = () => undefined;
    setPersistence(firebaseAuth, browserLocalPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(firebaseAuth, handleUser);
        return getRedirectResult(firebaseAuth);
      })
      .then((result) => {
        if (result?.user) handleUser(result.user);
      })
      .catch((error) =>
        setAuthError(
          error instanceof Error
            ? error.message
            : "Google sign-in could not be completed.",
        ),
      );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const listingsQuery = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      listingsQuery,
      (snapshot) =>
        setItems(
          snapshot.empty
            ? seedListings
            : snapshot.docs.map(
                (entry) => ({ id: entry.id, ...entry.data() }) as Listing,
              ),
        ),
      () => setItems(seedListings),
    );
  }, []);

  const filteredItems = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchesCategory =
        category === "All items" || item.category === category;
      if (!matchesCategory) return false;

      const matchesPrice =
        maxPrice === null || item.price <= maxPrice;
      if (!matchesPrice) return false;

      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.campus && item.campus.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });

    return result.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });
  }, [category, items, maxPrice, queryText, sortBy]);

  const resetFilters = () => {
    setQueryText("");
    setCategory("All items");
    setMaxPrice(null);
    setSortBy("newest");
  };
  const myListings = useMemo(
    () => (user ? items.filter((item) => item.sellerId === user.uid) : []),
    [items, user],
  );
  const toggleSaved = (id: string) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const signInWithGoogle = async () => {
    if (!auth) {
      // In demo mode without Firebase credentials, allow signing in as a demo student
      const demoUser = {
        uid: "demo-student-1",
        displayName: "Jordan K.",
        email: "jordan@campus.edu",
        photoURL: null,
      } as unknown as User;
      setUser(demoUser);
      setProfileReady(true);
      setAuthOpen(false);
      return;
    }
    setAuthError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (Platform.OS === "web") {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await registerUser(result.user);
        setUser(result.user);
        setProfileReady(true);
        setAuthOpen(false);
      } else {
        await signInAnonymously(auth);
        setAuthOpen(false);
      }
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "Google sign-in failed.";
      if (
        Platform.OS === "web" &&
        /popup|cancelled-popup-request/i.test(code)
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      setAuthError(code);
      Alert.alert("Google sign-in failed", code);
    }
  };
  const publish = async (
    title: string,
    price: string,
    listingCategory: string,
  ) => {
    if (!user) {
      setSellOpen(false);
      setAuthOpen(true);
      return;
    }
    const newListing: Listing = {
      id: String(Date.now()),
      title,
      price: Number(price),
      category: listingCategory,
      seller: user.displayName || user.email || "You",
      sellerId: user.uid,
      campus: "North Campus",
      condition: "Good condition",
      image: seedListings[0].image,
      description: "New listing from a campus seller.",
      status: "available",
    };
    if (db) {
      const docRef = await addDoc(collection(db, "listings"), {
        ...newListing,
        createdAt: serverTimestamp(),
      });
      newListing.id = docRef.id;
    } else {
      setItems((prev) => [newListing, ...prev]);
    }
    setSellOpen(false);
  };
  const markAsSold = async (listingId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const targetItem = items.find((item) => item.id === listingId);
    if (!targetItem) return;

    // Security check: only the seller can mark their listing as sold
    if (targetItem.sellerId && targetItem.sellerId !== user.uid) {
      Alert.alert(
        "Permission denied",
        "Only the seller/owner of this listing can mark it as sold."
      );
      return;
    }

    try {
      if (db) {
        await updateDoc(doc(db, "listings", listingId), {
          status: "sold",
          updatedAt: serverTimestamp(),
        });
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, status: "sold" } : item
        )
      );
      setSelected((prev) =>
        prev && prev.id === listingId ? { ...prev, status: "sold" } : prev
      );
      Alert.alert("Item Sold", "Your listing has been successfully marked as sold.");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Could not update listing.";
      Alert.alert("Error", msg);
    }
  };
  const contactSeller = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSelected(null);
    setTab("Messages");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {tab === "Explore" && (
        <ExplorePage
          items={filteredItems}
          query={queryText}
          category={category}
          maxPrice={maxPrice}
          sortBy={sortBy}
          savedIds={savedIds}
          onQueryChange={setQueryText}
          onCategoryChange={setCategory}
          onMaxPriceChange={setMaxPrice}
          onSortByChange={setSortBy}
          onResetFilters={resetFilters}
          onSave={toggleSaved}
          onOpen={setSelected}
          onProfile={() => setTab("Profile")}
        />
      )}
      {tab === "Saved" && (
        <SavedPage
          items={items.filter((item) => savedIds.includes(item.id))}
          onSave={toggleSaved}
          onOpen={setSelected}
        />
      )}
      {tab === "Messages" && (
        <MessagesPage onBrowse={() => setTab("Explore")} />
      )}
      {tab === "MyListings" && (
        <MyListingsPage
          items={myListings}
          onOpen={setSelected}
          onSell={() => setSellOpen(true)}
        />
      )}
      {tab === "Profile" && (
        <ProfilePage
          user={user}
          savedCount={savedIds.length}
          listingCount={myListings.length}
          firebaseConfigured={firebaseConfigured}
          profileReady={profileReady}
          error={authError}
          onMyListings={() => (user ? setTab("MyListings") : setAuthOpen(true))}
          onSaved={() => setTab("Saved")}
          onSignIn={() => setAuthOpen(true)}
          onSignOut={() => {
            if (auth) signOut(auth);
            setUser(null);
          }}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        onChange={setTab}
        onSell={() => setSellOpen(true)}
      />
      <ListingModal
        item={selected}
        user={user}
        onClose={() => setSelected(null)}
        onContact={contactSeller}
        onMarkAsSold={markAsSold}
      />
      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={signInWithGoogle}
        error={authError}
      />
      <SellModal
        visible={sellOpen}
        onClose={() => setSellOpen(false)}
        onSubmit={publish}
      />
    </SafeAreaView>
  );
}

function BottomNav({
  tab,
  savedCount,
  onChange,
  onSell,
}: {
  tab: Tab;
  savedCount: number;
  onChange: (tab: Tab) => void;
  onSell: () => void;
}) {
  return (
    <View style={styles.nav}>
      <NavItem
        label="Explore"
        icon="⌂"
        active={tab === "Explore"}
        onPress={() => onChange("Explore")}
      />
      <NavItem
        label="Saved"
        icon="♡"
        active={tab === "Saved"}
        badge={savedCount}
        onPress={() => onChange("Saved")}
      />
      <NavItem
        label="Messages"
        icon="□"
        active={tab === "Messages"}
        onPress={() => onChange("Messages")}
      />
      <Pressable style={styles.sellButton} onPress={onSell}>
        <Text style={styles.sellPlus}>＋</Text>
        <Text style={styles.sellText}>Sell</Text>
      </Pressable>
    </View>
  );
}
function NavItem({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <View>
        <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </Pressable>
  );
}
function ListingModal({
  item,
  user,
  onClose,
  onContact,
  onMarkAsSold,
}: {
  item: Listing | null;
  user: User | null;
  onClose: () => void;
  onContact: () => void;
  onMarkAsSold: (id: string) => void;
}) {
  const isOwner = Boolean(user && item?.sellerId && user.uid === item.sellerId);
  const isSold = item?.status === "sold";

  const handleConfirmMarkSold = () => {
    if (!item) return;
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.confirm
    ) {
      if (window.confirm("Are you sure you want to mark this item as sold?")) {
        onMarkAsSold(item.id);
      }
    } else {
      Alert.alert(
        "Mark as Sold",
        "Are you sure you want to mark this item as sold?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark as Sold",
            style: "destructive",
            onPress: () => onMarkAsSold(item.id),
          },
        ],
      );
    }
  };

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {item && (
        <View style={styles.backdrop}>
          <View style={styles.detail}>
            <View style={styles.detailPhotoContainer}>
              <Image source={{ uri: item.image }} style={styles.detailImage} />
              {isSold && (
                <View style={styles.modalSoldBadge}>
                  <Text style={styles.modalSoldBadgeText}>SOLD</Text>
                </View>
              )}
              <Pressable style={styles.close} onPress={onClose}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.detailBody}>
              <View style={styles.detailCategoryRow}>
                <Text style={styles.detailCategory}>
                  {item.category.toUpperCase()}
                </Text>
                {isSold && (
                  <View style={styles.soldInlineTag}>
                    <Text style={styles.soldInlineTagText}>SOLD</Text>
                  </View>
                )}
              </View>
              <Text style={styles.detailTitle}>{item.title}</Text>
              <Text
                style={[
                  styles.detailPrice,
                  isSold && styles.detailPriceSold,
                ]}
              >
                ${item.price}
              </Text>
              <Text style={styles.muted}>
                {item.condition} · {item.campus} · {item.seller}
              </Text>
              <Text style={styles.description}>{item.description}</Text>

              {/* Action buttons */}
              {isOwner ? (
                isSold ? (
                  <View style={styles.soldNoticeBox}>
                    <Text style={styles.soldNoticeText}>
                      ✓ You have marked this item as sold
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.markSoldButton}
                    onPress={handleConfirmMarkSold}
                  >
                    <Text style={styles.markSoldButtonText}>
                      ✓ Mark as Sold
                    </Text>
                  </Pressable>
                )
              ) : isSold ? (
                <View style={styles.soldNoticeBox}>
                  <Text style={styles.soldNoticeText}>
                    This item has been sold
                  </Text>
                </View>
              ) : (
                <Pressable style={styles.primary} onPress={onContact}>
                  <Text style={styles.primaryText}>
                    {user
                      ? `Message ${item.seller}`
                      : "Sign in to contact seller"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
function AuthModal({
  visible,
  onClose,
  onSignIn,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  error: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.auth}>
          <Text style={styles.formTitle}>Welcome to campus marketplace</Text>
          <Text style={styles.authMessage}>
            Sign in to save listings, message sellers, and publish your own
            items.
          </Text>
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          <Pressable style={styles.googleButton} onPress={onSignIn}>
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.outlineText}>Continue with Google</Text>
          </Pressable>
          <Pressable style={styles.outline} onPress={onClose}>
            <Text style={styles.outlineText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function SellModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, price: string, category: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Textbooks");
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Sell an item</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>What are you selling?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Organic Chemistry textbook"
            style={styles.field}
          />
          <Text style={styles.label}>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="$ 0"
            style={styles.field}
          />
          <Pressable
            disabled={!title || !price}
            style={[styles.primary, (!title || !price) && styles.disabled]}
            onPress={() => onSubmit(title, price, category)}
          >
            <Text style={styles.primaryText}>Publish listing</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F4" },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EBE5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", minWidth: 54 },
  navIcon: { color: "#83918A", fontSize: 22 },
  navLabel: { color: "#83918A", fontSize: 10, marginTop: 3 },
  navActive: { color: "#1D6B54" },
  badge: {
    position: "absolute",
    right: -12,
    top: -3,
    backgroundColor: "#C3535B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
  },
  badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  sellButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6F0E6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 4,
  },
  sellPlus: { color: "#247055", fontSize: 20 },
  sellText: { color: "#247055", fontWeight: "800", fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },
  detail: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  detailPhotoContainer: {
    position: "relative",
  },
  modalSoldBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#173C34",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 2,
  },
  modalSoldBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  detailImage: { width: "100%", height: 230 },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  closeText: { color: "#173C34", fontSize: 26 },
  detailBody: { padding: 24 },
  detailCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailCategory: {
    color: "#23775D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  soldInlineTag: {
    backgroundColor: "#E6ECE3",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldInlineTagText: {
    color: "#173C34",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  detailTitle: {
    color: "#173C34",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 8,
  },
  detailPrice: {
    color: "#1C7057",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  detailPriceSold: {
    color: "#87918C",
    textDecorationLine: "line-through",
  },
  muted: { color: "#87918C", fontSize: 12 },
  description: {
    color: "#66736D",
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 20,
  },
  markSoldButton: {
    height: 50,
    backgroundColor: "#173C34",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#173C34",
  },
  markSoldButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  soldNoticeBox: {
    height: 50,
    backgroundColor: "#EEF3ED",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#D9E3D7",
  },
  soldNoticeText: {
    color: "#466258",
    fontWeight: "700",
    fontSize: 13,
  },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  auth: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, margin: 20 },
  form: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { color: "#173C34", fontSize: 22, fontWeight: "800" },
  authMessage: { color: "#87918C", lineHeight: 20, marginTop: 10 },
  authError: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    marginTop: 16,
  },
  googleButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDD8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 10,
  },
  googleMark: { color: "#4285F4", fontSize: 18, fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { color: "#1F5D4C", fontWeight: "800" },
  label: {
    color: "#365B4C",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
  },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE4DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#173C34",
  },
  disabled: { opacity: 0.45 },
});
