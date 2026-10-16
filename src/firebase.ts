import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import { firebaseConfig } from "../firebase-config";

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const appStorage = createAsyncStorage("app");

function initializeFirebaseAuth(app: NonNullable<typeof firebaseApp>): Auth {
  if (Platform.OS === "web") return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(appStorage),
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/already-initialized") {
      return getAuth(app);
    }
    throw error;
  }
}

export const auth = firebaseApp ? initializeFirebaseAuth(firebaseApp) : null;
export const db = firebaseApp
  ? Platform.OS === "web"
    ? getFirestore(firebaseApp)
    : initializeFirestore(firebaseApp, { experimentalForceLongPolling: true })
  : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const listingsCollection = db ? collection(db, "listings") : null;
export const usersCollection = db ? collection(db, "users") : null;
export const listingDocument = (id: string) =>
  db ? doc(db, "listings", id) : null;
