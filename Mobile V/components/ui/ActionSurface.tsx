import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { 
  BottomSheetBackdrop, 
  BottomSheetView,
  BottomSheetBackdropProps 
} from "@gorhom/bottom-sheet";
import { theme } from "../../shared/theme";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Action Surface
 * Phase 29: Cinematic Bottom Sheet
 * ═══════════════════════════════════════════════════════════
 */

interface ActionSurfaceProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: string[] | number[];
  onClose?: () => void;
}

export interface ActionSurfaceRef {
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

export const ActionSurface = forwardRef<ActionSurfaceRef, ActionSurfaceProps>(({ 
  children, 
  title, 
  snapPoints = ["25%", "50%", "90%"],
  onClose 
}, ref) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.expand(),
    collapse: () => bottomSheetRef.current?.collapse(),
    close: () => bottomSheetRef.current?.close(),
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsAt={-1}
        appearsAt={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={(index) => {
        if (index === -1 && onClose) onClose();
      }}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.content}>
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        <View style={styles.body}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.xl,
  },
  indicator: {
    backgroundColor: theme.colors.textDim,
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  body: {
    flex: 1,
  }
});
