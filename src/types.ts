export type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId?: string;
  campus: string;
  condition: string;
  image: string;
  description?: string;
  status?: "available" | "sold";
  offer?: {
    title: string;
    originalPrice: number;
    offerPrice: number;
    description?: string;
    expiresAt?: string;
  };
};

export type PublicProfile = {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  campus?: string;
};

export type MarketplaceMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: { toDate: () => Date } | Date | null;
};

export type Conversation = {
  id: string;
  memberIds: string[];
  memberProfiles: Record<string, PublicProfile>;
  lastMessage?: string;
  lastMessageAt?: { toDate: () => Date } | Date | null;
};

export type Tab =
  | "Explore"
  | "Saved"
  | "Messages"
  | "Profile"
  | "MyListings"
  | "Settings"
  | "Offers";
