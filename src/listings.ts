import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Listing } from "./types";

export async function createListing(listing: Listing): Promise<string> {
  if (!db) throw new Error("Firebase is not configured.");
  const { id: _id, ...data } = listing;
  const reference = await addDoc(collection(db, "listings"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateListing(listing: Listing): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const { id, ...data } = listing;
  await updateDoc(doc(db, "listings", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateListingStatus(
  listingId: string,
  sellerId: string,
  status: "available" | "sold",
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const listingRef = doc(db, "listings", listingId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(listingRef);
    if (!snapshot.exists()) throw new Error("This listing no longer exists.");
    const listing = snapshot.data();
    if (listing.sellerId !== sellerId) {
      throw new Error("Only the seller can update this listing.");
    }
    if (listing.status === status) {
      throw new Error(`This listing is already marked ${status}.`);
    }
    transaction.update(listingRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  });
}
