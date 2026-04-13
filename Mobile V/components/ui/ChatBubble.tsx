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

import { Image, TouchableOpacity } from "react-native";

interface ChatBubbleProps {
  message: ChatMessageType;
  isOwn: boolean;
  onImagePress?: (uri: string) => void;
}

export const ChatBubble = ({ message, isOwn, onImagePress }: ChatBubbleProps) => {
  const isImage = message.text.startsWith("[IMAGE] ");
  const imageUri = isImage ? message.text.replace("[IMAGE] ", "") : null;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && (
        <Text style={styles.senderName}>{message.senderName}</Text>
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
            <Image source={{ uri: imageUri! }} style={styles.contentImage} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.text}>{message.text}</Text>
        )}
        
        <View style={styles.footer}>
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
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  }
});
