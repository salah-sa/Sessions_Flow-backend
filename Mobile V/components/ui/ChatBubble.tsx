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
  onImagePress?: (uri: string) => void;
}

export const ChatBubble = ({ message, isOwn, onImagePress }: ChatBubbleProps) => {
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

  return (
    <View style={[
      styles.container, 
      isOwn ? styles.ownContainer : styles.otherContainer,
      { maxWidth: maxBubbleWidth }
    ]}>
      {!isOwn && (
        <Text style={[styles.senderName, isRTL && { textAlign: 'right', marginRight: 4 }]}>
          {message.senderName}
        </Text>
      )}
      
      <GlassView 
        intensity={isOwn ? 40 : 15} 
        style={[
          styles.bubble, 
          isOwn ? styles.ownBubble : styles.otherBubble,
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
          <Text style={[styles.text, isRTL && { textAlign: 'right' }]}>{message.text}</Text>
        )}
        
        <View style={[styles.footer, isRTL && { flexDirection: 'row-reverse', justifyContent: 'flex-start' }]}>
          <Text style={styles.time}>{format(new Date(message.sentAt), "h:mm a")}</Text>
          {isOwn && message.status === "pending" && (
            <View style={styles.statusDot} />
          )}
        </View>
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    maxWidth: "85%",
  },
  ownContainer: {
    alignSelf: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
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
    padding: 12,
    borderWidth: 1,
  },
  ownBubble: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 18,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  otherBubble: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 18,
    backgroundColor: "rgba(255,255,255,0.02)",
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
