import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Switch } from 'react-native';
import { AdaptiveHeader } from '../components/layout/AdaptiveHeader';
import { useSharedValue } from 'react-native-reanimated';
import { theme } from '../shared/theme';
import { RoleGuard } from '../components/auth/RoleGuard';
import { useUIStore, useAuthStore } from '../shared/store/stores';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../components/ui/GlassView';
import { ScrollView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { haptics } from '../shared/lib/haptics';

export default function SettingsScreen() {
  const scrollY = useSharedValue(0);
  const { t, i18n } = useTranslation();
  const { logout } = useAuthStore();
  const { language, setLanguage, theme: currentTheme, setTheme } = useUIStore();

  const isRTL = language === 'ar';
  
  const handleLogout = async () => {
    haptics.warning();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleLanguageToggle = () => {
    haptics.selection();
    const nextLang = language === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
    i18n.changeLanguage(nextLang);
  };

  const handleThemeToggle = () => {
    haptics.selection();
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <RoleGuard allowedRoles={["Admin", "Engineer", "Student"]}>
      <View style={styles.container}>
        <AdaptiveHeader title={t('profile.title', 'System Settings')} scrollY={scrollY} showBack />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {/* Preferences Section */}
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>GLOBAL PREFERENCES</Text>
          
          <GlassView intensity={15} style={styles.card}>
            <View style={[styles.settingRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.settingInfo, isRTL && { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 12 }]}>
                <Ionicons name="color-palette-outline" size={24} color={theme.colors.primary} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, isRTL && { textAlign: 'right' }]}>Visual Theme</Text>
                  <Text style={[styles.settingDesc, isRTL && { textAlign: 'right' }]}>{currentTheme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}</Text>
                </View>
              </View>
              <Switch 
                value={currentTheme === 'light'} 
                onValueChange={handleThemeToggle}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.settingRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.settingInfo, isRTL && { alignItems: 'flex-end', paddingLeft: 0, paddingRight: 12 }]}>
                <Ionicons name="language-outline" size={24} color={theme.colors.accent} />
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, isRTL && { textAlign: 'right' }]}>{t('profile.localization', 'System Language')}</Text>
                  <Text style={[styles.settingDesc, isRTL && { textAlign: 'right' }]}>{language === 'en' ? 'English (US)' : 'العربية (AR)'}</Text>
                </View>
              </View>
              <Switch 
                value={language === 'ar'} 
                onValueChange={handleLanguageToggle}
                trackColor={{ false: theme.colors.surface, true: theme.colors.accent }}
              />
            </View>
          </GlassView>

          {/* Account Actions */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }, isRTL && { textAlign: 'right' }]}>ACCESS PROTOCOL</Text>
          
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <GlassView intensity={20} style={[styles.logoutGlass, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
              <Text style={styles.logoutText}>{t('profile.logout', 'Sign Out')}</Text>
            </GlassView>
          </TouchableOpacity>
          
          <Text style={styles.versionLabel}>SF_MOBILE_CORE v2.0.4-PROD</Text>
        </ScrollView>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextWrap: {
    marginLeft: 12,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 12,
  },
  logoutBtn: {
    marginTop: 10,
  },
  logoutGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)', // error color hint
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
    marginRight: 10,
  },
  versionLabel: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 40,
    fontWeight: '600',
    letterSpacing: 1,
  }
});
