# 🛍️ Campus Marketplace — Full Project Summary

## Overview

**Campus Marketplace** is a cross-platform mobile/web application built with **React Native (Expo)** and **Firebase** that allows students within a campus community to **buy and sell second-hand items**. It supports web, iOS, and Android platforms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native + Expo SDK 57 |
| **Language** | TypeScript |
| **Web Runtime** | React Native Web |
| **Backend/DB** | Firebase (Firestore, Auth, Storage) |
| **Auth** | Firebase Authentication (Email/Password, Phone/SMS, Google on web) |
| **Real-time Messaging** | Firestore real-time listeners |
| **Currency API** | [open.er-api.com](https://open.er-api.com) (live USD/LKR rates) |
| **State Persistence** | `@react-native-async-storage/async-storage` |
| **Image Picking** | `expo-image-picker` |

---

## Project Structure

```
campus-marketplace-enhanced-main/
├── App.tsx                  # Root entry (redirects to src/App.tsx)
├── index.ts                 # Expo entry point
├── firebase-config.js       # Reads EXPO_PUBLIC_FIREBASE_* env vars
├── firebase.json            # Firebase project config
├── firestore.rules          # Firestore Security Rules
├── storage.rules            # Firebase Storage Security Rules
├── functions/               # Firebase Cloud Functions (TypeScript)
├── dataconnect/             # Firebase Data Connect schema
├── src/
│   ├── App.tsx              # Main app shell (navigation, auth state, tab routing)
│   ├── firebase.ts          # Firebase SDK initialization
│   ├── auth.ts              # Auth functions (sign in/up, phone verify, password reset)
│   ├── userData.ts          # User profile management (Firestore CRUD)
│   ├── listings.ts          # Listing CRUD operations
│   ├── messaging.ts         # Conversations & real-time messaging
│   ├── settings.ts          # User settings (theme, currency)
│   ├── currency.ts          # Currency formatting, conversion, exchange-rate fetch
│   ├── theme.ts             # Light/Dark theme color tokens
│   ├── types.ts             # Shared TypeScript types
│   ├── data.ts              # Demo/seed listings (for unauthenticated browsing)
│   ├── components/
│   │   ├── AuthModal.tsx    # Full auth UI (sign in, sign up, phone verify)
│   │   ├── ListingCard.tsx  # Reusable listing card component
│   │   ├── EmptyState.tsx   # Empty placeholder component
│   │   └── PageTitle.tsx    # Page header component
│   └── pages/
│       ├── ExplorePage.tsx   # Browse + search + filter listings
│       ├── SavedPage.tsx     # User's saved/bookmarked listings
│       ├── MessagesPage.tsx  # Conversations + real-time chat
│       ├── MyListingsPage.tsx# Seller's own listings management
│       ├── OffersPage.tsx    # Active special offers browser
│       ├── ProfilePage.tsx   # Public profile view + username search
│       └── SettingsPage.tsx  # Account settings (photo, theme, currency)
└── assets/                  # App icon, splash screen images
```

---

## Core Features

### 🔐 Authentication
- **Email + Password** sign-up and sign-in (web & native)
- **Phone SMS verification** with reCAPTCHA (web only) — supports resuming incomplete verifications on next sign-in
- **Google Sign-In** (web only, when enabled in Firebase)
- **Password reset** via email
- Comprehensive error message mapping for all Firebase auth error codes

### 🛒 Listings
- **Browse publicly** without signing in (demo listings available)
- **Search** listings by keyword
- **Filter** by category, min/max price (in selected currency), and sort order
- **Create, edit, delete** your own listings (with image upload)
- Mark a listing as **Sold Out** or make it **Available** again
- Attach an optional **Special Offer** with: original price, offer price, offer title, optional description, and optional expiry date

### 💰 Currency Support
- **USD** as the canonical storage currency
- **LKR (Sri Lankan Rupee)** support with live exchange rates fetched from `open.er-api.com`
- Exchange rate cached in Firestore for offline use
- All price inputs and displays convert between currencies seamlessly

### 💬 Messaging
- **Find users** by their unique username
- Start **private 1-to-1 conversations**
- **Real-time messaging** via Firestore subcollections
- Conversation list with last message preview

### 🏷️ Special Offers
- Dedicated **Offers tab** showing active, non-expired special offers
- Offers include: discount price, original price, title, description, expiry date

### 👤 User Profiles
- `users/{uid}` — private profile (email, phone, settings)
- `publicProfiles/{uid}` — public-readable (username, displayName, photoURL, campus)
- `usernames/{username}` — username uniqueness index for search
- Update **profile photo** (uploaded to Firebase Storage)
- Choose **campus affiliation**

### ⚙️ Settings
- Toggle **Light / Dark theme**
- Switch display **currency** (USD ↔ LKR)
- Settings stored in `users/{uid}.settings` in Firestore

---

## Firestore Data Model

| Collection | Access | Purpose |
|---|---|---|
| `listings/{id}` | Public read; owner write | All marketplace listings |
| `users/{uid}` | Owner only | Private profile, settings, phone verification |
| `users/{uid}/saved/{listingId}` | Owner only | Saved/bookmarked listings |
| `publicProfiles/{uid}` | Authenticated read; owner write | Public profile for username search & chat avatars |
| `usernames/{username}` | Authenticated read; owner write | Username uniqueness index |
| `conversations/{id}` | Members only | Conversation metadata (lastMessage, memberIds) |
| `conversations/{id}/messages/{id}` | Members only | Immutable chat messages (no update/delete) |

---

## Security Rules Highlights

- **Listings**: Anyone can read; only the authenticated seller can create/edit/delete. Status changes restricted to `"available"` or `"sold"`. `offer` field validated server-side.
- **Users**: Strictly owner-only. Username is immutable once set.
- **Conversations**: Members-only read/write. Messages are **append-only** (no update or delete).
- **publicProfiles**: Writable only by owner; limited field updates allowed (`username`, `displayName`, `photoURL`, `campus`).

---

## App Navigation (Tabs)

| Tab | Requires Auth | Description |
|---|---|---|
| **Explore** | ❌ No | Browse all listings |
| **Offers** | ❌ No | Active special offers |
| **Saved** | ✅ Yes | Bookmarked listings |
| **Messages** | ✅ Yes | Conversations + chat |
| **Profile** | ✅ Yes | Own profile & user search |
| **My Listings** | ✅ Yes | Manage your posted listings |
| **Settings** | ✅ Yes | Account & app preferences |

---

## Theme System

Two themes with a full design token set:

| Token | Light | Dark |
|---|---|---|
| background | `#F8F8F4` | `#121A17` |
| surface | `#FFFFFF` | `#1B2722` |
| text | `#173C34` | `#E8F0EB` |
| accent | `#1F5D4C` | `#72B69A` |

Color palette is a **green/forest tone** — consistent across light and dark modes.

---

## Development Scripts

```bash
npm run start      # Expo dev server
npm run web        # Web (browser) mode
npm run android    # Android native
npm run ios        # iOS native
```

> Requires **Node 22.13+** and Expo SDK 57.

---

## Firebase Setup Requirements

1. Firebase project with a **Web app** registered
2. Enable **Email/Password** and **Phone** auth providers
3. Create **Cloud Firestore** and **Firebase Storage**
4. Set `EXPO_PUBLIC_FIREBASE_*` vars in `.env`
5. For native: add `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)
6. Deploy rules: `npx firebase-tools deploy --only firestore:rules,storage`

---

## Key Design Decisions

- **USD as canonical currency**: All prices stored in USD; LKR is a display-only conversion
- **Demo mode**: App works without Firebase config — shows seed listings for unauthenticated browsing
- **Phone verification resumable**: If a user quits mid-verification, they can continue on next sign-in
- **Immutable messages**: Chat messages cannot be edited or deleted (enforced at Firestore rules level)
- **Username immutability**: Once a username is set, it cannot be changed (Firestore rule enforced)
- **Public config is safe**: Firebase client config is intentionally public; security enforced via Auth + Rules
