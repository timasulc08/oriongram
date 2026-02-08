import React, { useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { createM3Theme, m3 } from './theme/material3';
import { useStore } from './stores/chatStore';
import { MainLayout } from './components/Layout/MainLayout';
import { AuthScreen } from './components/Auth/AuthScreen';
import { VerifyEmailScreen } from './components/Auth/VerifyEmailScreen';
import { 
  onAuth, 
  getMyProfile, 
  startPresence, 
  stopPresence, 
  finishGoogleRedirectIfAny, 
  createUserDocAndSavedChatForCurrentUser,
  listenForExternalAuth 
} from './api/auth';
import { useNotifications } from './hooks/useNotifications';
import { auth } from './config/firebase';
import { App as CapApp } from '@capacitor/app';

// Хелпер проверки подтверждения почты
function mustVerifyEmail(user: any): boolean {
  if (!user) return false;
  const hasPasswordProvider = (user.providerData || []).some((p: any) => p.providerId === 'password');
  return hasPasswordProvider && !user.emailVerified;
}

export default function App() {
  const themeMode = useStore((s) => s.themeMode);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const authStep = useStore((s) => s.authStep);

  const setLoggedIn = useStore((s) => s.setLoggedIn);
  const setAuthStep = useStore((s) => s.setAuthStep);
  const setMyProfile = useStore((s) => s.setMyProfile);

  const theme = useMemo(() => createM3Theme(themeMode), [themeMode]);
  const t = m3[themeMode];

  // Инициализация уведомлений
  useNotifications();

  // ВСЕ ЭФФЕКТЫ ДОЛЖНЫ БЫТЬ ТУТ (ВНУТРИ ФУНКЦИИ)
  useEffect(() => {
    // 1. Слушаем ответ от внешнего браузера (Google Auth)
    listenForExternalAuth(() => {
      console.log("Вход через браузер успешен!");
      // window.location.reload(); // Опционально
    });

    // 2. Обработка Google Redirect (Android)
    finishGoogleRedirectIfAny().catch(console.error);

    // 3. Основной слушатель авторизации Firebase
    const unsub = onAuth(async (user) => {
      try {
        if (!user) {
          stopPresence();
          setLoggedIn(false);
          setAuthStep('login');
          setMyProfile(null);
          return;
        }

        await user.reload();

        if (mustVerifyEmail(user)) {
          stopPresence();
          setLoggedIn(false);
          setAuthStep('login');
          return;
        }

        // Авто-создание профиля если зашли через Google
        await createUserDocAndSavedChatForCurrentUser().catch(() => {});

        setLoggedIn(true);
        setAuthStep('done');

        const profile = await getMyProfile();
        if (profile) setMyProfile(profile);

        startPresence();
      } catch (e) {
        console.error('[App] auth error:', e);
        setLoggedIn(false);
        setAuthStep('login');
      }
    });

    return () => {
      unsub();
      stopPresence();
    };
  }, []);

  if (authStep === 'checking') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, backgroundColor: t.surface }}>
          <CircularProgress sx={{ color: t.primary }} />
          <Typography sx={{ color: t.onSurfaceVariant }}>Подключение...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const currentUser = auth.currentUser;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {currentUser && mustVerifyEmail(currentUser) ? (
        <VerifyEmailScreen />
      ) : isLoggedIn && authStep === 'done' ? (
        <MainLayout />
      ) : (
        <AuthScreen />
      )}
    </ThemeProvider>
  );
}