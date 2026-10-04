import { StatusBar } from "expo-status-bar";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "./components/EmptyState";
import { AuthModal } from "./components/AuthModal";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { OffersPage } from "./pages/OffersPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SavedPage } from "./pages/SavedPage";
import { seedListings } from "./data";
import { auth, db, firebaseConfigured } from "./firebase";
import {
  confirmPhoneVerification,
  getAuthErrorMessage,
  getPendingPhoneNumber,
  requestPasswordReset,
  sendPhoneVerificationCode,
  signInWithEmail,
  signUpWithEmail,
} from "./auth";
import { createListing, updateListing, updateListingStatus } from "./listings";
import { convertToUsd, Currency, fetchUsdToLkrRate, formatPrice } from "./currency";
import {
  loadLocalUserSettings,
  parseUserSettings,
  saveLocalUserSettings,
  UserSettings,
} from "./settings";
import { AppTheme, ThemeColors, themeColors } from "./theme";
import {
  ensureUserProfile,
  saveListingPhoto,
  saveProfilePhoto,
  saveUserSettings,
} from "./userData";
import { Listing, Tab } from "./types";

// ─── Category list (for the sell modal picker) ───────────────────────────────
const SELL_CATEGORIES = [
  "Textbooks",
  "Electronics",
  "Furniture",
  "Clothing",
  "Sports",
  "Stationery",
  "Other",
];

const CONDITION_OPTIONS = ["Like New", "Good condition", "Fair", "For Parts"];

export default function App() {
  return (
    <SafeAreaProvider>
      <MarketplaceApp />
    </SafeAreaProvider>
  );
}

function MarketplaceApp() {
  const [tab, setTab] = useState<Tab>("Explore");
  const [items, setItems] = useState<Listing[]>(db ? [] : seedListings);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("All items");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [authError, setAuthError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(loadLocalUserSettings);
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [startConversationUserId, setStartConversationUserId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState("");
  const [offerClock, setOfferClock] = useState(Date.now());
  const authFlowPending = useRef(false);
  const colors = themeColors[settings.theme];

  useEffect(() => {
    const timer = setInterval(() => setOfferClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = (nextUser: User | null) => {
      if (!nextUser) {
        if (!authFlowPending.current) {
          setUser(null);
          setPendingPhoneNumber(null);
        }
        return;
      }
      if (authFlowPending.current) return;
      if (Platform.OS !== "web") {
        setUser(nextUser);
        return;
      }

      authFlowPending.current = true;
      getPendingPhoneNumber(nextUser.uid)
        .then((phoneNumber) => {
          if (firebaseAuth.currentUser?.uid !== nextUser.uid) return;
          if (phoneNumber) {
            setUser(null);
            setPendingPhoneNumber(phoneNumber);
            setAuthOpen(true);
            setAuthError("");
            setTab("Explore");
            return;
          }
          setPendingPhoneNumber(null);
          setUser(nextUser);
        })
        .catch((error) => {
          if (firebaseAuth.currentUser?.uid !== nextUser.uid) return;
          setUser(null);
          setAuthOpen(true);
          setAuthError(
            error instanceof Error
              ? error.message
              : "Could not check your phone verification status.",
          );
        })
        .finally(() => {
          authFlowPending.current = false;
        });
    };
    let unsubscribe: () => void = () => undefined;
    const persistence =
      Platform.OS === "web"
        ? setPersistence(firebaseAuth, browserLocalPersistence)
        : Promise.resolve();
    persistence
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
            : "Could not initialize Firebase Authentication.",
        ),
      );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileReady(false);
      setProfilePhotoURL(null);
      setProfileUsername("");
      setSettings(loadLocalUserSettings());
      return;
    }
    const firestore = db;
    if (!firestore) {
      setProfilePhotoURL(user.photoURL);
      setProfileReady(true);
      return;
    }

    let active = true;
    let unsubscribe: () => void = () => {};
    setProfileReady(false);
    ensureUserProfile(user)
      .then(() => {
        if (!active) return;
        unsubscribe = onSnapshot(
          doc(firestore, "users", user.uid),
          (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            setProfilePhotoURL(
              typeof data.photoURL === "string" ? data.photoURL : user.photoURL,
            );
            setProfileUsername(typeof data.username === "string" ? data.username : "");
            const loadedSettings = parseUserSettings(data.settings);
            setSettings(loadedSettings);
            saveLocalUserSettings(loadedSettings);
            setProfileReady(true);
            setAuthError("");
          },
          (error) => {
            if (!active) return;
            setAuthError(
              error instanceof Error
                ? error.message
                : "Could not load your saved profile.",
            );
          },
        );
      })
      .catch((error) => {
        if (active) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Could not create your saved profile.",
          );
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !db || settings.currency !== "LKR") return;
    const rateIsFresh =
      settings.exchangeRateUpdatedAt !== undefined &&
      Date.now() - settings.exchangeRateUpdatedAt < 24 * 60 * 60 * 1000;
    if (rateIsFresh) return;

    let active = true;
    fetchUsdToLkrRate()
      .then(async (exchangeRate) => {
        if (!active) return;
        const rateSettings = {
          exchangeRate,
          exchangeRateUpdatedAt: Date.now(),
        };
        await saveUserSettings(user.uid, rateSettings);
        if (active) {
          setSettings((current) => ({ ...current, ...rateSettings }));
          setExchangeRateError("");
        }
      })
      .catch((error) => {
        if (active) {
          setExchangeRateError(
            error instanceof Error
              ? error.message
              : "Could not refresh the USD/LKR exchange rate.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [settings.currency, settings.exchangeRateUpdatedAt, user]);

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
          snapshot.docs.map(
            (entry) =>             ({ ...entry.data(), id: entry.id }) as Listing,
          ),
        ),
      (error) =>
        setAuthError(
          error instanceof Error
            ? error.message
            : "Could not load listings from Firebase.",
        ),
    );
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setSavedIds([]);
      return;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "saved"),
      (snapshot) => setSavedIds(snapshot.docs.map((entry) => entry.id)),
      (error) => setAuthError(error.message || "Could not load saved listings."),
    );
  }, [user]);

  const filteredItems = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchesCategory =
        category === "All items" || item.category === category;
      if (!matchesCategory) return false;

      const matchesPrice =
        (maxPrice === null || minPrice <= maxPrice) &&
        item.price >= minPrice &&
        (maxPrice === null || item.price <= maxPrice);
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
  }, [category, items, maxPrice, minPrice, queryText, sortBy]);

  const resetFilters = () => {
    setQueryText("");
    setCategory("All items");
    setMinPrice(0);
    setMaxPrice(null);
    setSortBy("newest");
  };
  const myListings = useMemo(
    () => (user ? items.filter((item) => item.sellerId === user.uid) : []),
    [items, user],
  );
  const activeOffers = useMemo(
    () =>
      items.filter((item) => {
        if (item.status === "sold" || !item.offer) return false;
        return !item.offer.expiresAt || Date.parse(item.offer.expiresAt) > offerClock;
      }),
    [items, offerClock],
  );
  const selectedItem = useMemo(
    () =>
      selected
        ? items.find((item) => item.id === selected.id) || selected
        : null,
    [items, selected],
  );
  const requestSignIn = (destination?: Tab) => {
    if (destination) setPendingTab(destination);
    setAuthError("");
    setAuthOpen(true);
  };
  const editListing = (listing: Listing) => {
    setEditingListing(listing);
    setSelected(null);
    setSellOpen(true);
  };
  const navigateToTab = (destination: Tab) => {
    if (!user && destination !== "Explore" && destination !== "Profile" && destination !== "Offers") {
      requestSignIn(destination);
      return;
    }
    setTab(destination);
  };
  const completeSignIn = (
    signedInUser: User,
    destination: Tab = pendingTab || "Explore",
  ) => {
    authFlowPending.current = false;
    setPendingPhoneNumber(null);
    setUser(signedInUser);
    setAuthOpen(false);
    setAuthError("");
    setTab(destination);
    setPendingTab(null);
  };
  const toggleSaved = (id: string) => {
    if (!user) {
      requestSignIn();
      return;
    }
    const isSaved = savedIds.includes(id);
    if (!db) {
      setSavedIds((current) =>
        isSaved ? current.filter((value) => value !== id) : [...current, id],
      );
      return;
    }
    const savedRef = doc(db, "users", user.uid, "saved", id);
    (isSaved ? deleteDoc(savedRef) : setDoc(savedRef, { listingId: id }))
      .catch((error: unknown) =>
        Alert.alert(
          "Could not update saved items",
          error instanceof Error ? error.message : "Please try again.",
        ),
      );
  };
  const changeTheme = async (theme: AppTheme) => {
    try {
      if (user && db) await saveUserSettings(user.uid, { theme });
      setSettings((current) => {
        const updated = { ...current, theme };
        saveLocalUserSettings(updated);
        return updated;
      });
    } catch (error) {
      Alert.alert(
        "Could not save setting",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const changeCurrency = async (currency: Currency) => {
    setExchangeRateError("");
    const changes: Partial<UserSettings> = { currency };
    if (currency === "LKR") {
      try {
        const exchangeRate = await fetchUsdToLkrRate();
        Object.assign(changes, {
          exchangeRate,
          exchangeRateUpdatedAt: Date.now(),
        });
      } catch (error) {
        if (!settings.exchangeRate) {
          setExchangeRateError(
            error instanceof Error
              ? error.message
              : "Could not load the USD/LKR exchange rate.",
          );
          Alert.alert(
            "Currency unavailable",
            "LKR cannot be selected until an exchange rate is available.",
          );
          return;
        }
        changes.exchangeRate = settings.exchangeRate;
        setExchangeRateError(
          "Could not refresh the rate. Using your previously cached exchange rate.",
        );
      }
    }
    try {
      if (user && db) await saveUserSettings(user.uid, changes);
      setSettings((current) => {
        const updated = { ...current, ...changes };
        saveLocalUserSettings(updated);
        return updated;
      });
    } catch (error) {
      Alert.alert(
        "Could not save setting",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const uploadPhoto = async () => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Allow photo library access to choose a profile photo.");
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        throw new Error("The selected image could not be read. Please choose another image.");
      }
      const imageSize = asset.fileSize ?? Math.ceil((asset.base64.length * 3) / 4);
      if (imageSize >= 5 * 1024 * 1024) {
        throw new Error("Choose an image smaller than 5 MB.");
      }
      const photoURL = await saveProfilePhoto(
        user.uid,
        asset.base64,
        asset.mimeType || "image/jpeg",
      );
      await updateProfile(user, { photoURL });
      setProfilePhotoURL(photoURL);
    } catch (error) {
      Alert.alert(
        "Could not update profile photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPhotoBusy(false);
    }
  };
  const submitEmailAuth = async (
    displayName: string,
    email: string,
    password: string,
    phoneNumber: string,
    isSignUp: boolean,
  ) => {
    authFlowPending.current = true;
    setAuthError("");
    try {
      if (isSignUp) {
        const signedInUser = await signUpWithEmail(
          displayName,
          email,
          password,
          Platform.OS === "web" ? phoneNumber : undefined,
        );
        if (Platform.OS === "web") {
          setPendingPhoneNumber(phoneNumber);
          try {
            const verificationId = await sendPhoneVerificationCode(phoneNumber);
            return { phoneNumber, verificationId };
          } catch (error) {
            const message = getAuthErrorMessage(error);
            setAuthError(message);
            return { phoneNumber, verificationError: message };
          }
        }
        completeSignIn(signedInUser);
        return {};
      }

      const result = await signInWithEmail(email, password);
      if (Platform.OS === "web" && result.pendingPhoneNumber) {
        setPendingPhoneNumber(result.pendingPhoneNumber);
        try {
          const verificationId = await sendPhoneVerificationCode(
            result.pendingPhoneNumber,
          );
          return {
            phoneNumber: result.pendingPhoneNumber,
            verificationId,
          };
        } catch (error) {
          const message = getAuthErrorMessage(error);
          setAuthError(message);
          return {
            phoneNumber: result.pendingPhoneNumber,
            verificationError: message,
          };
        }
      }

      const signedInUser = result.user;
      completeSignIn(signedInUser);
      return {};
    } catch (error) {
      authFlowPending.current = false;
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };
  const resendPhoneVerificationCode = async (phoneNumber: string) => {
    try {
      return await sendPhoneVerificationCode(phoneNumber);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };
  const verifyPhoneCode = async (verificationId: string, code: string) => {
    try {
      if (!auth?.currentUser) {
        throw new Error("Your sign-in session ended. Please sign in again.");
      }
      await confirmPhoneVerification(auth.currentUser, verificationId, code);
      completeSignIn(auth.currentUser, "Explore");
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };
  const sendPasswordReset = async (email: string) => {
    try {
      await requestPasswordReset(email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };
  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error(
        "Firebase is not configured. Add your Firebase Web app values to .env and restart Expo.",
      );
    }
    setAuthError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureUserProfile(result.user);
      completeSignIn(result.user);
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
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  /**
   * publish — called from SellModal with optional base64 image data
   */
  const publish = async (
    title: string,
    price: string,
    listingCategory: string,
    description: string,
    condition: string,
    imageBase64?: string,
    imageMimeType?: string,
    offerInput?: {
      title: string;
      offerPrice: string;
      discountPercent: string;
      description: string;
      expiresAt: string;
    },
  ): Promise<boolean> => {
    if (!user) {
      setSellOpen(false);
      requestSignIn();
      return false;
    }
    if (editingListing && editingListing.sellerId !== user.uid) {
      Alert.alert("Permission denied", "Only the owner of this listing can edit it.");
      return false;
    }
    const enteredPrice = Number(price);
    if (!title.trim() || !Number.isFinite(enteredPrice) || enteredPrice <= 0) {
      Alert.alert("Check listing details", "Enter a title and a price greater than zero.");
      return false;
    }
    if (title.trim().length > 100 || description.trim().length > 2000) {
      Alert.alert("Check listing details", "Titles must be 100 characters or fewer and descriptions 2,000 characters or fewer.");
      return false;
    }
    let priceInUsd: number;
    try {
      priceInUsd = convertToUsd(enteredPrice, settings.currency, settings.exchangeRate);
    } catch (error) {
      Alert.alert(
        "Could not convert price",
        error instanceof Error ? error.message : "Please try again.",
      );
      return false;
    }
    const tempId = editingListing?.id || String(Date.now());
    let imageUrl = editingListing?.image || seedListings[0].image;

    let offer: Listing["offer"];
    if (offerInput?.title.trim()) {
      if (offerInput.title.trim().length > 100 || offerInput.description.trim().length > 2000) {
        Alert.alert("Check special offer", "Offer titles must be 100 characters or fewer and descriptions 2,000 characters or fewer.");
        return false;
      }
      const enteredOfferPrice = Number(offerInput.offerPrice);
      const discount = Number(offerInput.discountPercent);
      const hasPrice = offerInput.offerPrice.trim().length > 0;
      const hasDiscount = offerInput.discountPercent.trim().length > 0;
      if (!hasPrice && !hasDiscount) {
        Alert.alert("Check special offer", "Enter an offer price or discount percentage.");
        return false;
      }
      if (hasDiscount && (!Number.isFinite(discount) || discount <= 0 || discount >= 100)) {
        Alert.alert("Check special offer", "Discount must be greater than 0% and less than 100%.");
        return false;
      }
      if (hasPrice && (!Number.isFinite(enteredOfferPrice) || enteredOfferPrice <= 0 || enteredOfferPrice >= enteredPrice)) {
        Alert.alert("Check special offer", "Offer price must be greater than zero and below the original price.");
        return false;
      }
      if (offerInput.expiresAt.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(offerInput.expiresAt.trim())) {
        Alert.alert("Check offer expiry", "Enter a date in YYYY-MM-DD format.");
        return false;
      }
      const parsedExpiry = offerInput.expiresAt.trim()
        ? new Date(`${offerInput.expiresAt.trim()}T23:59:59.999Z`)
        : null;
      if (
        parsedExpiry &&
        (!Number.isFinite(parsedExpiry.getTime()) ||
          parsedExpiry.toISOString().slice(0, 10) !== offerInput.expiresAt.trim() ||
          parsedExpiry.getTime() <= Date.now())
      ) {
        Alert.alert("Check offer expiry", "Offer expiry must be a future date.");
        return false;
      }
      const offerDisplayPrice = hasPrice
        ? enteredOfferPrice
        : enteredPrice * (1 - discount / 100);
      let offerPriceUsd: number;
      try {
        offerPriceUsd = convertToUsd(offerDisplayPrice, settings.currency, settings.exchangeRate);
      } catch (error) {
        Alert.alert("Could not convert offer price", error instanceof Error ? error.message : "Please try again.");
        return false;
      }
      offer = {
        title: offerInput.title.trim(),
        originalPrice: priceInUsd,
        offerPrice: offerPriceUsd,
        ...(offerInput.description.trim() ? { description: offerInput.description.trim() } : {}),
        ...(parsedExpiry ? { expiresAt: parsedExpiry.toISOString() } : {}),
      };
    } else if (offerInput && (offerInput.offerPrice.trim() || offerInput.discountPercent.trim())) {
      Alert.alert("Check special offer", "Add an offer title or clear the offer price and discount.");
      return false;
    }

    if (imageBase64) {
      try {
        imageUrl = await saveListingPhoto(
          user.uid,
          tempId,
          imageBase64,
          imageMimeType || "image/jpeg",
        );
      } catch (error) {
        Alert.alert(
          "Could not upload product photo",
          error instanceof Error ? error.message : "Please try again.",
        );
        return false;
      }
    }

    const newListing: Listing = {
      id: tempId,
      title: title.trim(),
      price: priceInUsd,
      category: listingCategory,
      seller: user.displayName || user.email || "You",
      sellerId: user.uid,
      campus: "North Campus",
      condition: condition || "Good condition",
      image: imageUrl,
      description: description.trim() || "New listing from a campus seller.",
      status: editingListing?.status || "available",
      ...(offer ? { offer } : {}),
    };
    try {
      if (db && editingListing) {
        await updateListing(newListing);
      } else if (db) {
        newListing.id = await createListing(newListing);
      } else {
        setItems((prev) =>
          editingListing
            ? prev.map((item) => item.id === editingListing.id ? newListing : item)
            : [newListing, ...prev],
        );
      }
      setSellOpen(false);
      setEditingListing(null);
      setSelected(null);
      return true;
    } catch (error) {
      Alert.alert(
        editingListing ? "Could not update listing" : "Could not publish listing",
        error instanceof Error ? error.message : "Please try again.",
      );
      return false;
    }
  };
  const changeListingStatus = async (listingId: string, status: "available" | "sold") => {
    if (!user) {
      requestSignIn();
      return;
    }
    const targetItem = items.find((item) => item.id === listingId);
    if (!targetItem) return;

    if (targetItem.sellerId !== user.uid) {
      Alert.alert(
        "Permission denied",
        "Only the seller/owner of this listing can mark it as sold."
      );
      return;
    }
    if (targetItem.status === status) {
      Alert.alert("Status unchanged", `This listing is already ${status === "sold" ? "sold out" : "available"}.`);
      return;
    }

    try {
      if (db) await updateListingStatus(listingId, user.uid, status);

      setItems((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, status } : item
        )
      );
      setSelected((prev) =>
        prev && prev.id === listingId ? { ...prev, status } : prev
      );
      Alert.alert("Listing updated", `The item is now ${status === "sold" ? "sold out" : "available"}.`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Could not update listing.";
      Alert.alert("Error", msg);
    }
  };
  const contactSeller = () => {
    const sellerId = selected?.sellerId;
    if (sellerId) setStartConversationUserId(sellerId);
    if (!user) {
      requestSignIn("Messages");
      return;
    }
    setSelected(null);
    setTab("Messages");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />
      {tab === "Explore" && (
        <ExplorePage
          items={filteredItems}
          query={queryText}
          category={category}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sortBy={sortBy}
          savedIds={savedIds}
          photoURL={profilePhotoURL}
          currency={settings.currency}
          exchangeRate={settings.exchangeRate}
          colors={colors}
          onQueryChange={setQueryText}
          onCategoryChange={setCategory}
          onMinPriceChange={setMinPrice}
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
          currency={settings.currency}
          exchangeRate={settings.exchangeRate}
          colors={colors}
          onSave={toggleSaved}
          onOpen={setSelected}
        />
      )}
      {tab === "Messages" && (
        user && profileReady ? (
          <MessagesPage
            user={user}
            username={profileUsername}
            photoURL={profilePhotoURL}
            startWithUserId={startConversationUserId}
            onStartHandled={() => setStartConversationUserId(null)}
            onBrowse={() => setTab("Explore")}
            colors={colors}
          />
        ) : user ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.muted, marginTop: 10 }}>Loading your private inbox…</Text>
          </View>
        ) : (
          <EmptyState
            colors={colors}
            title="Sign in to view messages"
            message="Your conversations are private to your account."
            action="Sign in"
            onAction={() => requestSignIn("Messages")}
          />
        )
      )}
      {tab === "Offers" && (
        <OffersPage
          items={activeOffers}
          currency={settings.currency}
          exchangeRate={settings.exchangeRate}
          colors={colors}
          onOpen={setSelected}
        />
      )}
      {tab === "MyListings" && (
        <MyListingsPage
          items={myListings}
          currency={settings.currency}
          exchangeRate={settings.exchangeRate}
          colors={colors}
          onOpen={setSelected}
          onSell={() => setSellOpen(true)}
        />
      )}
      {tab === "Profile" && (
        <ProfilePage
          user={user}
          photoURL={profilePhotoURL}
          username={profileUsername}
          photoBusy={photoBusy}
          colors={colors}
          savedCount={savedIds.length}
          listingCount={myListings.length}
          firebaseConfigured={firebaseConfigured}
          profileReady={profileReady}
          error={authError}
          onMyListings={() => navigateToTab("MyListings")}
          onSaved={() => navigateToTab("Saved")}
          onSignIn={() => requestSignIn()}
          onSettings={() => navigateToTab("Settings")}
          onUploadPhoto={uploadPhoto}
          onSignOut={() => {
            if (auth) {
              signOut(auth).catch((error) =>
                Alert.alert(
                  "Could not sign out",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
            } else {
              setUser(null);
            }
            setTab("Profile");
          }}
        />
      )}
      {tab === "Settings" && (
        <SettingsPage
          photoURL={profilePhotoURL}
          theme={settings.theme}
          currency={settings.currency}
          exchangeRate={settings.exchangeRate}
          exchangeRateError={exchangeRateError}
          photoBusy={photoBusy}
          colors={colors}
          onBack={() => setTab("Profile")}
          onUploadPhoto={uploadPhoto}
          onThemeChange={changeTheme}
          onCurrencyChange={changeCurrency}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        onChange={navigateToTab}
        onSell={() => {
          if (!user) {
            requestSignIn();
            return;
          }
          setSellOpen(true);
        }}
        colors={colors}
      />
      <ListingModal
        item={selectedItem}
        user={user}
        onClose={() => setSelected(null)}
        onContact={contactSeller}
        onStatusChange={changeListingStatus}
        onEdit={editListing}
        currency={settings.currency}
        exchangeRate={settings.exchangeRate}
        colors={colors}
      />
      <AuthModal
        visible={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingTab(null);
          setPendingPhoneNumber(null);
          setAuthError("");
          if (authFlowPending.current) {
            authFlowPending.current = false;
            if (auth) {
              signOut(auth).catch((error) =>
                Alert.alert(
                  "Could not cancel verification",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
            }
          }
        }}
        onClearError={() => setAuthError("")}
        onSubmit={submitEmailAuth}
        onResendCode={resendPhoneVerificationCode}
        onVerifyCode={verifyPhoneCode}
        onForgotPassword={sendPasswordReset}
        onGoogleSignIn={firebaseConfigured && Platform.OS === "web" ? signInWithGoogle : undefined}
        smsVerificationAvailable={Platform.OS === "web"}
        pendingPhoneNumber={pendingPhoneNumber}
        error={
          authError ||
          (!firebaseConfigured
            ? "Firebase is not configured. Add the Firebase Web app values to .env and restart Expo."
            : "")
        }
        colors={themeColors.light}
      />
      <SellModal
        visible={sellOpen}
        editingListing={editingListing}
        onClose={() => {
          setSellOpen(false);
          setEditingListing(null);
        }}
        onSubmit={publish}
        currency={settings.currency}
        exchangeRate={settings.exchangeRate}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

function BottomNav({
  tab,
  savedCount,
  onChange,
  onSell,
  colors,
}: {
  tab: Tab;
  savedCount: number;
  onChange: (tab: Tab) => void;
  onSell: () => void;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.nav,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          shadowColor: colors.text,
        },
      ]}
    >
      <NavItem
        label="Explore"
        icon="⌂"
        active={tab === "Explore"}
        onPress={() => onChange("Explore")}
        colors={colors}
      />
      <NavItem
        label="Saved"
        icon="♡"
        active={tab === "Saved"}
        badge={savedCount}
        onPress={() => onChange("Saved")}
        colors={colors}
      />
      <NavItem
        label="Offers"
        icon="％"
        active={tab === "Offers"}
        onPress={() => onChange("Offers")}
        colors={colors}
      />
      {/* Centre sell button */}
      <Pressable
        style={[styles.sellButton, { backgroundColor: colors.accent }]}
        onPress={onSell}
        accessibilityLabel="Sell an item"
        accessibilityRole="button"
      >
        <Text style={[styles.sellPlus, { color: colors.accentText }]}>＋</Text>
      </Pressable>
      <NavItem
        label="Messages"
        icon="▤"
        active={tab === "Messages"}
        onPress={() => onChange("Messages")}
        colors={colors}
      />
      <NavItem
        label="Profile"
        icon="♙"
        active={tab === "Profile"}
        onPress={() => onChange("Profile")}
        colors={colors}
      />
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  badge,
  onPress,
  colors,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const iconScale = useRef(new Animated.Value(active ? 1.08 : 1)).current;
  const indicatorOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: active ? 1.12 : 1,
        useNativeDriver: Platform.OS !== "web",
        stiffness: 260,
        damping: 18,
        mass: 0.7,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: active ? 1 : 0,
        duration: 180,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [active, iconScale, indicatorOpacity]);

  return (
    <Pressable
      style={styles.navItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.navIconWrapper, { transform: [{ scale: iconScale }] }]}>
        <Text style={[styles.navIcon, { color: active ? colors.accent : colors.muted }]}>
          {icon}
        </Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text
        style={[
          styles.navLabel,
          { color: active ? colors.accent : colors.muted },
          active && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          styles.navIndicator,
          {
            backgroundColor: colors.accent,
            opacity: indicatorOpacity,
            transform: [{ scaleX: indicatorOpacity }],
          },
        ]}
      />
    </Pressable>
  );
}

// ─── Listing Detail Modal ─────────────────────────────────────────────────────

function ListingModal({
  item,
  user,
  onClose,
  onContact,
  onStatusChange,
  onEdit,
  currency,
  exchangeRate,
  colors,
}: {
  item: Listing | null;
  user: User | null;
  onClose: () => void;
  onContact: () => void;
  onStatusChange: (id: string, status: "available" | "sold") => void;
  onEdit: (item: Listing) => void;
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
}) {
  const isOwner = Boolean(user && item?.sellerId && user.uid === item.sellerId);
  const isSold = item?.status === "sold";
  const nextStatus = isSold ? "available" : "sold";

  const handleConfirmStatusChange = () => {
    if (!item) return;
    const action = isSold ? "make this item available again" : "mark this item as sold out";
    const applyStatus = () => onStatusChange(item.id, nextStatus);
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.confirm
    ) {
      if (window.confirm(`Are you sure you want to ${action}?`)) {
        applyStatus();
      }
    } else {
      Alert.alert(
        isSold ? "Make Available" : "Mark as Sold Out",
        `Are you sure you want to ${action}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: isSold ? "Make Available" : "Mark as Sold Out",
            style: "destructive",
            onPress: applyStatus,
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
          <View style={[styles.detail, { backgroundColor: colors.surface }]}>
            <View style={styles.detailPhotoContainer}>
              <Image source={{ uri: item.image }} style={styles.detailImage} />
              {isSold && (
                <View style={styles.modalSoldBadge}>
                  <Text style={styles.modalSoldBadgeText}>SOLD OUT</Text>
                </View>
              )}
              <Pressable style={[styles.close, { backgroundColor: colors.surface }]} onPress={onClose}>
                <Text style={[styles.closeText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
            <View style={styles.detailBody}>
              <View style={styles.detailCategoryRow}>
                <Text style={[styles.detailCategory, { color: colors.accent }]}>
                  {item.category.toUpperCase()}
                </Text>
                {isSold && (
                  <View style={styles.soldInlineTag}>
                    <Text style={styles.soldInlineTagText}>SOLD OUT</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{item.title}</Text>
              {item.offer && (
                <View style={[styles.offerDetail, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.offerDetailTitle, { color: colors.accent }]}>{item.offer.title}</Text>
                  <Text style={[styles.offerDetailPrice, { color: colors.accent }]}>
                    {formatPrice(item.offer.offerPrice, currency, exchangeRate)}{" "}
                    <Text style={styles.offerOriginal}>{formatPrice(item.offer.originalPrice, currency, exchangeRate)}</Text>
                  </Text>
                  <Text style={[styles.offerDetailMeta, { color: colors.muted }]}>
                    {Math.round((1 - item.offer.offerPrice / item.offer.originalPrice) * 100)}% off
                    {item.offer.expiresAt ? ` · Until ${new Date(item.offer.expiresAt).toLocaleDateString()}` : ""}
                  </Text>
                  {item.offer.description ? <Text style={[styles.offerDetailMeta, { color: colors.muted }]}>{item.offer.description}</Text> : null}
                </View>
              )}
              <Text
                style={[
                  styles.detailPrice,
                  { color: colors.accent },
                  isSold && styles.detailPriceSold,
                ]}
              >
                {formatPrice(item.offer?.offerPrice ?? item.price, currency, exchangeRate)}
              </Text>
              <Text style={[styles.muted, { color: colors.muted }]}>
                {item.condition} · {item.campus} · {item.seller}
              </Text>
              <Text style={[styles.description, { color: colors.muted }]}>{item.description}</Text>

              {/* Action buttons */}
              {isOwner ? (
                <>
                  <Pressable
                    style={[styles.editListingButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                    onPress={() => onEdit(item)}
                  >
                    <Text style={[styles.editListingText, { color: colors.accent }]}>Edit listing</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.markSoldButton, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                    onPress={handleConfirmStatusChange}
                  >
                    <Text style={[styles.markSoldButtonText, { color: colors.accentText }]}>
                      {isSold ? "↻ Make Available" : "✓ Mark as Sold Out"}
                    </Text>
                  </Pressable>
                  {isSold && (
                    <View style={[styles.soldNoticeBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                      <Text style={[styles.soldNoticeText, { color: colors.text }]}>This item is sold out to buyers.</Text>
                    </View>
                  )}
                </>
              ) : isSold ? (
                <View style={[styles.soldNoticeBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <Text style={[styles.soldNoticeText, { color: colors.text }]}>
                    This item is sold out
                  </Text>
                </View>
              ) : (
                <Pressable style={[styles.primary, { backgroundColor: colors.accent }]} onPress={onContact}>
                  <Text style={[styles.primaryText, { color: colors.accentText }]}>
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

// ─── Enhanced Sell Modal with Image Picker ────────────────────────────────────

function SellModal({
  visible,
  editingListing,
  onClose,
  onSubmit,
  currency,
  exchangeRate,
  colors,
}: {
  visible: boolean;
  editingListing: Listing | null;
  onClose: () => void;
  onSubmit: (
    title: string,
    price: string,
    category: string,
    description: string,
    condition: string,
    imageBase64?: string,
    imageMimeType?: string,
    offer?: {
      title: string;
      offerPrice: string;
      discountPercent: string;
      description: string;
      expiresAt: string;
    },
  ) => Promise<boolean>;
  currency: Currency;
  exchangeRate?: number;
  colors: ThemeColors;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Textbooks");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("Good condition");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);
  const [imagePickBusy, setImagePickBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerExpiry, setOfferExpiry] = useState("");

  const validPrice = Number.isFinite(Number(price)) && Number(price) > 0;
  const validOffer =
    !offerEnabled ||
    (offerTitle.trim().length > 0 &&
      ((offerPrice.trim().length > 0 &&
        Number.isFinite(Number(offerPrice)) &&
        Number(offerPrice) > 0 &&
        Number(offerPrice) < Number(price)) ||
        (offerPrice.trim().length === 0 &&
          Number.isFinite(Number(discountPercent)) &&
          Number(discountPercent) > 0 &&
          Number(discountPercent) < 100)));

  useEffect(() => {
    if (!visible) return;
    if (!editingListing) {
      resetForm();
      return;
    }
    const displayPrice = (usd: number) =>
      currency === "LKR" ? usd * (exchangeRate || 1) : usd;
    setTitle(editingListing.title);
    setPrice(String(displayPrice(editingListing.price)));
    setCategory(editingListing.category);
    setDescription(editingListing.description || "");
    setCondition(editingListing.condition);
    setImageUri(editingListing.image);
    setImageBase64(undefined);
    setImageMimeType(undefined);
    setOfferEnabled(Boolean(editingListing.offer));
    setOfferTitle(editingListing.offer?.title || "");
    setOfferPrice(
      editingListing.offer ? String(displayPrice(editingListing.offer.offerPrice)) : "",
    );
    setDiscountPercent(
      editingListing.offer
        ? String(Math.round((1 - editingListing.offer.offerPrice / editingListing.offer.originalPrice) * 100))
        : "",
    );
    setOfferDescription(editingListing.offer?.description || "");
    setOfferExpiry(editingListing.offer?.expiresAt?.slice(0, 10) || "");
  }, [visible, editingListing?.id, currency, exchangeRate]);

  const resetForm = () => {
    setTitle("");
    setPrice("");
    setCategory("Textbooks");
    setDescription("");
    setCondition("Good condition");
    setImageUri(null);
    setImageBase64(undefined);
    setImageMimeType(undefined);
    setSubmitting(false);
    setOfferEnabled(false);
    setOfferTitle("");
    setOfferPrice("");
    setDiscountPercent("");
    setOfferDescription("");
    setOfferExpiry("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImage = async () => {
    setImagePickBusy(true);
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission required", "Allow photo library access to add a product image.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const fileSize = asset.fileSize ?? Math.ceil(((asset.base64?.length ?? 0) * 3) / 4);
      if (fileSize >= 8 * 1024 * 1024) {
        Alert.alert("Image too large", "Please choose an image under 8 MB.");
        return;
      }
      setImageUri(asset.uri);
      setImageBase64(asset.base64 ?? undefined);
      setImageMimeType(asset.mimeType ?? "image/jpeg");
    } catch (error) {
      Alert.alert("Could not pick image", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setImagePickBusy(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const success = await onSubmit(
        title,
        price,
        category,
        description,
        condition,
        imageBase64,
        imageMimeType,
        offerEnabled
          ? {
              title: offerTitle,
              offerPrice,
              discountPercent,
              description: offerDescription,
              expiresAt: offerExpiry,
            }
          : undefined,
      );
      if (success) resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <ScrollView
          style={[styles.formScroll, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingListing ? "Edit listing" : "Sell an item"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={[styles.closeText, { color: colors.text }]}>×</Text>
            </Pressable>
          </View>

          {/* Product Image */}
          <Text style={[styles.label, { color: colors.text }]}>Product photo</Text>
          <Pressable
            onPress={pickImage}
            disabled={imagePickBusy}
            style={[
              styles.imagePicker,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pick product image"
          >
            {imagePickBusy ? (
              <ActivityIndicator color={colors.accent} />
            ) : imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={[styles.imageChangeOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                  <Text style={styles.imageChangeText}>Tap to change</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Text style={styles.imagePickerIcon}>📷</Text>
                <Text style={[styles.imagePickerLabel, { color: colors.muted }]}>
                  Add a photo
                </Text>
                <Text style={[styles.imagePickerSub, { color: colors.muted }]}>
                  Tap to choose from gallery
                </Text>
              </View>
            )}
          </Pressable>

          {/* Title */}
          <Text style={[styles.label, { color: colors.text }]}>What are you selling?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Organic Chemistry textbook"
            placeholderTextColor={colors.muted}
            style={[
              styles.field,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
            ]}
          />

          {/* Price with currency toggle hint */}
          <Text style={[styles.label, { color: colors.text }]}>
            Price ({currency}){" "}
            <Text style={[styles.currencyHint, { color: colors.muted }]}>
              — stored in USD
            </Text>
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder={formatPrice(0, currency, exchangeRate)}
            placeholderTextColor={colors.muted}
            style={[
              styles.field,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
            ]}
          />

          <Pressable
            onPress={() => setOfferEnabled((enabled) => !enabled)}
            style={[styles.offerToggle, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: offerEnabled }}
          >
            <Text style={[styles.offerToggleMark, { color: colors.accent }]}>{offerEnabled ? "✓" : "＋"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offerToggleTitle, { color: colors.text }]}>Add a special offer</Text>
              <Text style={[styles.offerToggleHint, { color: colors.muted }]}>Show a limited discount in Offers</Text>
            </View>
          </Pressable>
          {offerEnabled && (
            <View style={[styles.offerForm, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>Offer title</Text>
              <TextInput
                value={offerTitle}
                onChangeText={setOfferTitle}
                placeholder="e.g. Back-to-campus deal"
                placeholderTextColor={colors.muted}
                style={[styles.field, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[styles.label, { color: colors.text }]}>Offer price ({currency}) — or discount %</Text>
              <View style={styles.offerInputs}>
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  keyboardType="decimal-pad"
                  placeholder="Offer price"
                  placeholderTextColor={colors.muted}
                  style={[styles.field, styles.offerInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                />
                <TextInput
                  value={discountPercent}
                  onChangeText={setDiscountPercent}
                  keyboardType="decimal-pad"
                  placeholder="Discount %"
                  placeholderTextColor={colors.muted}
                  style={[styles.field, styles.offerInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                />
              </View>
              <Text style={[styles.currencyHint, { color: colors.muted }]}>If both are entered, offer price is used; original listing price is saved separately.</Text>
              <Text style={[styles.label, { color: colors.text }]}>Offer description (optional)</Text>
              <TextInput
                value={offerDescription}
                onChangeText={setOfferDescription}
                placeholder="Details about this special price"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.fieldMulti, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[styles.label, { color: colors.text }]}>Valid until (optional)</Text>
              <TextInput
                value={offerExpiry}
                onChangeText={setOfferExpiry}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={[styles.field, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
              />
              {!validOffer ? <Text style={styles.offerValidation}>Enter an offer title and a valid discounted price or percentage.</Text> : null}
            </View>
          )}

          {/* Category chips */}
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {SELL_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === cat ? colors.accent : colors.surfaceMuted,
                    borderColor: category === cat ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === cat ? colors.accentText : colors.muted },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Condition chips */}
          <Text style={[styles.label, { color: colors.text }]}>Condition</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CONDITION_OPTIONS.map((cond) => (
              <Pressable
                key={cond}
                onPress={() => setCondition(cond)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: condition === cond ? colors.accent : colors.surfaceMuted,
                    borderColor: condition === cond ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: condition === cond ? colors.accentText : colors.muted },
                  ]}
                >
                  {cond}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Description */}
          <Text style={[styles.label, { color: colors.text }]}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the item, any wear, included accessories..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={[
              styles.fieldMulti,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
            ]}
          />

          {/* Submit */}
          <Pressable
            disabled={!title.trim() || !validPrice || !validOffer || submitting}
            style={[
              styles.primary,
              { backgroundColor: colors.accent },
              (!title.trim() || !validPrice || !validOffer || submitting) && styles.disabled,
            ]}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={editingListing ? "Save listing changes" : "Publish listing"}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={[styles.primaryText, { color: colors.accentText }]}>
                {editingListing ? "Save changes" : "Publish listing"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F4" },

  // Bottom nav
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EBE5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  navItem: { alignItems: "center", flex: 1, minWidth: 42, paddingTop: 2, minHeight: 52, justifyContent: "center" },
  navIconWrapper: { position: "relative" },
  navIcon: { fontSize: 24, textAlign: "center", fontWeight: "500" },
  navLabel: { fontSize: 9, marginTop: 4, fontWeight: "600" },
  navLabelActive: { fontWeight: "800" },
  navIndicator: { width: 14, height: 3, borderRadius: 2, marginTop: 4 },
  badge: {
    position: "absolute",
    right: -10,
    top: -4,
    backgroundColor: "#C3535B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  sellButton: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "#1F5D4C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F5D4C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  sellPlus: { fontSize: 28, lineHeight: 32, fontWeight: "500" },

  // Modals
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },

  // Listing detail
  detail: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  detailPhotoContainer: { position: "relative" },
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
  detailImage: { width: "100%", height: 240 },
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
  detailTitle: { fontSize: 25, fontWeight: "800", marginTop: 8 },
  detailPrice: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  detailPriceSold: { color: "#87918C", textDecorationLine: "line-through" },
  offerDetail: { borderRadius: 12, padding: 12, marginTop: 12, gap: 4 },
  offerDetailTitle: { fontSize: 13, fontWeight: "900" },
  offerDetailPrice: { fontSize: 17, fontWeight: "900" },
  offerOriginal: { color: "#87918C", fontSize: 12, fontWeight: "600", textDecorationLine: "line-through" },
  offerDetailMeta: { fontSize: 11, lineHeight: 16 },
  muted: { fontSize: 12 },
  description: { fontSize: 14, lineHeight: 21, marginVertical: 20 },
  markSoldButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
  },
  editListingButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  editListingText: { fontWeight: "800", fontSize: 13 },
  markSoldButtonText: { fontWeight: "800", fontSize: 14 },
  soldNoticeBox: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
  },
  soldNoticeText: { fontWeight: "700", fontSize: 13 },
  primary: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { fontWeight: "800" },

  // Auth modal
  auth: { borderRadius: 20, padding: 24, margin: 20 },
  authMessage: { lineHeight: 20, marginTop: 10 },
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { fontWeight: "800" },

  // Sell modal
  formScroll: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  formScrollContent: { padding: 24, paddingBottom: 40 },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  formTitle: { fontSize: 22, fontWeight: "800" },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  currencyHint: { fontWeight: "500", textTransform: "none", fontSize: 11 },
  field: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  fieldMulti: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: "top",
  },
  offerToggle: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  offerToggleMark: { fontSize: 20, fontWeight: "900" },
  offerToggleTitle: { fontSize: 13, fontWeight: "800" },
  offerToggleHint: { fontSize: 11, marginTop: 2 },
  offerForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  offerInputs: { flexDirection: "row", gap: 8 },
  offerInput: { flex: 1, minWidth: 0 },
  offerValidation: { color: "#B64950", fontSize: 11, marginTop: 8 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  // Image picker
  imagePicker: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreview: { width: "100%", height: "100%" },
  imageChangeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  imageChangeText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  imagePickerPlaceholder: { alignItems: "center", gap: 6 },
  imagePickerIcon: { fontSize: 36 },
  imagePickerLabel: { fontSize: 14, fontWeight: "700" },
  imagePickerSub: { fontSize: 12 },

  disabled: { opacity: 0.45 },
});
