import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  useSharedValue
} from "react-native-reanimated";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useUIStore, useAuthStore } from "../../shared/store/stores";
import { theme } from "../../shared/theme";
import { GlassView } from "../ui/GlassView";
import { haptics } from "../../shared/lib/haptics";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/(tabs)", icon: "grid-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "Groups", href: "/(tabs)/groups", icon: "folder-outline", roles: ["Admin", "Engineer"] },
  { name: "Sessions", href: "/(tabs)/sessions", icon: "radio-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "Chat", href: "/(tabs)/chat", icon: "chatbubbles-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "Students", href: "/(tabs)/students", icon: "people-outline", roles: ["Admin", "Engineer"] },
  { name: "Timetable", href: "/(tabs)/timetable", icon: "calendar-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "History", href: "/(tabs)/history", icon: "time-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "Archive", href: "/(tabs)/archive", icon: "archive-outline", roles: ["Admin", "Engineer"] },
  { name: "Profile", href: "/(tabs)/profile", icon: "person-outline", roles: ["Admin", "Engineer", "Student"] },
  { name: "Settings", href: "/settings", icon: "settings-outline", roles: ["Admin", "Engineer", "Student"] },
];

export const SideDrawer = () => {
  const { isDrawerOpen, toggleDrawer, language } = useUIStore();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isRTL = language === "ar";
  const drawerWidth = Math.min(width * 0.75, 320);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(isDrawerOpen ? 1 : 0, {
      damping: 20,
      stiffness: 150,
      mass: 0.8
    });
  }, [isDrawerOpen]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      pointerEvents: isDrawerOpen ? "auto" : "none",
      zIndex: isDrawerOpen ? 998 : -1
    };
  });

  const drawerStyle = useAnimatedStyle(() => {
    const translation = interpolate(
      progress.value,
      [0, 1],
      [isRTL ? drawerWidth : -drawerWidth, 0]
    );

    return {
      transform: [{ translateX: translation }],
      zIndex: isDrawerOpen ? 999 : -1
    };
  });

  const handleNav = (href: string) => {
    haptics.selection();
    toggleDrawer();
    setTimeout(() => {
      router.push(href as any);
    }, 150);
  };

  const allowedItems = NAV_ITEMS.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isDrawerOpen ? "auto" : "none"}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleDrawer} />
      </Animated.View>

      <Animated.View style={[
        styles.drawer, 
        { 
          width: drawerWidth, 
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
          left: isRTL ? undefined : 0,
          right: isRTL ? 0 : undefined,
        },
        drawerStyle
      ]}>
        <GlassView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        <View style={[styles.header, isRTL && styles.headerRtl]}>
          <View style={[styles.brandContainer, isRTL && styles.rowReverse]}>
            <View style={styles.logoBadge}>
              <Ionicons name="infinite" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.brandName, isRTL ? { marginRight: 10 } : { marginLeft: 10 }]}>SessionFlow</Text>
          </View>
          <TouchableOpacity onPress={toggleDrawer} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {user && (
          <View style={[styles.userSection, isRTL && styles.rowReverse]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name[0]}</Text>
            </View>
            <View style={[styles.userInfo, isRTL && styles.userInfoRtl]}>
              <Text style={[styles.userName, isRTL && { textAlign: 'right' }]}>{user.name}</Text>
              <Text style={[styles.userRole, isRTL && { textAlign: 'right' }]}>{user.role}</Text>
            </View>
          </View>
        )}

        <View style={styles.navContainer}>
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/(tabs)" && pathname.startsWith(item.href));
            return (
              <TouchableOpacity
                key={item.href}
                style={[
                  styles.navItem,
                  isRTL && styles.rowReverse,
                  isActive && styles.navItemActive
                ]}
                onPress={() => handleNav(item.href)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={22} 
                  color={isActive ? theme.colors.primary : theme.colors.textDim} 
                />
                <Text style={[
                  styles.navText,
                  isActive && styles.navTextActive,
                  isRTL ? { marginRight: 16 } : { marginLeft: 16 }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.navItem, isRTL && styles.rowReverse, { marginBottom: 16 }]}
            onPress={() => {
              haptics.selection();
              toggleDrawer();
              useAuthStore.getState().logout();
              router.replace("/(auth)/login");
            }}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={[styles.navText, { color: "#ef4444" }, isRTL ? { marginRight: 16 } : { marginLeft: 16 }]}>
              Logout
            </Text>
          </TouchableOpacity>
          <Text style={styles.version}>v.2.0.0 (Mobile Core)</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  headerRtl: {
    flexDirection: "row-reverse",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.typography.h3.fontFamily,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 8,
    marginRight: -8,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "900",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userInfoRtl: {
    marginLeft: 0,
    marginRight: 16,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  userRole: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  navText: {
    color: theme.colors.textDim,
    fontSize: 16,
    fontWeight: "600",
  },
  navTextActive: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  footer: {
    paddingHorizontal: 20,
  },
  version: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  }
});
