import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Conversation, MarketplaceMessage, PublicProfile } from "./types";

function requireFirestore() {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
}

export async function findUserByUsername(value: string): Promise<PublicProfile> {
  const firestore = requireFirestore();
  const username = value.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{2,64}$/.test(username)) {
    throw new Error("Enter a valid username.");
  }
  const usernameSnapshot = await getDoc(doc(firestore, "usernames", username));
  if (!usernameSnapshot.exists()) throw new Error("No user has that username.");
  const uid = usernameSnapshot.data().uid;
  if (typeof uid !== "string") throw new Error("This username is unavailable.");
  const profileSnapshot = await getDoc(doc(firestore, "publicProfiles", uid));
  if (!profileSnapshot.exists()) throw new Error("This user profile is unavailable.");
  const data = profileSnapshot.data();
  return {
    uid,
    username: String(data.username || username),
    displayName: String(data.displayName || data.username || username),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    ...(typeof data.campus === "string" ? { campus: data.campus } : {}),
  };
}

export async function loadPublicProfile(uid: string): Promise<PublicProfile> {
  const firestore = requireFirestore();
  const snapshot = await getDoc(doc(firestore, "publicProfiles", uid));
  if (!snapshot.exists()) throw new Error("This seller's profile is unavailable.");
  const data = snapshot.data();
  return {
    uid,
    username: String(data.username || "student"),
    displayName: String(data.displayName || data.username || "Campus student"),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    ...(typeof data.campus === "string" ? { campus: data.campus } : {}),
  };
}

export async function openConversation(
  currentUser: PublicProfile,
  otherUser: PublicProfile,
): Promise<string> {
  const firestore = requireFirestore();
  if (currentUser.uid === otherUser.uid) {
    throw new Error("You can't start a conversation with yourself.");
  }
  const memberIds = [currentUser.uid, otherUser.uid].sort();
  const conversationId = memberIds.join("__");
  const conversationRef = doc(firestore, "conversations", conversationId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists()) {
      transaction.set(conversationRef, {
        memberIds,
        memberProfiles: {
          [currentUser.uid]: currentUser,
          [otherUser.uid]: otherUser,
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
      });
    }
  });
  return conversationId;
}

export function subscribeToConversations(
  uid: string,
  onData: (conversations: Conversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  const firestore = requireFirestore();
  const conversationsQuery = query(
    collection(firestore, "conversations"),
    where("memberIds", "array-contains", uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) =>
      onData(
        snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }) as Conversation)
          .sort((a, b) => toMillis(b.lastMessageAt) - toMillis(a.lastMessageAt)),
      ),
    (error) => onError(error),
  );
}

function toMillis(value: Conversation["lastMessageAt"]): number {
  if (value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  return value instanceof Date ? value.getTime() : 0;
}

export function subscribeToMessages(
  conversationId: string,
  onData: (messages: MarketplaceMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const firestore = requireFirestore();
  const messagesQuery = query(
    collection(firestore, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    messagesQuery,
    (snapshot) =>
      onData(
        snapshot.docs.map(
          (entry) => ({ id: entry.id, ...entry.data() }) as MarketplaceMessage,
        ),
      ),
    (error) => onError(error),
  );
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  const firestore = requireFirestore();
  const message = text.trim();
  if (!message) throw new Error("Write a message before sending.");
  if (message.length > 4000) throw new Error("Messages must be 4,000 characters or fewer.");
  const conversationRef = doc(firestore, "conversations", conversationId);
  const batch = writeBatch(firestore);
  const messageRef = doc(collection(conversationRef, "messages"));
  batch.set(messageRef, {
    senderId,
    text: message,
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    lastMessage: message,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
  });
  await batch.commit();
}
