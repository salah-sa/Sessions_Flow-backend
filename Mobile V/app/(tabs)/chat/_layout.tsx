import { Stack } from "expo-router";
import { theme } from "../../../shared/theme";

export default function ChatLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen name="[groupId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
