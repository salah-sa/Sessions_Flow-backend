import React, { useState } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { theme } from "../../shared/theme";
import { resolveMediaUrl } from "../../shared/api/config";
import { usePresenceStore } from "../../shared/store/presenceStore";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Universal Avatar
 * Phase 32: Presence-Integrated Identity
 * ═══════════════════════════════════════════════════════════
 */

interface AvatarProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  profileImage?: string; // Fallback support requested by user
  size?: number;
  showPresence?: boolean;
}

export const Avatar = ({ 
  userId, 
  name, 
  avatarUrl, 
  profileImage,
  size = 40, 
  showPresence = true 
}: AvatarProps) => {
  const isOnline = usePresenceStore((state) => state.isOnline(userId));
  const [imageError, setImageError] = useState(false);

  const getInitials = (n: string) => {
    if (!n) return "?";
    return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const rawUrl = profileImage || avatarUrl;
  const imageUri = rawUrl && !imageError ? resolveMediaUrl(rawUrl) : undefined;

  return (
    <View 
      style={[styles.container, { width: size, height: size }]}
      accessible={true}
      accessibilityLabel={`Avatar for ${name}, ${isOnline ? "Online" : "Offline"}`}
      accessibilityRole="image"
    >
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={[styles.image, { borderRadius: size / 2.5 }]} 
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: size / 2.5, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
        </View>
      )}

      {showPresence && (
        <View style={[
          styles.presenceIndicator, 
          { 
            backgroundColor: isOnline ? theme.colors.success : theme.colors.textDim,
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: (size * 0.25) / 2,
            borderWidth: 2,
            borderColor: theme.colors.bg,
          }
        ]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  initials: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontFamily: theme.typography.h3.fontFamily,
  },
  presenceIndicator: {
    position: "absolute",
    bottom: -1,
    right: -1,
  }
});
