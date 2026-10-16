import {
  createUserWithEmailAndPassword,
  linkWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  updatePhoneNumber,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ensureUserProfile } from "./userData";

function requireAuth() {
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Add your Firebase Web app values to .env and restart Expo.",
    );
  }
  return auth;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; pendingPhoneNumber: string | null }> {
  const credential = await signInWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );
  return {
    user: credential.user,
    pendingPhoneNumber: await getPendingPhoneNumber(credential.user.uid),
  };
}

export async function signUpWithEmail(
  displayName: string,
  email: string,
  password: string,
  phoneNumber?: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await ensureUserProfile(credential.user);
  if (phoneNumber) {
    if (!db) throw new Error("Firestore is not configured.");
    await updateDoc(doc(db, "users", credential.user.uid), {
      phoneNumber,
      phoneVerificationRequired: true,
      phoneVerified: false,
      updatedAt: serverTimestamp(),
    });
  }
  return credential.user;
}

export async function getPendingPhoneNumber(
  uid: string,
): Promise<string | null> {
  if (!db) return null;
  const profile = await getDoc(doc(db, "users", uid));
  const data = profile.data();
  return data?.phoneVerificationRequired === true &&
    data.phoneVerified !== true &&
    typeof data.phoneNumber === "string"
    ? data.phoneNumber
    : null;
}

export async function sendPhoneVerificationCode(
  phoneNumber: string,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("SMS verification is available in the web app.");
  }
  const firebaseAuth = requireAuth();
  const container = document.createElement("div");
  document.body.appendChild(container);
  let verifier: RecaptchaVerifier | null = null;
  try {
    verifier = new RecaptchaVerifier(firebaseAuth, container, {
      size: "invisible",
    });
    return await new PhoneAuthProvider(firebaseAuth).verifyPhoneNumber(
      phoneNumber,
      verifier,
    );
  } finally {
    verifier?.clear();
    container.remove();
  }
}

export async function confirmPhoneVerification(
  user: User,
  verificationId: string,
  code: string,
): Promise<void> {
  if (!db) throw new Error("Firestore is not configured.");
  const credential = PhoneAuthProvider.credential(verificationId, code);
  let verifiedUser = user;
  if (user.phoneNumber) {
    await updatePhoneNumber(user, credential);
  } else {
    verifiedUser = (await linkWithCredential(user, credential)).user;
  }
  if (!verifiedUser.phoneNumber) {
    throw new Error("Firebase did not confirm the phone number.");
  }
  await updateDoc(doc(db, "users", user.uid), {
    phoneNumber: verifiedUser.phoneNumber,
    phoneVerificationRequired: true,
    phoneVerified: true,
    updatedAt: serverTimestamp(),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email.trim());
}

export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email. Try signing in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Could not connect to Firebase. Check your internet connection.";
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "That code is incorrect. Check the message and try again.";
    case "auth/code-expired":
    case "auth/invalid-verification-id":
    case "auth/session-expired":
      return "That code has expired. Request a new verification code.";
    case "auth/invalid-phone-number":
      return "Enter a valid phone number in international format, such as +14155552671.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "We couldn't verify this browser. Refresh the page and try again.";
    case "auth/quota-exceeded":
      return "SMS delivery is temporarily unavailable. Try again later.";
    case "auth/credential-already-in-use":
    case "auth/phone-number-already-exists":
      return "That phone number is already linked to another account.";
    case "auth/unauthorized-domain":
      return "This web address isn't authorized for Firebase sign-in. Add it under Authentication settings.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled. Enable Email/Password and Phone in Firebase Authentication settings.";
    default:
      return code
        ? "Authentication couldn't be completed. Check your details and try again."
        : error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.";
  }
}
