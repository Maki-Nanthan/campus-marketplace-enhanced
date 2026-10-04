import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { db, storage } from "./firebase";
import { defaultUserSettings, UserSettings } from "./settings";

export type UserProfile = {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  campus: string;
  settings: UserSettings;
};

export async function ensureUserProfile(user: User): Promise<void> {
  const firestore = db;
  if (!firestore) return;
  const profileRef = doc(firestore, "users", user.uid);
  const publicProfileRef = doc(firestore, "publicProfiles", user.uid);
  const name = user.displayName || user.email?.split("@")[0] || "Campus student";
  const cleanUsername = (user.email?.split("@")[0] || "student")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  const baseUsername =
    cleanUsername.length >= 2 ? cleanUsername : `${cleanUsername || "student"}1`;

  await runTransaction(firestore, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    const data = profileSnapshot.data();
    let username =
      typeof data?.username === "string" ? data.username : "";
    if (!username) {
      const simpleUsername = baseUsername;
      const simpleUsernameRef = doc(firestore, "usernames", simpleUsername);
      const simpleUsernameSnapshot = await transaction.get(simpleUsernameRef);
      username = simpleUsername;
      if (
        simpleUsernameSnapshot.exists() &&
        simpleUsernameSnapshot.data().uid !== user.uid
      ) {
        username = `${baseUsername}_${user.uid.slice(-6).toLowerCase()}`;
        const suffixSnapshot = await transaction.get(
          doc(firestore, "usernames", username),
        );
        if (suffixSnapshot.exists() && suffixSnapshot.data().uid !== user.uid) {
          username = `${baseUsername}_${user.uid.toLowerCase()}`;
          const uniqueSnapshot = await transaction.get(
            doc(firestore, "usernames", username),
          );
          if (uniqueSnapshot.exists() && uniqueSnapshot.data().uid !== user.uid) {
            throw new Error("Could not generate a unique username for this account.");
          }
        }
      }
    }

    const usernameRef = doc(firestore, "usernames", username);
    const profile = {
      uid: user.uid,
      username,
      displayName: name,
      email: user.email || "",
      photoURL:
        typeof data?.photoURL === "string" ? data.photoURL : user.photoURL || null,
      campus: typeof data?.campus === "string" ? data.campus : "North Campus",
      settings: data?.settings || defaultUserSettings,
      ...(data?.createdAt ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    };
    transaction.set(profileRef, profile, { merge: true });
    transaction.set(publicProfileRef, {
      uid: user.uid,
      username,
      displayName: name,
      photoURL: profile.photoURL,
      campus: profile.campus,
    });
    transaction.set(usernameRef, {
      uid: user.uid,
      username,
      displayName: name,
      photoURL: profile.photoURL,
    });
  });
}

export async function saveUserSettings(
  uid: string,
  settings: Partial<UserSettings>,
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const fields: Record<string, string | number> = {};
  if (settings.theme) fields["settings.theme"] = settings.theme;
  if (settings.currency) fields["settings.currency"] = settings.currency;
  if (settings.exchangeRate !== undefined) {
    fields["settings.exchangeRate"] = settings.exchangeRate;
  }
  if (settings.exchangeRateUpdatedAt !== undefined) {
    fields["settings.exchangeRateUpdatedAt"] = settings.exchangeRateUpdatedAt;
  }
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function saveProfilePhoto(
  uid: string,
  base64: string,
  contentType: string,
): Promise<string> {
  if (!db || !storage) throw new Error("Firebase Storage is not configured.");
  const photoRef = ref(storage, `users/${uid}/profile/profile-photo`);
  await uploadString(photoRef, base64, "base64", { contentType });
  const photoURL = await getDownloadURL(photoRef);
  await updateDoc(doc(db, "users", uid), {
    photoURL,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "publicProfiles", uid), { photoURL }, { merge: true });
  const profile = await getDoc(doc(db, "users", uid));
  const username = profile.data()?.username;
  if (typeof username === "string") {
    await setDoc(doc(db, "usernames", username), { photoURL }, { merge: true });
  }
  return photoURL;
}

/**
 * Uploads a listing product image to Firebase Storage and returns its download URL.
 * Falls back to returning the base64 data URI if Storage is not configured.
 */
export async function saveListingPhoto(
  uid: string,
  listingId: string,
  base64: string,
  contentType: string,
): Promise<string> {
  if (!storage) {
    // Fallback: return a data URI so listings still work without Firebase Storage
    return `data:${contentType};base64,${base64}`;
  }
  const photoRef = ref(
    storage,
    `listings/${uid}/${listingId}/product-photo`,
  );
  await uploadString(photoRef, base64, "base64", { contentType });
  const downloadURL = await getDownloadURL(photoRef);
  return downloadURL;
}
