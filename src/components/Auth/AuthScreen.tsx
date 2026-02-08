import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Fade,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { AlternateEmail, Google } from '@mui/icons-material';

import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';

// Импортируем конфиг и функции
import { firebaseConfig } from '../../config/firebase';
import { 
  loginEmail, 
  registerEmail, 
  startGoogleSignInExternal 
} from '../../api/auth';

export const AuthScreen: React.FC = () => {
  const t = m3[useStore((s) => s.themeMode)];

  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginEmail(email, password);
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !displayName || !username) {
      setError('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerEmail(email, password, displayName, username);
      // После регистрации перезагружаем, чтобы применились все настройки
      window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Ошибка регистрации');
    }
    setLoading(false);
  };

  // ФУНКЦИЯ ВХОДА ЧЕРЕЗ GOOGLE (ВНЕШНИЙ БРАУЗЕР)
  const handleGoogle = () => {
    setError('');
    // Сохраняем конфиг в localStorage, чтобы страница auth-callback.html его увидела
    localStorage.setItem('og_config_temp', JSON.stringify(firebaseConfig)); 
    // Запускаем открытие браузера
    startGoogleSignInExternal();
  };

  const onKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter') fn();
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.surface,
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${t.primaryContainer}33 0%, transparent 70%)`,
        p: 2,
      }}
    >
      <Fade in timeout={500}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 440,
            p: 4,
            borderRadius: '28px',
            backgroundColor: t.surfaceContainerLow,
            border: `1px solid ${t.outlineVariant}44`,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            boxShadow: `0 8px 40px ${t.shadow}22`,
          }}
        >
          {/* Logo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {'\u2708\uFE0F'}
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: t.onSurface }}>
              OrionGram
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setError(''); }}
            sx={{ width: '100%', mb: 1 }}
          >
            <Tab label="Вход" sx={{ flex: 1 }} />
            <Tab label="Регистрация" sx={{ flex: 1 }} />
          </Tabs>

          {error && (
            <Typography variant="body2" color="error" sx={{ textAlign: 'center', backgroundColor: t.errorContainer, p: 1, borderRadius: '8px' }}>
              {error}
            </Typography>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {tab === 1 && (
                <>
                  <TextField fullWidth label="Имя" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  <TextField 
                    fullWidth 
                    label="Юзернейм" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ fontSize: 20 }} /></InputAdornment>,
                    }}
                  />
                </>
              )}

              <TextField fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <TextField 
                fullWidth 
                type="password" 
                label="Пароль" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                onKeyDown={(e) => onKey(e, tab === 0 ? handleLogin : handleRegister)}
              />

              <Button
                fullWidth
                variant="contained"
                disabled={loading}
                onClick={tab === 0 ? handleLogin : handleRegister}
                sx={{ borderRadius: '20px', py: 1.5, mt: 1, fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={24} /> : (tab === 0 ? 'Войти' : 'Создать аккаунт')}
              </Button>

              <Divider sx={{ my: 1 }}>ИЛИ</Divider>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogle}
                startIcon={<Google />}
                sx={{
                  borderRadius: '20px',
                  py: 1.2,
                  borderColor: t.outlineVariant,
                  color: t.onSurface,
                }}
              >
                Войти через Google
              </Button>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Fade>
    </Box>
  );
};