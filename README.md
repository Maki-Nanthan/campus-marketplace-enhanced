# Campus Marketplace

Expo SDK 57 React Native app for buying and selling items within a campus community.

## Run locally

Expo SDK 57 requires Node 22.13 or newer.

```bash
cp .env.example .env
npm install
npm run web
```

Fill the Firebase Web app values in `.env`. Browsing can use demo listings while they are blank; authentication, SMS verification, and Firebase-backed profile features require a configured Firebase project.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Under Authentication > Sign-in method, enable Email/Password and Phone. Google sign-in is also available on web when enabled in the same section. Add your web host to Authentication > Settings > Authorized domains and configure SMS regions/quota for phone verification.
3. Create a Cloud Firestore database and a Firebase Storage bucket.
4. Copy `.env.example` to `.env` and set the Firebase Web app configuration values. Restart Expo after changing `.env`.
5. Sign in to the Firebase CLI with `npx firebase-tools login`, then deploy the Firestore and Storage rules from the project directory with `npx firebase-tools deploy --only firestore:rules,storage --project YOUR_FIREBASE_PROJECT_ID`. On Windows PowerShell, use `npx.cmd` instead of `npx` if script execution blocks it.
6. To enable AI product photos, enable the Gemini API for your Google Cloud project, set the `GEMINI_API_KEY` Firebase Functions secret with `npx.cmd firebase-tools functions:secrets:set GEMINI_API_KEY --project YOUR_FIREBASE_PROJECT_ID`, and deploy the callable with `npx.cmd firebase-tools deploy --only functions:generateListingImage --project YOUR_FIREBASE_PROJECT_ID`. The key stays on the server and is never included in the app.

`firebase-config.js` reads the `EXPO_PUBLIC_FIREBASE_*` values from `.env` and initializes Firebase in `src/firebase.ts`. Users can create an account with their name, email, and a password of at least six characters, or sign in with an existing email/password account. Web sign-up also verifies an international-format phone number with Firebase SMS and reCAPTCHA. An unfinished verification resumes at the code screen on the next sign-in. Native sign-up remains email/password and retains the existing native authentication behavior.

The application uses:

- `listings`: public reads; only the authenticated seller can create, edit, delete, or change the status of their listing. Prices use USD as the canonical currency; optional special offers are stored on the listing and include an original price, offer price, title, optional details, and optional expiry.
- `users/{uid}`: owner-only profile document containing `uid`, unique `username`, `displayName`, `email`, `photoURL`, `campus`, `settings`, and timestamps. Web sign-ups also store `phoneNumber`, `phoneVerificationRequired`, and `phoneVerified` to resume incomplete SMS verification.
- `publicProfiles/{uid}` and `usernames/{username}`: authenticated-readable, limited profile data used to resolve usernames and show conversation avatars without exposing private account fields.
- `users/{uid}/saved/{listingId}`: owner-only saved listing data.
- `users/{uid}/profile/{fileName}` and `listings/{uid}/{listingId}/{fileName}` in Storage: profile and listing images writable only by their owner, with image type and size limits.
- `conversations/{conversationId}`: two-member conversations readable only by their members; immutable-sender messages live in a subcollection and update in real time.

Profile settings are stored at `users/{uid}.settings` and contain the selected `theme` (`light` or `dark`) and `currency` (`USD` or `LKR`). USD is the canonical listing-price currency. When LKR is selected, the app obtains a live USD/LKR rate and caches the latest successful rate in the user's settings for offline display. Existing user documents receive missing profile defaults on their next sign-in without overwriting their saved profile or preferences.

The client Firebase configuration is intentionally public. Access control belongs in Authentication, Firestore Rules, and Storage Rules; never put Admin SDK credentials in this app.

## Current product flows

- Explore listings with search, category filters, manually entered minimum/maximum prices in the selected currency, and sorting.
- Browse and search without signing in; sign-in is required to save listings, message sellers, view saved items and personal listings, adjust account settings, or publish listings.
- Save listings and open listing details.
- Publish and edit a listing using the selected display currency, manage its image, and attach an optional special offer.
- Generate an AI-transformed listing photo from a selected product image, preview the result, or keep the original photo.
- Mark an owned listing sold out or make it available again; transaction and Firestore Rules checks restrict status changes to the listing owner.
- Find users by unique username, start private one-to-one conversations, and exchange real-time messages.
- Browse active, unexpired special offers in the Offers section.
- Update profile photo, theme, and currency in Settings.
- View Saved, Messages, Profile, My listings, and Settings pages.
