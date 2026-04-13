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
  ScrollView
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../../shared/theme";
import { useGroup } from "../../../shared/queries/useGroupQueries";
import { useChatMessages, useSendMessage } from "../../../shared/queries/useChatQueries";
import { useAuthStore } from "../../../shared/store/stores";
import { useChatStore } from "../../../shared/store/stores";
import { usePresenceStore } from "../../../shared/store/presenceStore";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/queries/keys";
import { AdaptiveHeader } from "../../../components/layout/AdaptiveHeader";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "../../../components/ui/GlassView";
import { ChatBubble } from "../../../components/ui/ChatBubble";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "../../../shared/types";
import { haptics } from "../../../shared/lib/haptics";

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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  
  const { 
    setActiveGroup, 
    clearUnread, 
    setLastMessage, 
    queueMessage,
    mutedGroups,
    toggleMute
  } = useChatStore();

  const { data: group } = useGroup(id as string);
  const { data: messages = [], isLoading } = useChatMessages(id as string);
  const sendMessageMutation = useSendMessage();
  
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const scrollY = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // Focus Handling
  useEffect(() => {
    setActiveGroup(id as string);
    clearUnread(id as string);
    return () => setActiveGroup(null);
  }, [id]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      haptics.success();
      handleSend(`[IMAGE] ${result.assets[0].uri}`);
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.assets && result.assets.length > 0) {
      haptics.success();
      handleSend(`[DOCUMENT] ${result.assets[0].name}`);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || inputText).trim();
    if (!text || !user || !id) return;
    
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
    } catch (err) {
      console.error("[Chat] Send Error", err);
      queueMessage(pendingMsg);
    }
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

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble 
      message={item} 
      isOwn={item.senderId === user?.id} 
      onImagePress={(uri) => setLightboxImage(uri)}
    />
  );

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
        style={[styles.flex, { paddingTop: insets.top + 56 }]}
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
              data={[...messages].reverse()}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              inverted
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
        <View style={[styles.inputBarContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <GlassView 
            intensity={90} 
            tint="dark"
            style={styles.inputBarWrapper}
            contentContainerStyle={styles.inputBarContent}
          >
            <TouchableOpacity 
              onPress={() => haptics.selection()} 
              style={styles.attachBtn}
              accessibilityLabel="Emoji"
            >
              <Ionicons name="happy-outline" size={24} color={theme.colors.textDim} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handlePickDocument} 
              style={styles.attachBtn}
              accessibilityLabel="Attach Document"
            >
              <Ionicons name="add-circle" size={24} color={theme.colors.textDim} />
            </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textDim}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            textAlignVertical="center"
          />
          
          <TouchableOpacity 
            onPress={() => handleSend()} 
            disabled={!inputText.trim()}
            style={[styles.sendBtn, !inputText.trim() && styles.disabledBtn]}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? "#fff" : theme.colors.textDim} />
          </TouchableOpacity>
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
              <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + "40" }]}>
                <Text style={styles.memberAvatarText}>{group.engineer.name[0]}</Text>
              </View>
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
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{student.name[0]}</Text>
              </View>
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 20,
  },
  inputBarContainer: {
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  inputBarWrapper: {
    paddingTop: 8,
  },
  inputBarContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    width: "100%",
  },
  attachBtn: {
    padding: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    marginBottom: 6,
  },
  disabledBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 20,
    left: 20,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.2)",
  },
  typingText: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "600",
  },
  membersList: {
    padding: theme.spacing.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
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
