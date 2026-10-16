import "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: import("@react-native-async-storage/async-storage").AsyncStorage,
  ): import("firebase/auth").Persistence;
}
