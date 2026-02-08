import React, { useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { createM3Theme, m3 } from './theme/material3';
import { useStore } from './stores/chatStore';
import { MainLayout } from './components/Layout/MainLayout';
import { AuthScreen } from './components/Auth/AuthScreen';
import { onAuth, getMyProfile, startPresence, stopPresence } from './api/auth';
import { useNotifications } from './hooks/useNotifications';
import { initPushNotifications } from './utils/push'; // Если есть файл utils/push.ts

export default function App() {
  const themeMode = useStore(s => s.themeMode);
  const isLoggedIn = useStore(s => s.isLoggedIn);
  const authStep = useStore(s => s.authStep);
  const setLoggedIn = useStore(s => s.setLoggedIn);
  const setAuthStep = useStore(s => s.setAuthStep);
  const setMyProfile = useStore(s => s.setMyProfile);
  const theme = useMemo(() => createM3Theme(themeMode), [themeMode]);
  const t = m3[themeMode];

  useNotifications();

  useEffect(() => {
    const unsub = onAuth(async (user) => {
      if (user) {
        setLoggedIn(true); setAuthStep('done');
        const profile = await getMyProfile();
        if (profile) setMyProfile(profile);
        startPresence();
      } else {
        stopPresence();
        setLoggedIn(false); setAuthStep('login');
      }
        if (window.Capacitor?.getPlatform() === 'android') {
          import('./utils/push').then(m => m.initPushNotifications());
        }
      });
    return () => { unsub(); stopPresence(); };
  }, []);

  if (authStep === 'checking') {
    return (
      <ThemeProvider theme={theme}><CssBaseline />
        <Box sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2, backgroundColor: t.surface }}>
          <CircularProgress sx={{ color: t.primary }} />
          <Typography sx={{ color: t.onSurfaceVariant }}>Подключение...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}><CssBaseline />
      {isLoggedIn && authStep === 'done' ? <MainLayout /> : <AuthScreen />}
    </ThemeProvider>
  );
}
