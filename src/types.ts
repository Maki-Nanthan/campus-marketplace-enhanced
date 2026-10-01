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
};

export type Tab = "Explore" | "Saved" | "Messages" | "Profile" | "MyListings";
