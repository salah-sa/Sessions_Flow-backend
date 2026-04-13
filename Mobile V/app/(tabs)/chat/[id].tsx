/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Secure Communication Channel
 * Phase 59-62: Interior Operations & Real-time Sync
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Keyboard
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../shared/theme";
import { useGroup } from "../../../shared/queries/useGroupQueries";
import { useChatMessages, useSendMessage, useSendFileMessage } from "../../../shared/queries/useChatQueries";
import { useAuthStore } from "../../../shared/store/stores";
import { useChatStore, useAppStore } from "../../../shared/store/stores";
import { usePresenceStore } from "../../../shared/store/presenceStore";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/queries/keys";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "../../../components/ui/GlassView";
import { ChatBubble } from "../../../components/ui/ChatBubble";
import { Avatar } from "../../../components/ui/Avatar";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "../../../shared/types";
import { haptics } from "../../../shared/lib/haptics";
import { logger } from "../../../shared/lib/logger";
import * as Sentry from "@sentry/react-native";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { CinematicModal } from "../../../components/ui/CinematicModal";
import { Image } from "react-native";
import { useSignalR } from "../../../providers/SignalRProvider";

const TypingIndicator = ({ groupId }: { groupId: string }) => {
  const typingUsers = useChatStore(s => s.typingStates[groupId]);
  if (!typingUsers || typingUsers.length === 0) return null;

  const text = typingUsers.length > 2 
    ? `${typingUsers.length} people are typing...`
    : typingUsers.join(" and ") + (typingUsers.length === 1 ? " is typing..." : " are typing...");

  return (
    <GlassView intensity={20} style={styles.typingIndicator}>
      <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />
      <Text style={styles.typingText}>{text}</Text>
    </GlassView>
  );
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { invoke } = useSignalR();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  
  const { 
    unreadCounts, 
    clearUnread, 
    lastMessages, 
    activeGroupId, 
    setActiveGroup, 
    pendingMessages,
    queueMessage,
    removeFromQueue,
    updatePendingMessage,
    mutedGroups,
    toggleMute
  } = useChatStore();

  const isOnline = useAppStore(s => s.isOnline);

  const { data: group } = useGroup(id as string);
  const { data: messages = [], isLoading } = useChatMessages(id as string);
  const sendMessageMutation = useSendMessage();
  const sendFileMutation = useSendFileMessage();
  
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // Focus Handling
  useEffect(() => {
    logger.track("CHAT_OPEN", { groupId: id });
    Sentry.addBreadcrumb({
      category: 'chat',
      message: `Opened group ${id}`,
      level: 'info'
    });
    setActiveGroup(id as string);
    clearUnread(id as string);
    return () => {
      logger.track("CHAT_CLOSE", { groupId: id });
      setActiveGroup(null);
    };
  }, [id]);

  const handlePickImage = async () => {
    logger.track("IMAGE_PICK_START");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri && id) {
      logger.track("IMAGE_PICK_SUCCESS", { uri: result.assets[0].uri });
      haptics.success();
      const asset = result.assets[0];
      const messageId = Math.random().toString(36).substring(7);
      
      const pendingMsg: ChatMessage = {
        id: messageId,
        groupId: id as string,
        senderId: user!.id,
        senderName: user!.name,
        text: `[IMAGE] ${asset.uri}`,
        sentAt: new Date().toISOString(),
        status: "pending",
      };

      queryClient.setQueryData(
        queryKeys.chat.messages(id as string),
        (old: ChatMessage[] | undefined) => [...(old || []), pendingMsg]
      );

      try {
        await sendFileMutation.mutateAsync({
          groupId: id as string,
          text: `[IMAGE]`,
          fileUri: asset.uri,
          fileName: asset.fileName || 'upload.jpg',
          fileType: asset.mimeType || 'image/jpeg',
          id: messageId
        });
      } catch (err) {
        console.error("Upload failed", err);
        const errorMsg = { ...pendingMsg, status: "error" as const };
        queueMessage(errorMsg);
        // Update cache to show error immediately
        queryClient.setQueryData(
          queryKeys.chat.messages(id as string),
          (old: ChatMessage[] | undefined) => 
            (old || []).map(m => m.id === messageId ? errorMsg : m)
        );
      }
    }
  };

  const handlePickDocument = async () => {
    logger.track("DOCUMENT_PICK_START");
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.assets && result.assets.length > 0 && id) {
      logger.track("DOCUMENT_PICK_SUCCESS", { name: result.assets[0].name });
      haptics.success();
      const asset = result.assets[0];
      const messageId = Math.random().toString(36).substring(7);

      const pendingMsg: ChatMessage = {
        id: messageId,
        groupId: id as string,
        senderId: user!.id,
        senderName: user!.name,
        text: `[DOCUMENT] ${asset.name}`,
        sentAt: new Date().toISOString(),
        status: "pending",
      };

      queryClient.setQueryData(
        queryKeys.chat.messages(id as string),
        (old: ChatMessage[] | undefined) => [...(old || []), pendingMsg]
      );

      try {
        await sendFileMutation.mutateAsync({
          groupId: id as string,
          text: `[DOCUMENT]`,
          fileUri: asset.uri,
          fileName: asset.name,
          fileType: asset.mimeType || 'application/octet-stream',
          id: messageId
        });
      } catch (err) {
        const errorMsg = { ...pendingMsg, status: "error" as const };
        queueMessage(errorMsg);
        queryClient.setQueryData(
          queryKeys.chat.messages(id as string),
          (old: ChatMessage[] | undefined) => 
            (old || []).map(m => m.id === messageId ? errorMsg : m)
        );
      }
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || inputText).trim();
    if (!text || !user || !id || isSending) return;
    
    logger.track("MESSAGE_SEND_START", { length: text.length, isOverride: !!textOverride });
    Sentry.addBreadcrumb({
      category: 'chat',
      message: 'Sending text message',
      level: 'info'
    });
    setIsSending(true);
    if (!textOverride) setInputText("");
    haptics.impact();

    const messageId = Math.random().toString(36).substring(7);

    const pendingMsg: ChatMessage = {
      id: messageId,
      groupId: id,
      senderId: user.id,
      senderName: user.name,
      text: text,
      sentAt: new Date().toISOString(),
      status: "pending",
    };

    queryClient.setQueryData(
      queryKeys.chat.messages(id),
      (old: ChatMessage[] | undefined) => [...(old || []), pendingMsg]
    );

    try {
      await sendMessageMutation.mutateAsync({
        groupId: id,
        message: text,
        id: messageId
      });
      logger.track("MESSAGE_SEND_SUCCESS", { messageId });
      setInputText("");
    } catch (err) {
      logger.error("MESSAGE_SEND_FAILED", err, { messageId });
      console.error("[Chat] Send Error", err);
      const errorMsg = { ...pendingMsg, status: "error" as const };
      queueMessage(errorMsg);
      queryClient.setQueryData(
        queryKeys.chat.messages(id),
        (old: ChatMessage[] | undefined) => 
          (old || []).map(m => m.id === messageId ? errorMsg : m)
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = (msg: ChatMessage) => {
    logger.track("MESSAGE_RETRY", { messageId: msg.id });
    removeFromQueue(msg.id);
    // Remove from cache before retrying to prevent logic mess
    queryClient.setQueryData(
      queryKeys.chat.messages(id as string),
      (old: ChatMessage[] | undefined) => (old || []).filter(m => m.id !== msg.id)
    );
    
    handleSend(msg.text);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (text.length > 0 && !typingTimeoutRef.current) {
      invoke("UserTyping", id, user?.name).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      invoke("UserStoppedTyping", id, user?.name).catch(() => {});
      typingTimeoutRef.current = null;
    }, 3000);
  };

  // Memoize inverted data to prevent array clone every render
  const invertedMessages = React.useMemo(() => {
    const groupPending = pendingMessages.filter(m => m.groupId === id);
    const combined = [...messages];
    
    groupPending.forEach(pm => {
      if (!combined.some(m => m.id === pm.id)) {
        combined.push(pm);
      }
    });

    return combined
      .map(m => ({ ...m, _ts: new Date(m.sentAt).getTime() }))
      .sort((a, b) => b._ts - a._ts);
  }, [messages, pendingMessages, id]);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const prevMessage = invertedMessages[index - 1]; // Message beneath it (newer)
    const nextMessage = invertedMessages[index + 1]; // Message above it (older)

    const isFirstInGroup = nextMessage?.senderId !== item.senderId;
    const isLastInGroup = prevMessage?.senderId !== item.senderId;

    return (
      <ChatBubble 
        message={item} 
        isOwn={item.senderId === user?.id} 
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
        onImagePress={(uri) => setLightboxImage(uri)}
        onRetry={handleRetry}
      />
    );
  };

  const getPresence = usePresenceStore(s => s.getPresence);

  const HeaderRight = () => {
    const isMuted = mutedGroups.includes(id as string);
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <TouchableOpacity 
          onPress={() => setShowMembers(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="people-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            toggleMute(id as string);
            haptics.selection();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isMuted ? "notifications-off" : "notifications"} size={22} color={theme.colors.textDim} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdaptiveHeader 
        title={group?.name || "Channel"} 
        scrollY={scrollY} 
        showBack={true}
        onBack={() => router.back()}
        rightElement={<HeaderRight />}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.flex, { paddingTop: insets.top + (Platform.OS === 'ios' ? 56 : 64) }]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              ref={flatListRef}
              data={invertedMessages}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              inverted
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              removeClippedSubviews={true}
              onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
            <TypingIndicator groupId={id as string} />
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <GlassView 
            intensity={90} 
            tint="dark"
            style={styles.inputBarWrapper}
          >
            <View style={styles.inputBarContent}>
              <View style={styles.leftActions}>
                <TouchableOpacity 
                  onPress={() => {
                    haptics.selection();
                    if (!showEmojiPicker) Keyboard.dismiss();
                    setShowEmojiPicker(!showEmojiPicker);
                  }} 
                  style={styles.actionBtn}
                  accessibilityLabel="Emoji"
                >
                  <Ionicons name={showEmojiPicker ? "keypad-outline" : "happy-outline"} size={22} color={showEmojiPicker ? theme.colors.primary : "rgba(255,255,255,0.5)"} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handlePickImage} 
                  style={styles.actionBtn}
                  accessibilityLabel="Attach Image"
                >
                  <Ionicons name="images-outline" size={22} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handlePickDocument} 
                  style={styles.actionBtn}
                  accessibilityLabel="Attach Document"
                >
                  <Ionicons name="add-circle-outline" size={22} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
          
              <TextInput
                style={styles.input}
                placeholder={isOnline ? "Type a message..." : "Waiting for network..."}
                placeholderTextColor={theme.colors.textDim}
                value={inputText}
                onChangeText={handleInputChange}
                multiline
                maxLength={1000}
                textAlignVertical="center"
                editable={isOnline}
              />
              
              <TouchableOpacity 
                onPress={() => handleSend()} 
                disabled={!inputText.trim() || !isOnline}
                style={[styles.sendBtn, (!inputText.trim() || !isOnline) && styles.disabledSendBtn]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={isOnline ? "send" : "cloud-offline"} 
                  size={18} 
                  color={inputText.trim() && isOnline ? "#fff" : "rgba(255,255,255,0.3)"} 
                />
              </TouchableOpacity>
            </View>

            {/* Inline Emoji Picker */}
            {showEmojiPicker && (
              <View style={styles.emojiContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiList}
                  keyboardShouldPersistTaps="always"
                >
                  {['😀','😂','🥰','😎','🥺','✨','🔥','❤️','👍','🎉','😭','🙌','🫡','🤔','👀','🚀','💯','✅'].map(emoji => (
                    <TouchableOpacity 
                      key={emoji} 
                      onPress={() => {
                        haptics.selection();
                        setInputText(prev => prev + emoji);
                      }}
                      style={styles.emojiItem}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
          </GlassView>
      </View>
    </KeyboardAvoidingView>

      <CinematicModal 
        visible={!!lightboxImage} 
        onClose={() => setLightboxImage(null)}
        title="MESSAGE INSPECTION"
      >
        <View style={styles.lightboxContainer}>
          {lightboxImage && (
            <Image 
              source={{ uri: lightboxImage }} 
              style={styles.lightboxImage} 
              resizeMode="contain"
            />
          )}
        </View>
      </CinematicModal>

      <CinematicModal
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        title={`MEMBERS (${(group?.students?.length || 0) + (group?.engineer ? 1 : 0)})`}
      >
        <ScrollView style={styles.membersList} contentContainerStyle={{ paddingBottom: 40 }}>
          {group?.engineer && (
            <View style={styles.memberRow}>
              <Avatar 
                userId={group.engineer.id} 
                name={group.engineer.name} 
                avatarUrl={group.engineer.avatarUrl}
                size={40}
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {group.engineer.name} 
                  {user?.id === group.engineer.id && <Text style={styles.meLabel}> (me)</Text>}
                </Text>
                <Text style={styles.memberRole}>Engineer / Instructor</Text>
              </View>
            </View>
          )}

          {group?.students?.map(student => (
            <View key={student.id} style={styles.memberRow}>
              <Avatar 
                userId={student.userId || student.id} 
                name={student.name} 
                avatarUrl={student.avatarUrl}
                size={40}
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {student.name}
                  {user?.id === student.id && <Text style={styles.meLabel}> (me)</Text>}
                </Text>
                <Text style={styles.memberRole}>Student • {student.studentId || "No Code"}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </CinematicModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  inputBarContainer: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  inputBarWrapper: {
    paddingTop: 10,
  },
  inputBarContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexShrink: 0,
  },
  actionBtn: {
    padding: 8,
    marginRight: 2,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  disabledSendBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  emojiContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  emojiList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  emojiItem: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 26,
  },
  lightboxContainer: {
    padding: 10,
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: 400,
    borderRadius: 20,
  },
  typingIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 80,
    left: 20,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
  },
  typingText: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "600",
  },
  membersList: {
    padding: 20,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  memberInfo: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.typography.h3.fontFamily,
  },
  meLabel: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  memberRole: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  }
});
