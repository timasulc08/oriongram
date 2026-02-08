import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';
import { resendVerificationEmail, refreshEmailVerified, logout } from '../../api/auth';

export const VerifyEmailScreen: React.FC = () => {
  const t = m3[useStore(s => s.themeMode)];
  const setAuthStep = useStore(s => s.setAuthStep);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  const handleResend = async () => {
    setLoading(true); setInfo('');
    try {
      await resendVerificationEmail();
      setInfo('Письмо отправлено ещё раз.');
    } catch (e: any) {
      setInfo(e.message || 'Ошибка отправки');
    }
    setLoading(false);
  };

  const handleIConfirmed = async () => {
    setLoading(true); setInfo('');
    try {
      const ok = await refreshEmailVerified();
      if (ok) {
        setAuthStep('done');
      } else {
        setInfo('Пока не подтверждено. Открой письмо и нажми ссылку, затем попробуй снова.');
      }
    } catch (e: any) {
      setInfo(e.message || 'Ошибка');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    setAuthStep('login');

    window.location.reload();
  };

  return (
    <Box sx={{
      height: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.surface,
      backgroundImage: `radial-gradient(ellipse at 50% 0%, ${t.primaryContainer}33 0%, transparent 70%)`,
      p: 2,
    }}>
      <Box sx={{
        width: '100%', maxWidth: 440,
        p: 4,
        borderRadius: '24px',
        backgroundColor: t.surfaceContainerLow,
        border: `1px solid ${t.outlineVariant}`,
        boxShadow: `0 8px 40px ${t.shadow}22`,
        display: 'flex', flexDirection: 'column', gap: 1.5,
      }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: t.onSurface }}>
          Подтверди почту
        </Typography>
        <Typography sx={{ color: t.onSurfaceVariant }}>
          Мы отправили письмо со ссылкой подтверждения. Открой почту и нажми ссылку.
        </Typography>

        {info && (
          <Typography sx={{ color: t.primary, mt: 1 }}>
            {info}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleIConfirmed} disabled={loading}
            sx={{ borderRadius: '14px', flex: 1, minWidth: 160 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Я подтвердил'
            }
          </Button>
          <Button variant="outlined" onClick={handleResend} disabled={loading}
            sx={{ borderRadius: '14px', flex: 1, minWidth: 160 }}>
            Отправить ещё раз
          </Button>
        </Box>

        <Button onClick={handleLogout} sx={{ color: t.onSurfaceVariant, mt: 1 }}>
          Выйти
        </Button>
      </Box>
    </Box>
  );
};