import React, { useState } from "react";
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

import { Avatar } from "./Avatar";

interface ChatBubbleProps {
  message: ChatMessageType;
  isOwn: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onImagePress?: (uri: string) => void;
  onRetry?: (msg: ChatMessageType) => void;
}

export const ChatBubble = ({ 
  message, 
  isOwn, 
  isFirstInGroup = true, 
  isLastInGroup = true, 
  onImagePress,
  onRetry
}: ChatBubbleProps) => {
  const { language } = useUIStore();
  const { width } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);
  
  const text = message.text || "";
  const isImage = text.startsWith("[IMAGE] ");
  const isDoc = text.startsWith("[DOCUMENT] ");
  
  const imageUri = isImage ? text.replace("[IMAGE] ", "") : null;
  const docName = isDoc ? text.replace("[DOCUMENT] ", "") : null;
  const isRTL = language === "ar";

  // Bubble width limits
  const maxBubbleWidth = width * 0.8;
  const maxImageWidth = Math.min(280, maxBubbleWidth - 24);

  // Dynamic spacing
  const marginBot = isLastInGroup ? 12 : 2;
  const showTail = isFirstInGroup; 

  return (
    <View style={[
      styles.row,
      isOwn ? styles.rowOwn : styles.rowOther,
      { marginBottom: marginBot }
    ]}>
      {/* Remote Avatar */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          <Avatar 
            userId={message.senderId} 
            name={message.senderName || "Unknown"} 
            avatarUrl={message.sender?.avatarUrl}
            profileImage={(message.sender as any)?.profileImage}
            size={32}
            showPresence={false}
          />
        </View>
      )}

      <View style={[
        styles.container, 
        isOwn ? styles.ownContainer : styles.otherContainer,
        { maxWidth: "80%", flexShrink: 1 }
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
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            borderTopRightRadius: showTail ? 4 : 16,
            borderBottomRightRadius: 16,
            backgroundColor: "rgba(14, 165, 233, 0.15)",
          } : {
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            borderTopLeftRadius: showTail ? 4 : 16,
            borderBottomLeftRadius: 16,
            backgroundColor: "rgba(255,255,255,0.03)",
          },
          { borderColor: isOwn ? "rgba(14, 165, 233, 0.4)" : "rgba(255,255,255,0.08)" }
        ]}
      >
        {isImage ? (
          <TouchableOpacity 
            onPress={() => !imageError && onImagePress?.(imageUri!)}
            activeOpacity={imageError ? 1 : 0.7}
          >
            {imageError ? (
              <View style={[styles.imageErrorContainer, { width: maxImageWidth }]}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textDim} />
                <Text style={styles.imageErrorText}>PAYLOAD_CORRUPTED</Text>
              </View>
            ) : (
              <Image 
                source={{ uri: imageUri! }} 
                style={[styles.contentImage, { width: maxImageWidth, height: 200 }]} 
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
          </TouchableOpacity>
        ) : isDoc ? (
          <TouchableOpacity 
            style={styles.docContainer}
            onPress={() => Linking.openURL(message.fileUrl || "#")}
          >
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            <View style={styles.docInfo}>
              <Text style={styles.docText} numberOfLines={1}>{docName}</Text>
              <Text style={styles.docSize}>SECURE PAYLOAD</Text>
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
            <>
              {message.status === "error" ? (
                <TouchableOpacity onPress={() => onRetry?.(message)}>
                  <Ionicons 
                    name="alert-circle" 
                    size={16} 
                    color={theme.colors.error} 
                    style={[isRTL ? { marginRight: 4 } : { marginLeft: 4 }]}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons 
                  name={message.status === "read" ? "checkmark-done" : message.status === "sent" ? "checkmark" : "time-outline"} 
                  size={12} 
                  color={message.status === "read" ? theme.colors.primary : theme.colors.textDim} 
                  style={[isRTL ? { marginRight: 4 } : { marginLeft: 4 }]}
                />
              )}
            </>
          )}
        </View>
      </GlassView>
    </View>

      {/* Own Avatar */}
      {isOwn && (
        <View style={styles.avatarContainer}>
          <Avatar 
            userId={message.senderId} 
            name={message.senderName || "Me"} 
            avatarUrl={message.sender?.avatarUrl}
            profileImage={(message.sender as any)?.profileImage}
            size={32}
            showPresence={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start", // Top alignment for modern look
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginHorizontal: 6,
    marginTop: 2, // Slight offset for top alignment
  },
  container: {
    flexShrink: 1,
  },
  ownContainer: {
    alignItems: "flex-end",
  },
  otherContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.textDim,
    letterSpacing: 1,
    marginBottom: 2,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  bubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  text: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  time: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.colors.textDim,
    opacity: 0.8,
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
    padding: 8,
    borderRadius: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  docInfo: {
    marginLeft: 10,
    flex: 1,
  },
  docText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  docSize: {
    color: theme.colors.textDim,
    fontSize: 8,
    fontWeight: "800",
    marginTop: 1,
  },
  imageErrorContainer: {
    height: 120,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 4,
  },
  imageErrorText: {
    color: theme.colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: 1,
  }
});
