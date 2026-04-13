import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform 
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { theme } from "../../shared/theme";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../shared/lib/haptics";
import { useRoleAccess } from "../auth/RoleGuard";

export const GlassTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isStudent, isAdminOrEngineer } = useRoleAccess();

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          {state.routes.map((route, index) => {
            // Hide tabs based on role
            if (isStudent && (route.name === "groups" || route.name === "sessions")) {
              return null;
            }

            const { options } = descriptors[route.key];
            const label = options.title !== undefined ? options.title : route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name);
              }
            };

            const getIcon = (name: string, focused: boolean) => {
              const color = focused ? theme.colors.primary : theme.colors.textDim;
              const size = 24;
              
              switch (name) {
                case "index": return <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />;
                case "groups": return <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />;
                case "sessions": return <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />;
                case "chat": return <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />;
                case "profile": return <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />;
                default: return <Ionicons name="help-outline" size={size} color={color} />;
              }
            };

            return (
              <TouchableOpacity
                key={index}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                {getIcon(route.name, isFocused)}
                <Text style={[
                  styles.label, 
                  { color: isFocused ? theme.colors.primary : theme.colors.textDim }
                ]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.indicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 88 : 64,
  },
  blur: {
    flex: 1,
  },
  content: {
    flexDirection: "row",
    height: "100%",
    paddingBottom: Platform.OS === "ios" ? 28 : 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  }
});
