# 🛍️ Campus Marketplace

> A cross-platform mobile & web app for buying and selling second-hand items within a campus community.

Built with **React Native (Expo)**, **TypeScript**, and **Firebase** — works on **Web**, **Android**, and **iOS**.

[Demo video](https://youtu.be/L65R6h64nUU)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Firebase Setup](#-firebase-setup)
- [Running the App](#-running-the-app)
- [App Navigation](#-app-navigation-tabs)
- [Firestore Data Model](#-firestore-data-model)
- [Security Rules](#-security-rules)
- [Theme System](#-theme-system)
- [Key Design Decisions](#-key-design-decisions)
- [Dependencies](#-dependencies)
- [License](#-license)

---

## ✨ Features

### 🔐 Authentication

- **Email + Password** sign-up and sign-in (web & native)
- **Phone SMS verification** with reCAPTCHA (web only) — supports resuming incomplete verification on next sign-in
- **Google Sign-In** (web only, when enabled in Firebase console)
- **Password reset** via email
- Full Firebase auth error code mapping with human-readable messages

### 🛒 Listings

- **Browse without signing in** — demo seed listings available for unauthenticated users
- **Search** listings by keyword
- **Filter** by category, min/max price (in your selected currency), and sort order
- **Create, edit, delete** your own listings with image upload
- **Mark as Sold Out** or reactivate a listing
- Attach an optional **Special Offer** with: original price, offer price, title, optional description, and expiry date

### 💰 Multi-Currency Support

- **USD** as the canonical storage currency (all prices stored in USD)
- **LKR (Sri Lankan Rupee)** support with live exchange rates from [`open.er-api.com`](https://open.er-api.com)
- Exchange rate is **cached in Firestore** for offline display
- All price inputs and displays auto-convert between currencies

### 💬 Real-time Messaging

- **Find users** by their unique username
- **Private 1-to-1 conversations** — messages are append-only (no edit/delete)
- **Real-time updates** powered by Firestore listeners
- Conversation list shows last message preview

### 🏷️ Special Offers

- Dedicated **Offers tab** showing all active, non-expired special offers
- Each offer displays: discount price, original price, title, description, and expiry date

### 👤 User Profiles

- Public profile with username, display name, photo, and campus affiliation
- Update **profile photo** (uploaded to Firebase Storage)
- Choose your **campus**

### ⚙️ Settings

- Toggle **Light / Dark theme**
- Switch display **currency** (USD ↔ LKR)
- Settings persisted in Firestore under `users/{uid}.settings`

---

## 🧰 Tech Stack

| Layer                 | Technology                                                      |
| --------------------- | --------------------------------------------------------------- |
| **Framework**         | React Native + Expo SDK 57                                      |
| **Language**          | TypeScript                                                      |
| **Web Runtime**       | React Native Web                                                |
| **Backend / DB**      | Firebase (Firestore, Auth, Storage)                             |
| **Auth Methods**      | Email/Password, Phone SMS, Google (web)                         |
| **Real-time**         | Firestore real-time listeners                                   |
| **Currency API**      | [open.er-api.com](https://open.er-api.com) (live USD/LKR rates) |
| **State Persistence** | `@react-native-async-storage/async-storage`                     |
| **Image Picking**     | `expo-image-picker`                                             |

---

## 📁 Project Structure

```
campus-marketplace-enhanced-main/
├── App.tsx                      # Root entry — re-exports src/App.tsx
├── index.ts                     # Expo entry point (registers root component)
├── firebase-config.js           # Reads EXPO_PUBLIC_FIREBASE_* env vars & exports config
├── firebase.json                # Firebase CLI project configuration
├── firestore.rules              # Firestore Security Rules (deployed via Firebase CLI)
├── storage.rules                # Firebase Storage Security Rules
├── .env                         # Your local Firebase keys (do NOT commit this file)
├── functions/                   # Firebase Cloud Functions (TypeScript)
├── dataconnect/                 # Firebase Data Connect schema
├── assets/                      # App icon & splash screen images
└── src/
    ├── App.tsx                  # Main shell — navigation, auth state, tab routing
    ├── firebase.ts              # Firebase SDK init (uses firebase-config.js)
    ├── auth.ts                  # Auth helpers: signIn, signUp, phoneVerify, passwordReset
    ├── userData.ts              # User profile CRUD — reads/writes Firestore users & publicProfiles
    ├── listings.ts              # Listing CRUD — create, fetch, update, delete
    ├── messaging.ts             # Conversations & real-time message streaming via Firestore
    ├── settings.ts              # Load/save user settings (theme, currency) from Firestore
    ├── currency.ts              # Currency formatting, conversion logic, live rate fetch
    ├── theme.ts                 # Light/Dark design tokens (colors, surfaces, accents)
    ├── types.ts                 # Shared TypeScript interfaces (Listing, User, Message, etc.)
    ├── data.ts                  # Demo/seed listings shown to unauthenticated users
    ├── components/
    │   ├── AuthModal.tsx        # Full auth UI: sign in, sign up, phone verification flows
    │   ├── ListingCard.tsx      # Reusable card showing listing image, price, title, offers
    │   ├── EmptyState.tsx       # Empty placeholder with icon + message
    │   └── PageTitle.tsx        # Consistent page header / section title component
    └── pages/
        ├── ExplorePage.tsx      # Browse + search + filter + sort all listings
        ├── SavedPage.tsx        # User's bookmarked/saved listings
        ├── MessagesPage.tsx     # Conversation list + real-time chat thread view
        ├── MyListingsPage.tsx   # Manage your own posted listings (create, edit, delete, status)
        ├── OffersPage.tsx       # Browse active special offers across all listings
        ├── ProfilePage.tsx      # View public profile + search other users by username
        └── SettingsPage.tsx     # Account settings: profile photo, theme, currency
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v22.13 or newer — [nodejs.org](https://nodejs.org)
- **npm** (bundled with Node)
- A **Firebase project** (see [Firebase Setup](#-firebase-setup) below)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/campus-marketplace.git
cd campus-marketplace-enhanced-main

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your Firebase config
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 4. Start the app
npm run web
```

> ℹ️ You can browse demo listings without any Firebase config. Auth, messaging, and profile features require a configured project.

### Environment Variables

Edit `.env` with your Firebase Web app credentials from the Firebase Console:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> ⚠️ **Always restart Expo after editing `.env`** — values are baked in at dev-server start time.

---

## 🔥 Firebase Setup

**Step 1 — Create a Firebase project**

- [Firebase Console](https://console.firebase.google.com) → Add project

**Step 2 — Register a Web app**

- Project Settings → General → Your apps → Add app → Web
- Copy the config values into `.env`

**Step 3 — Enable Authentication providers**

- Authentication → Sign-in method → Enable **Email/Password** and **Phone**
- For Google (web): enable Google and add your domain to **Authorized Domains**
- Configure SMS regions/quota for phone verification

**Step 4 — Create Firestore & Storage**

- Firestore Database → Create database (start in Production mode)
- Storage → Get started

**Step 5 — Native app config (iOS & Android)**

- Register iOS & Android apps in Firebase (use bundle ID / package name from `app.json`)
- Download `GoogleService-Info.plist` → place in project root
- Download `google-services.json` → place in project root
- Expo auto-includes them in native builds

**Step 6 — Deploy Security Rules**

```bash
# Login to Firebase CLI
npx firebase-tools login

# Deploy Firestore + Storage rules
npx firebase-tools deploy --only firestore:rules,storage --project YOUR_PROJECT_ID

# On Windows PowerShell (if npx is blocked):
npx.cmd firebase-tools deploy --only firestore:rules,storage --project YOUR_PROJECT_ID
```

---

## ▶️ Running the App

```bash
npm run start     # Expo dev server (scan QR with Expo Go app)
npm run web       # Open in browser at http://localhost:8081
npm run android   # Run on Android device or emulator
npm run ios       # Run on iOS simulator (requires macOS)
```

> **iOS on Windows:** Use Expo Go on a physical device (scan QR), or use EAS Build to compile in the cloud.

---

## 🗂️ App Navigation (Tabs)

| Tab             | Auth Required | Description                                  |
| --------------- | ------------- | -------------------------------------------- |
| **Explore**     | ❌ No         | Browse and search all listings               |
| **Offers**      | ❌ No         | View active, non-expired special offers      |
| **Saved**       | ✅ Yes        | Your bookmarked listings                     |
| **Messages**    | ✅ Yes        | Conversations + real-time chat               |
| **Profile**     | ✅ Yes        | Your public profile & search for users       |
| **My Listings** | ✅ Yes        | Create, edit, and manage your listings       |
| **Settings**    | ✅ Yes        | Account preferences (photo, theme, currency) |

---

## 🗄️ Firestore Data Model

| Collection                         | Access                          | Purpose                                               |
| ---------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `listings/{id}`                    | Public read; owner write        | All marketplace listings                              |
| `users/{uid}`                      | Owner only                      | Private profile, settings, phone verification state   |
| `users/{uid}/saved/{listingId}`    | Owner only                      | Saved/bookmarked listings                             |
| `publicProfiles/{uid}`             | Authenticated read; owner write | Public profile — username, displayName, photo, campus |
| `usernames/{username}`             | Authenticated read; owner write | Username uniqueness index for search                  |
| `conversations/{id}`               | Members only                    | Conversation metadata (lastMessage, memberIds)        |
| `conversations/{id}/messages/{id}` | Members only                    | Immutable chat messages (append-only)                 |

### Listing document shape

```ts
{
  id: string;
  title: string;
  description: string;
  price: number;            // Always stored in USD
  category: string;
  imageUrl?: string;
  status: "available" | "sold";
  sellerId: string;
  sellerName: string;
  createdAt: Timestamp;
  offer?: {
    offerPrice: number;
    originalPrice: number;
    title: string;
    details?: string;
    expiresAt?: Timestamp;
  };
}
```

### User document shape

```ts
// users/{uid}  — private, owner-only
{
  uid: string;
  username: string;         // Immutable once set
  displayName: string;
  email: string;
  photoURL?: string;
  campus?: string;
  settings: {
    theme: "light" | "dark";
    currency: "USD" | "LKR";
    cachedLkrRate?: number; // Most recently fetched USD→LKR rate
  };
  phoneNumber?: string;           // Web sign-up only
  phoneVerified?: boolean;        // Web sign-up only
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔒 Security Rules

### Firestore (`firestore.rules`)

| Rule               | Detail                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Listings**       | Anyone can read. Only the authenticated seller can create/edit/delete. Status restricted to `"available"` or `"sold"`. The `offer` field is server-validated. |
| **Users**          | Strictly owner-only read/write. `username` field is immutable once written.                                                                                   |
| **publicProfiles** | Authenticated users can read. Owner can update only `username`, `displayName`, `photoURL`, `campus`.                                                          |
| **Conversations**  | Members-only read/write. Messages subcollection is **append-only** — no update or delete.                                                                     |

### Storage (`storage.rules`)

| Path                          | Rule                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `users/{uid}/profile/`        | Only the owner can upload; enforces image MIME type and max file size. |
| `listings/{uid}/{listingId}/` | Only the listing owner can upload images.                              |

> The Firebase **client config is intentionally public**. Security is enforced through Authentication, Firestore Rules, and Storage Rules — never include Admin SDK credentials in this app.

---

## 🎨 Theme System

Two complete themes with a **forest-green** color palette (defined in `src/theme.ts`):

| Token        | Light     | Dark      |
| ------------ | --------- | --------- |
| `background` | `#F8F8F4` | `#121A17` |
| `surface`    | `#FFFFFF` | `#1B2722` |
| `text`       | `#173C34` | `#E8F0EB` |
| `accent`     | `#1F5D4C` | `#72B69A` |

Theme is toggled at runtime via Settings and persisted in Firestore per user.

---

## 💡 Key Design Decisions

| Decision                           | Reason                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **USD as canonical currency**      | All prices stored in USD; LKR is display-only via a live exchange rate — avoids data inconsistency if rates change |
| **Demo mode (no Firebase needed)** | Seed listings in `src/data.ts` let anyone browse without any configuration                                         |
| **Phone verification resumable**   | Incomplete SMS verification state is stored in Firestore and the flow resumes automatically on the next sign-in    |
| **Immutable chat messages**        | Enforced at Firestore Rules level — messages subcollection has no `update` or `delete` permission                  |
| **Immutable usernames**            | Once set, a username cannot be changed, preventing username hijacking and broken references                        |
| **Public Firebase config**         | Intentional — Firebase client config is safe to expose; access control lives in Auth + Security Rules              |

---

## 📦 Dependencies

| Package                                     | Version  | Purpose                                   |
| ------------------------------------------- | -------- | ----------------------------------------- |
| `expo`                                      | ~57.0.15 | App framework & build tooling             |
| `react-native`                              | 0.86.2   | Mobile UI runtime                         |
| `react-native-web`                          | ^0.21.2  | Web rendering for React Native components |
| `firebase`                                  | ^12.19.0 | Auth, Firestore, Storage backend          |
| `expo-image-picker`                         | ^57.0.20 | Camera & photo library access             |
| `@react-native-async-storage/async-storage` | 3.1.1    | Local key-value persistence               |
| `expo-status-bar`                           | ~57.0.1  | Status bar styling                        |
| `react`                                     | 19.2.3   | UI rendering                              |
| `react-dom`                                 | 19.2.3   | DOM rendering (web target)                |

---

## 📄 License

[MIT](LICENSE)
