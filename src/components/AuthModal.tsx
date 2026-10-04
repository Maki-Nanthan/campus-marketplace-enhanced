import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ThemeColors } from "../theme";

type AuthResult = {
  verificationId?: string;
  phoneNumber?: string;
  verificationError?: string;
};

type AuthStep = "form" | "verify";

export function AuthModal({
  visible,
  onClose,
  onClearError,
  onSubmit,
  onResendCode,
  onVerifyCode,
  onForgotPassword,
  onGoogleSignIn,
  error,
  colors,
  smsVerificationAvailable,
  pendingPhoneNumber,
}: {
  visible: boolean;
  onClose: () => void;
  onClearError: () => void;
  onSubmit: (
    displayName: string,
    email: string,
    password: string,
    phoneNumber: string,
    isSignUp: boolean,
  ) => Promise<AuthResult>;
  onResendCode: (phoneNumber: string) => Promise<string>;
  onVerifyCode: (verificationId: string, code: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  error: string;
  colors: ThemeColors;
  smsVerificationAvailable: boolean;
  pendingPhoneNumber?: string | null;
}) {
  const [step, setStep] = useState<AuthStep>("form");
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const animatedStep = useRef(new Animated.Value(1)).current;
  const codeInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);
  const phoneInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setStep("form");
      setCode("");
      setVerificationId(null);
      setRemainingSeconds(0);
      setFormError("");
      setSuccessMessage("");
      setBusy(false);
      return;
    }
    if (pendingPhoneNumber) {
      setPhoneNumber(pendingPhoneNumber);
      setIsSignUp(false);
      setVerificationId(null);
      setRemainingSeconds(0);
      setFormError("Your account still needs phone verification. Request a new code to continue.");
      setStep("verify");
    }
  }, [visible, pendingPhoneNumber]);

  useEffect(() => {
    if (step !== "verify" || remainingSeconds <= 0) return;
    const timer = setInterval(
      () => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [remainingSeconds, step]);

  useEffect(() => {
    animatedStep.setValue(0);
    Animated.timing(animatedStep, {
      toValue: 1,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    if (step === "verify") {
      const focusTimer = setTimeout(() => codeInput.current?.focus(), 220);
      return () => clearTimeout(focusTimer);
    }
  }, [animatedStep, step]);

  const clearMessages = () => {
    setFormError("");
    setSuccessMessage("");
    onClearError();
  };

  const submit = async () => {
    clearMessages();
    const normalizedEmail = email.trim();
    if (isSignUp && !displayName.trim()) {
      setFormError("Enter your name to create an account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError("Enter a valid email address.");
      emailInput.current?.focus();
      return;
    }
    if (isSignUp && smsVerificationAvailable &&
      !/^\+[1-9]\d{7,14}$/.test(phoneNumber.trim())) {
      setFormError("Enter your phone number with country code, for example +14155552671.");
      return;
    }
    if (!password) {
      setFormError("Enter your password.");
      passwordInput.current?.focus();
      return;
    }
    if (isSignUp && password.length < 6) {
      setFormError("Choose a password with at least 6 characters.");
      passwordInput.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit(
        displayName,
        normalizedEmail,
        password,
        phoneNumber.trim(),
        isSignUp,
      );
      if (result.phoneNumber) {
        setPhoneNumber(result.phoneNumber);
        setVerificationId(result.verificationId || null);
        setCode("");
        setRemainingSeconds(result.verificationId ? 60 : 0);
        setFormError(result.verificationError || "");
        setSuccessMessage(
          result.verificationId
            ? "We've sent a verification code to your phone number."
            : "",
        );
        setPassword("");
        setStep("verify");
      } else {
        setPassword("");
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (remainingSeconds > 0 || busy) return;
    clearMessages();
    setBusy(true);
    try {
      const newVerificationId = await onResendCode(phoneNumber);
      setVerificationId(newVerificationId);
      setCode("");
      setRemainingSeconds(60);
      setSuccessMessage("A new verification code has been sent.");
      codeInput.current?.focus();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't send a new code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    clearMessages();
    if (code.length !== 6) {
      setFormError("Enter the 6-digit verification code.");
      codeInput.current?.focus();
      return;
    }
    if (!verificationId) {
      setFormError("Request a verification code before continuing.");
      return;
    }
    setBusy(true);
    try {
      await onVerifyCode(verificationId, code);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't verify that code. Please try again.";
      setFormError(message);
      if (/expired/i.test(message)) {
        setVerificationId(null);
        setRemainingSeconds(0);
      }
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    clearMessages();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError("Enter your email address first, then choose Forgot password.");
      emailInput.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await onForgotPassword(normalizedEmail);
      setSuccessMessage(
        "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't send a reset link. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setIsSignUp((current) => !current);
    setPassword("");
    clearMessages();
  };

  const backToSignIn = () => {
    setStep("form");
    setIsSignUp(false);
    setCode("");
    setVerificationId(null);
    setRemainingSeconds(0);
    clearMessages();
    onClose();
  };

  const maskedPhone = phoneNumber
    ? `${phoneNumber.slice(0, Math.min(4, phoneNumber.length))}••••${phoneNumber.slice(-3)}`
    : "your phone";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={step === "verify" ? backToSignIn : onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoiding}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.card,
                { opacity: animatedStep, backgroundColor: colors.surface },
                {
                  transform: [
                    {
                      translateY: animatedStep.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.brand}>
                <View style={[styles.brandMark, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.brandMarkText, { color: colors.accentText }]}>C</Text>
                </View>
                <Text style={[styles.brandName, { color: colors.text }]}>
                  Campus Marketplace
                </Text>
              </View>

              {step === "form" ? (
                <>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {isSignUp ? "Create your account" : "Welcome back"}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.muted }]}>
                    {isSignUp
                      ? "Find your place in the campus community."
                      : "Sign in to continue to your marketplace."}
                  </Text>

                  {isSignUp && (
                    <InputField
                      label="Full name"
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your name"
                      autoCapitalize="words"
                      editable={!busy}
                      onSubmitEditing={() => emailInput.current?.focus()}
                      returnKeyType="next"
                      colors={colors}
                    />
                  )}
                  <InputField
                    inputRef={emailInput}
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!busy}
                    onSubmitEditing={() =>
                      isSignUp && smsVerificationAvailable
                        ? phoneInput.current?.focus()
                        : passwordInput.current?.focus()
                    }
                    textContentType="emailAddress"
                    returnKeyType="next"
                    colors={colors}
                  />
                  {isSignUp && smsVerificationAvailable && (
                    <>
                      <InputField
                        inputRef={phoneInput}
                        label="Phone number"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="+14155552671"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        editable={!busy}
                        textContentType="telephoneNumber"
                        onSubmitEditing={() => passwordInput.current?.focus()}
                        returnKeyType="next"
                        colors={colors}
                      />
                      <Text style={[styles.fieldHint, { color: colors.muted }]}>
                        Include your country code. We’ll text a verification code.
                      </Text>
                    </>
                  )}

                  <View style={styles.passwordHeading}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Password</Text>
                    {!isSignUp && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={forgotPassword}
                        hitSlop={8}
                      >
                        <Text style={[styles.linkText, { color: colors.accent }]}>
                          Forgot password?
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <View
                    style={[
                      styles.passwordBox,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      editable={!busy}
                      onChangeText={setPassword}
                      onSubmitEditing={submit}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                      secureTextEntry={!passwordVisible}
                      style={[styles.passwordInput, { color: colors.text }]}
                      textContentType={isSignUp ? "newPassword" : "password"}
                      value={password}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                      accessibilityState={{ checked: passwordVisible }}
                      onPress={() => setPasswordVisible((current) => !current)}
                      hitSlop={10}
                    >
                      <Text style={[styles.showPassword, { color: colors.accent }]}>
                        {passwordVisible ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  {isSignUp && (
                    <Text style={[styles.fieldHint, { color: colors.muted }]}>
                      Use at least 6 characters.
                    </Text>
                  )}

                  <Feedback error={formError || error} success={successMessage} />
                  <ActionButton
                    label={isSignUp ? "Create account" : "Sign in"}
                    busy={busy}
                    onPress={submit}
                    colors={colors}
                  />

                  {onGoogleSignIn && (
                    <>
                      <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={async () => {
                          clearMessages();
                          setBusy(true);
                          try {
                            await onGoogleSignIn();
                          } catch (error) {
                            setFormError(
                              error instanceof Error
                                ? error.message
                                : "Google sign-in failed. Please try again.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                        style={[
                          styles.googleButton,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          busy && styles.disabled,
                        ]}
                      >
                        <GoogleIcon />
                        <Text style={[styles.googleText, { color: colors.text }]}>
                          Sign in with Google
                        </Text>
                      </Pressable>
                    </>
                  )}

                  <View style={styles.signUpRow}>
                    <Text style={[styles.signUpText, { color: colors.muted }]}>
                      {isSignUp ? "Already have an account? " : "Don’t have an account? "}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={switchMode}
                      hitSlop={6}
                    >
                      <Text style={[styles.linkText, { color: colors.accent }]}>
                        {isSignUp ? "Sign in" : "Sign up"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={onClose}
                    style={styles.maybeLater}
                  >
                    <Text style={[styles.maybeLaterText, { color: colors.muted }]}>
                      Maybe later
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={[styles.smsIcon, { backgroundColor: colors.accentSoft }]}>
                    <Text style={[styles.smsIconText, { color: colors.accent }]}>✉</Text>
                  </View>
                  <Text style={[styles.title, styles.centerText, { color: colors.text }]}>
                    Verify your phone
                  </Text>
                  <Text style={[styles.subtitle, styles.centerText, { color: colors.muted }]}>
                    {verificationId
                      ? "We've sent a verification code to your phone number."
                      : "Request a verification code to continue signing in."}
                  </Text>
                  <Text style={[styles.phoneDestination, { color: colors.text }]}>
                    {maskedPhone}
                  </Text>
                  <TextInput
                    ref={codeInput}
                    accessibilityLabel="6-digit verification code"
                    autoComplete="one-time-code"
                    autoFocus
                    editable={!busy}
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) =>
                      setCode(value.replace(/\D/g, "").slice(0, 6))
                    }
                    onSubmitEditing={verifyCode}
                    placeholder="000000"
                    placeholderTextColor={colors.border}
                    returnKeyType="done"
                    style={[
                      styles.otpInput,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                    ]}
                    textContentType="oneTimeCode"
                    value={code}
                  />
                  <Text style={[styles.fieldHint, styles.centerText, { color: colors.muted }]}>
                    Enter the 6-digit code from your text message.
                  </Text>

                  <Feedback error={formError || error} success={successMessage} />
                  <ActionButton
                    label="Verify code"
                    busy={busy}
                    onPress={verifyCode}
                    disabled={code.length !== 6 || !verificationId}
                    colors={colors}
                  />

                  <View style={styles.resendRow}>
                    <Text style={[styles.signUpText, { color: colors.muted }]}>
                      {remainingSeconds > 0
                        ? `Resend code in 00:${String(remainingSeconds).padStart(2, "0")}`
                        : "Didn’t receive a code?"}
                    </Text>
                    {remainingSeconds === 0 && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={resendCode}
                        hitSlop={6}
                      >
                        <Text style={[styles.linkText, { color: colors.accent }]}>
                          {busy ? "Sending…" : verificationId ? "Resend code" : "Send code"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={backToSignIn}
                    style={styles.maybeLater}
                  >
                    <Text style={[styles.maybeLaterText, { color: colors.muted }]}>
                      Use another account
                    </Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function InputField({
  label,
  colors,
  inputRef,
  ...inputProps
}: {
  label: string;
  colors: ThemeColors;
  inputRef?: React.RefObject<TextInput | null>;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        editable
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        {...inputProps}
      />
    </View>
  );
}

function Feedback({ error, success }: { error: string; success: string }) {
  if (error) {
    return (
      <Text accessibilityRole="alert" style={styles.error}>
        {error}
      </Text>
    );
  }
  if (success) {
    return (
      <Text accessibilityRole="alert" style={styles.success}>
        {success}
      </Text>
    );
  }
  return <View style={styles.feedbackSpace} />;
}

function ActionButton({
  label,
  busy,
  disabled,
  onPress,
  colors,
}: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || Boolean(disabled), busy }}
      disabled={busy || Boolean(disabled)}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { backgroundColor: colors.accent },
        (busy || disabled) && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.accentText} />
      ) : (
        <Text style={[styles.primaryText, { color: colors.accentText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon} accessibilityElementsHidden>
      <View style={styles.googleRing} />
      <View style={styles.googleBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    justifyContent: "center",
  },
  keyboardAvoiding: { flex: 1, justifyContent: "center" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: "#E7ECE9",
    shadowColor: "#173C34",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 5,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 30 },
  brandMark: {
    height: 34,
    width: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { fontSize: 19, fontWeight: "900" },
  brandName: { fontSize: 15, fontWeight: "800", letterSpacing: 0.1 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 20 },
  centerText: { textAlign: "center" },
  inputGroup: { marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  fieldHint: { fontSize: 12, lineHeight: 18, marginTop: 7 },
  passwordHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  passwordBox: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 11,
    paddingLeft: 14,
    paddingRight: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  showPassword: { fontSize: 12, fontWeight: "700", padding: 5 },
  linkText: { fontSize: 12, fontWeight: "700" },
  feedbackSpace: { height: 14, marginTop: 10 },
  error: {
    color: "#A8343F",
    backgroundColor: "#FFF0F0",
    borderRadius: 9,
    padding: 11,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  success: {
    color: "#216449",
    backgroundColor: "#EAF5EE",
    borderRadius: 9,
    padding: 11,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  primaryButton: {
    height: 50,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  primaryText: { fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.55 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { height: 1, flex: 1 },
  dividerText: { fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  googleButton: {
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  googleText: { fontSize: 14, fontWeight: "700" },
  googleIcon: { width: 20, height: 20, justifyContent: "center", alignItems: "center" },
  googleRing: {
    width: 19,
    height: 19,
    borderWidth: 3,
    borderRadius: 10,
    borderTopColor: "#EA4335",
    borderRightColor: "#4285F4",
    borderBottomColor: "#34A853",
    borderLeftColor: "#FBBC05",
  },
  googleBar: {
    position: "absolute",
    right: 0,
    top: 9,
    width: 9,
    height: 3,
    backgroundColor: "#4285F4",
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },
  signUpText: { fontSize: 13 },
  maybeLater: { alignItems: "center", paddingTop: 17 },
  maybeLaterText: { fontSize: 12, fontWeight: "600" },
  smsIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  smsIconText: { fontSize: 25, fontWeight: "700" },
  phoneDestination: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    marginTop: -8,
    marginBottom: 20,
  },
  otpInput: {
    height: 58,
    borderWidth: 1,
    borderRadius: 13,
    textAlign: "center",
    letterSpacing: 12,
    paddingLeft: 12,
    fontSize: 24,
    fontWeight: "700",
  },
  resendRow: {
    minHeight: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 20,
  },
});
