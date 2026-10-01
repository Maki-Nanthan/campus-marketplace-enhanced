import { ScrollView, StyleSheet } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { PageTitle } from "../components/PageTitle";
export function MessagesPage({ onBrowse }: { onBrowse: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageTitle title="Messages" subtitle="Keep campus meetups simple" />
      <EmptyState
        title="Your inbox is quiet"
        message="When you message a seller, conversations will show up here."
        action="Browse listings"
        onAction={onBrowse}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
});
