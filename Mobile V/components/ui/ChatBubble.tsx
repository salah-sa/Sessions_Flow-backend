import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../shared/theme";
import { ChatMessage as ChatMessageType } from "../../shared/types";
import { format } from "date-fns";
import { GlassView } from "./GlassView";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Chat Bubble
 * Phase 59: Interior Communication Interface
 * ═══════════════════════════════════════════════════════════
 */

import { Image, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUIStore } from "../../shared/store/stores";

import { useWindowDimensions } from "react-native";

interface ChatBubbleProps {
  message: ChatMessageType;
  isOwn: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onImagePress?: (uri: string) => void;
}

export const ChatBubble = ({ 
  message, 
  isOwn, 
  isFirstInGroup = true, 
  isLastInGroup = true, 
  onImagePress 
}: ChatBubbleProps) => {
  const { language } = useUIStore();
  const { width } = useWindowDimensions();
  const isImage = message.text.startsWith("[IMAGE] ");
  const isDoc = message.text.startsWith("[DOCUMENT] ");
  
  const imageUri = isImage ? message.text.replace("[IMAGE] ", "") : null;
  const docName = isDoc ? message.text.replace("[DOCUMENT] ", "") : null;
  const isRTL = language === "ar";

  // Bubble tails calculation: 
  // Normally isOwn (Right aligned) has top-right edge sharp.
  // In RTL, the text flows from right, but wait...
  // The user says "Received message -> Left, Sent -> Right"
  // If the received message is on the Left, the tail should point to the left speaker (top-left sharp).
  // If the sent message is on the Right, the tail should point to the right speaker (top-right sharp).
  // This physically doesn't change based on language! The tail points to where the avatar/side is.
  // So tail logic REMAINS EXACTLY THE SAME.
  // Only the text direction inside the bubble changes, and footer flex-direction if needed.

  // Bubble width limits
  const maxBubbleWidth = width * 0.8;
  const maxImageWidth = Math.min(280, maxBubbleWidth - 24);

  // Dynamic spacing
  const marginBot = isLastInGroup ? 16 : 2;
  const showTail = isFirstInGroup; // Standard tail at Top (TopLeft or TopRight)

  return (
    <View style={[
      styles.row,
      isOwn ? styles.rowOwn : styles.rowOther,
      { marginBottom: marginBot }
    ]}>
      {/* Remote Avatar */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          {isFirstInGroup ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{message.senderName?.[0] || "?"}</Text>
            </View>
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}

      <View style={[
        styles.container, 
        isOwn ? styles.ownContainer : styles.otherContainer,
        { maxWidth: "70%" }
      ]}>
        {(!isOwn && isFirstInGroup) && (
          <Text style={[styles.senderName, isRTL && { textAlign: 'right', marginRight: 4 }]}>
            {message.senderName}
          </Text>
        )}
      
      <GlassView 
        intensity={isOwn ? 40 : 15} 
        style={[
          styles.bubble, 
          isOwn ? {
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
            borderTopRightRadius: showTail ? 4 : 18,
            borderBottomRightRadius: 18,
            backgroundColor: "rgba(14, 165, 233, 0.1)",
          } : {
            borderTopRightRadius: 18,
            borderBottomRightRadius: 18,
            borderTopLeftRadius: showTail ? 4 : 18,
            borderBottomLeftRadius: 18,
            backgroundColor: "rgba(255,255,255,0.02)",
          },
          { borderColor: isOwn ? "rgba(14, 165, 233, 0.3)" : "rgba(255,255,255,0.05)" }
        ]}
      >
        {isImage ? (
          <TouchableOpacity onPress={() => onImagePress?.(imageUri!)}>
            <Image 
              source={{ uri: imageUri! }} 
              style={[styles.contentImage, { width: maxImageWidth, height: 250 }]} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : isDoc ? (
          <TouchableOpacity 
            style={styles.docContainer}
            onPress={() => Linking.openURL(message.fileUrl || "#")}
          >
            <Ionicons name="document-text" size={32} color={theme.colors.primary} />
            <View style={styles.docInfo}>
              <Text style={styles.docText} numberOfLines={1}>{docName}</Text>
              <Text style={styles.docSize}>PHASE 79 SECURE PAYLOAD</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text 
            style={[styles.text, isRTL && { textAlign: 'right' }]}
            textBreakStrategy="highQuality"
          >
            {message.text}
          </Text>
        )}
        
        <View style={[styles.footer, isRTL && { flexDirection: 'row-reverse', justifyContent: 'flex-start' }]}>
          <Text style={styles.time}>{format(new Date(message.sentAt), "h:mm a")}</Text>
          {isOwn && (
            <Ionicons 
              name={message.status === "read" ? "checkmark-done" : message.status === "sent" ? "checkmark" : "time-outline"} 
              size={14} 
              color={message.status === "read" ? theme.colors.primary : theme.colors.textDim} 
              style={[isRTL ? { marginRight: 4 } : { marginLeft: 4 }]}
            />
          )}
        </View>
      </GlassView>
    </View>

      {/* Own Avatar (Optional to display, adding for parity structure if requested, otherwise we can just use spacer) */}
      {isOwn && (
        <View style={styles.avatarContainer}>
          {isFirstInGroup ? (
             <View style={[styles.avatar, styles.ownAvatar]}>
               <Text style={styles.avatarText}>{message.senderName?.[0] || "?"}</Text>
             </View>
          ) : (
             <View style={styles.avatarSpacer} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end", // Align avatars at the bottom of the message group, or top? User usually prefers top. Let's use flex-start.
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginHorizontal: 8,
    alignSelf: "flex-end", // Avatar at the bottom next to the latest message in the bubble group
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  ownAvatar: {
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    borderColor: "rgba(14, 165, 233, 0.4)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  avatarSpacer: {
    width: 28,
  },
  container: {
    // marginBottom removed from here, applied to row wrapper
  },
  ownContainer: {
    alignItems: "flex-end",
  },
  otherContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    padding: 10,
    borderWidth: 1,
  },
  text: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  time: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textDim,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginLeft: 4,
    opacity: 0.5,
  },
  contentImage: {
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  docContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  docInfo: {
    marginLeft: 12,
    flex: 1,
  },
  docText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  docSize: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  }
});
