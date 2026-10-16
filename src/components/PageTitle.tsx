import { StyleSheet, Text, View } from "react-native";
import { ThemeColors } from "../theme";
export function PageTitle({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { paddingTop: 30, paddingBottom: 26 },
  title: { color: "#173C34", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#87918C", fontSize: 12, marginTop: 5 },
});
