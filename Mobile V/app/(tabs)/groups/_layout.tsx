import { Stack } from "expo-router";
import { theme } from "../../../shared/theme";

export default function GroupsLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="index" options={{ title: 'Groups' }} />
      <Stack.Screen name="[id]" options={{ title: 'Group Details' }} />
    </Stack>
  );
}
