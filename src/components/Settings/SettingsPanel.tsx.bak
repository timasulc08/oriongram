import React, { useState } from 'react';
import {
  Box, Typography, Avatar, IconButton, Switch, Divider, List,
  ListItemButton, ListItemIcon, ListItemText, Drawer, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, CircularProgress,
  useMediaQuery,
} from '@mui/material';
import {
  Close, DarkMode, LightMode, Notifications, Lock, Palette,
  Language, Info, Logout, Person, Edit, AlternateEmail, Phone,
  PhotoCamera, Check, ArrowBack,
} from '@mui/icons-material';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { logout, updateMyProfile, getMyProfile } from '../../api/auth';
import { uploadAvatar } from '../../api/chats';

export const SettingsPanel: React.FC = () => {
  const themeMode = useStore(s => s.themeMode);
  const toggleTheme = useStore(s => s.toggleTheme);
  const settingsOpen = useStore(s => s.settingsOpen);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const myProfile = useStore(s => s.myProfile);
  const setMyProfile = useStore(s => s.setMyProfile);
  const t = m3[themeMode];
  const isMobile = useMediaQuery('(max-width: 768px)');
  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const setNotificationsEnabled = useStore(s => s.setNotificationsEnabled);
  const notificationsSound = useStore(s => s.notificationsSound);
  const setNotificationsSound = useStore(s => s.setNotificationsSound);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const openEdit = () => {
    setEditName(myProfile?.displayName || ''); setEditUsername(myProfile?.username || '');
    setEditBio(myProfile?.bio || ''); setEditPhone(myProfile?.phone || '');
    setEditError(''); setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setEditError('Имя обязательно'); return; }
    setEditLoading(true); setEditError('');
    try {
      await updateMyProfile({ displayName: editName.trim(), username: editUsername, bio: editBio, phone: editPhone });
      const profile = await getMyProfile(); if (profile) setMyProfile(profile); setEditOpen(false);
    } catch (e: any) { setEditError(e.message || 'Ошибка'); }
    setEditLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarLoading(true);
    try {
      const url = await uploadAvatar(file);
      await updateMyProfile({ avatarUrl: url });
      const p = await getMyProfile(); if (p) setMyProfile(p);
    } catch (err) { console.error(err); }
    setAvatarLoading(false);
  };

  const handleLogout = async () => { try { await logout(); } catch {} setSettingsOpen(false); };

  return (<>
    <Drawer anchor="left" open={settingsOpen} onClose={() => setSettingsOpen(false)}
      PaperProps={{ sx: { width: isMobile ? '100%' : 400, maxWidth: '100%', backgroundColor: t.surfaceContainerLow } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, backgroundColor: t.primaryContainer + '44', position: 'relative' }}>
          <IconButton onClick={() => setSettingsOpen(false)} sx={{ position: 'absolute', top: 8, right: 8, color: t.onSurface }}><Close /></IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src={myProfile?.avatarUrl} sx={{ width: 64, height: 64, backgroundColor: t.primary, color: t.onPrimary, fontSize: '1.5rem', fontWeight: 600 }}>
                {myProfile?.displayName?.[0] || '?'}
              </Avatar>
              <IconButton component="label" size="small"
                sx={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: t.primary, color: t.onPrimary, width: 24, height: 24 }}>
                {avatarLoading ? <CircularProgress size={14} color="inherit" /> : <PhotoCamera sx={{ fontSize: 14 }} />}
                <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
              </IconButton>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ color: t.onSurface }}>{myProfile?.displayName}</Typography>
              {myProfile?.username && <Typography variant="body2" sx={{ color: t.primary }}>@{myProfile.username}</Typography>}
              <Typography variant="caption" sx={{ color: t.onSurfaceVariant }}>{myProfile?.email}</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {themeMode === 'dark' ? <DarkMode sx={{ color: t.primary }} /> : <LightMode sx={{ color: t.primary }} />}
            <Typography sx={{ color: t.onSurface }}>Тёмная тема</Typography>
          </Box>
          <Switch checked={themeMode === 'dark'} onChange={toggleTheme} />
        </Box>
        <Divider sx={{ borderColor: t.outlineVariant + '44' }} />
        <List sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
          <ListItemButton onClick={openEdit} sx={{ borderRadius: '12px', mx: 1, my: 0.2 }}>
            <ListItemIcon sx={{ color: t.onSurfaceVariant, minWidth: 40 }}><Person /></ListItemIcon>
            <ListItemText primary="Редактировать профиль" secondary={myProfile?.username ? `@${myProfile.username}` : 'Установите юзернейм'}
              primaryTypographyProps={{ sx: { color: t.onSurface } }} secondaryTypographyProps={{ sx: { color: t.onSurfaceVariant } }} />
            <Edit sx={{ color: t.onSurfaceVariant, fontSize: 18 }} />
          </ListItemButton>
          {[
            { icon: <Notifications />, label: 'Уведомления' },
            { icon: <Lock />, label: 'Конфиденциальность' },
            { icon: <Palette />, label: 'Оформление' },
            { icon: <Language />, label: 'Язык', sub: 'Русский' },
            { icon: <Info />, label: 'О программе', sub: 'OrionGram v4.2' },
          ].map((s, i) => (
            <ListItemButton key={i} sx={{ borderRadius: '12px', mx: 1, my: 0.2 }}>
              <ListItemIcon sx={{ color: t.onSurfaceVariant, minWidth: 40 }}>{s.icon}</ListItemIcon>
              <ListItemText primary={s.label} secondary={(s as any).sub}
                primaryTypographyProps={{ sx: { color: t.onSurface } }}
                secondaryTypographyProps={{ sx: { color: t.onSurfaceVariant } }} />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ borderColor: t.outlineVariant + '44' }} />
        <ListItemButton onClick={handleLogout}
          sx={{ mx: 1, my: 0.5, borderRadius: '12px', '&:hover': { backgroundColor: t.errorContainer + '44' } }}>
          <ListItemIcon sx={{ color: t.error, minWidth: 40 }}><Logout /></ListItemIcon>
          <ListItemText primary="Выйти" primaryTypographyProps={{ sx: { color: t.error, fontWeight: 500 } }} />
        </ListItemButton>
        <Box sx={{ height: 'calc(8px + env(safe-area-inset-bottom))' }} />
      </Box>
    </Drawer>

    <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : '24px', backgroundColor: t.surfaceContainerLow } }}>
      <DialogTitle sx={{ color: t.onSurface, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        {isMobile && <IconButton onClick={() => setEditOpen(false)} sx={{ mr: 1, color: t.onSurfaceVariant }}><ArrowBack /></IconButton>}
        Редактировать профиль
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px!important' }}>
        {editError && <Typography variant="body2" sx={{ color: t.error, backgroundColor: t.errorContainer, px: 2, py: 0.5, borderRadius: '8px' }}>{editError}</Typography>}
        <TextField fullWidth label="Имя" value={editName} onChange={e => setEditName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
        <TextField fullWidth label="Юзернейм" value={editUsername}
          onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          InputProps={{ startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ color: t.onSurfaceVariant, fontSize: 20 }} /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
        <TextField fullWidth label="О себе" value={editBio} onChange={e => setEditBio(e.target.value)} multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
        <TextField fullWidth label="Телефон" value={editPhone} onChange={e => setEditPhone(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ color: t.onSurfaceVariant, fontSize: 20 }} /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!isMobile && <Button onClick={() => setEditOpen(false)} sx={{ borderRadius: '12px', color: t.onSurfaceVariant }}>Отмена</Button>}
        <Button onClick={handleSaveProfile} variant="contained" disabled={editLoading}
          startIcon={editLoading ? <CircularProgress size={18} color="inherit" /> : <Check />}
          sx={{ borderRadius: '12px', flex: isMobile ? 1 : undefined }}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  </>);
};
