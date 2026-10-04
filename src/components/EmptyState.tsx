import { Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeColors } from "../theme";

export function EmptyState({
  title,
  message,
  action,
  onAction,
  colors,
}: {
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✦</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      {action && (
        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={onAction}>
          <Text style={[styles.buttonText, { color: colors.accentText }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 30, paddingTop: 80 },
  icon: { color: "#6A9D82", fontSize: 34, marginBottom: 12 },
  title: { color: "#173C34", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  message: { color: "#87918C", textAlign: "center", lineHeight: 20 },
  button: {
    height: 50,
    marginTop: 24,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: "#1F5D4C",
    justifyContent: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "800" },
});
