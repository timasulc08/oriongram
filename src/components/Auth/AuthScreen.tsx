import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Fade, Tabs, Tab, InputAdornment } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { AlternateEmail } from '@mui/icons-material';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { loginEmail, registerEmail } from '../../api/auth';

export const AuthScreen: React.FC = () => {
  const t = m3[useStore(s => s.themeMode)];
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Заполните все поля'); return; }
    setLoading(true); setError('');
    try { await loginEmail(email, password); } catch (e: any) { setError(e.message || 'Ошибка'); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !displayName || !username) { setError('Заполните все поля'); return; }
    if (password.length < 6) { setError('Пароль мин. 6 символов'); return; }
    setLoading(true); setError('');
    try { await registerEmail(email, password, displayName, username); } catch (e: any) { setError(e.message || 'Ошибка'); }
    setLoading(false);
  };

  const onKey = (e: React.KeyboardEvent, fn: () => void) => { if (e.key === 'Enter') fn(); };

  return (
    <Box sx={{
      height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.surface, p: { xs: 2, sm: 3 },
      backgroundImage: `radial-gradient(ellipse at 50% 0%, ${t.primaryContainer}33 0%, transparent 70%)`
    }}>
      <Fade in timeout={500}>
        <Box sx={{
          width: '100%', maxWidth: 420, p: { xs: 2.5, sm: 4 },
          borderRadius: { xs: '24px', sm: '28px' }, backgroundColor: t.surfaceContainerLow,
          border: `1px solid ${t.outlineVariant}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          boxShadow: `0 8px 40px ${t.shadow}22`
        }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <Box sx={{
              width: { xs: 70, sm: 80 }, height: { xs: 70, sm: 80 }, borderRadius: '22px',
              background: `linear-gradient(135deg, ${t.primary}, ${t.tertiary})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: { xs: 32, sm: 36 },
            }}>{'\u2708\uFE0F'}</Box>
          </motion.div>
          <Typography variant="h5" fontWeight={700} sx={{ color: t.onSurface, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
            OrionGram
          </Typography>

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }}
            sx={{ width: '100%', mb: 1,
              '& .MuiTab-root': { borderRadius: '12px', textTransform: 'none', fontWeight: 500, color: t.onSurfaceVariant, fontSize: { xs: '0.85rem', sm: '0.9rem' } },
              '& .Mui-selected': { color: t.primary }, '& .MuiTabs-indicator': { borderRadius: '4px', height: 3 }
            }}>
            <Tab label="Вход" sx={{ flex: 1 }} /><Tab label="Регистрация" sx={{ flex: 1 }} />
          </Tabs>

          {error && <Typography variant="body2" sx={{ color: t.error, backgroundColor: t.errorContainer, px: 2, py: 0.7, borderRadius: '12px', textAlign: 'center', width: '100%', fontSize: '0.85rem' }}>{error}</Typography>}

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: tab === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 0 ? 20 : -20 }} transition={{ duration: 0.2 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 1 && <>
                <TextField fullWidth label="Имя" value={displayName} onChange={e => setDisplayName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
                <TextField fullWidth label="Юзернейм" value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ color: t.onSurfaceVariant, fontSize: 20 }} /></InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
              </>}
              <TextField fullWidth label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
              <TextField fullWidth label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => onKey(e, tab === 0 ? handleLogin : handleRegister)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
              <Button fullWidth variant="contained" disabled={loading} onClick={tab === 0 ? handleLogin : handleRegister}
                sx={{
                  borderRadius: '20px', py: 1.5, mt: 0.5,
                  background: `linear-gradient(135deg, ${t.primary}, ${t.tertiary})`,
                  fontSize: '1rem', fontWeight: 600
                }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : (tab === 0 ? 'Войти' : 'Создать аккаунт')}
              </Button>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Fade>
    </Box>
  );
};
