import React, { useState } from 'react';
import {
  Box, TextField, InputAdornment, Avatar, Typography, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Fab,
} from '@mui/material';
import { Search, Menu as MenuIcon, DarkMode, LightMode, Settings, Close, Add, Bookmark } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { NewChatDialog } from './NewChatDialog';

const avatarColors = ['#E57373','#F06292','#BA68C8','#9575CD','#7986CB','#64B5F6','#4FC3F7','#4DD0E1','#4DB6AC','#81C784','#AED581','#FFD54F','#FFB74D','#FF8A65'];

const listItemVariants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, x: 0, scale: 1,
    transition: { delay: i * 0.03, type: 'spring', stiffness: 300, damping: 24 },
  }),
};

export const ChatList: React.FC = () => {
  const themeMode = useStore(s => s.themeMode);
  const t = m3[themeMode];
  const chats = useStore(s => s.chats);
  const currentChatId = useStore(s => s.currentChatId);
  const setCurrentChat = useStore(s => s.setCurrentChat);
  const toggleTheme = useStore(s => s.toggleTheme);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const myProfile = useStore(s => s.myProfile);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const filtered = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.8, minHeight: 56 }}>
        <IconButton onClick={e => setMenuAnchor(e.currentTarget)} sx={{ color: t.onSurfaceVariant }}><MenuIcon /></IconButton>
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div key="search" initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1 }}>
              <TextField size="small" fullWidth placeholder="Поиск..." autoFocus value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', height: 40, backgroundColor: t.surfaceContainerHighest, '& fieldset': { border: 'none' } } }}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchOpen(false); setSearch(''); }}>
                  <Close sx={{ fontSize: 18 }} /></IconButton></InputAdornment> }} />
            </motion.div>
          ) : (
            <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: t.onSurface, fontSize: '1.1rem' }}>OrionGram</Typography>
              <IconButton onClick={() => setSearchOpen(true)} sx={{ color: t.onSurfaceVariant }}><Search /></IconButton>
            </motion.div>
          )}
        </AnimatePresence>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { borderRadius: '16px', backgroundColor: t.surfaceContainer, minWidth: 220 } }}>
          {myProfile && (
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar src={myProfile.avatarUrl} sx={{ width: 40, height: 40, backgroundColor: t.primary, color: t.onPrimary }}>
                {myProfile.displayName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ color: t.onSurface }}>{myProfile.displayName}</Typography>
                {myProfile.username && <Typography variant="caption" sx={{ color: t.primary }}>@{myProfile.username}</Typography>}
              </Box>
            </Box>
          )}
          <Divider sx={{ borderColor: t.outlineVariant }} />
          <MenuItem onClick={() => { toggleTheme(); setMenuAnchor(null); }}>
            <ListItemIcon>{themeMode === 'dark' ? <LightMode sx={{ color: t.onSurfaceVariant }} /> : <DarkMode sx={{ color: t.onSurfaceVariant }} />}</ListItemIcon>
            <ListItemText>{themeMode === 'dark' ? 'Светлая' : 'Тёмная'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { const s = chats.find(c => c.isSavedMessages); if (s) setCurrentChat(s.id); setMenuAnchor(null); }}>
            <ListItemIcon><Bookmark sx={{ color: t.onSurfaceVariant }} /></ListItemIcon>
            <ListItemText>Избранное</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setSettingsOpen(true); setMenuAnchor(null); }}>
            <ListItemIcon><Settings sx={{ color: t.onSurfaceVariant }} /></ListItemIcon>
            <ListItemText>Настройки</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {filtered.map((chat, idx) => (
          <motion.div key={chat.id} custom={idx} variants={listItemVariants}
            initial="hidden" animate="visible" layout>
            <motion.div whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}>
              <Box onClick={() => setCurrentChat(chat.id)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 1.5, py: { xs: 1, md: 0.9 }, mx: 0.75,
                borderRadius: '14px', cursor: 'pointer',
                backgroundColor: currentChatId === chat.id ? t.primaryContainer + '66' : 'transparent',
                transition: 'background-color 150ms',
                '&:hover': { backgroundColor: currentChatId === chat.id ? t.primaryContainer + '66' : t.surfaceContainerHigh + '88' },
              }}>
                {chat.isSavedMessages ? (
                  <Avatar sx={{ width: { xs: 52, md: 50 }, height: { xs: 52, md: 50 }, backgroundColor: t.primary, color: t.onPrimary }}>
                    <Bookmark sx={{ fontSize: 24 }} />
                  </Avatar>
                ) : (
                  <Avatar src={chat.avatarUrl} sx={{
                    width: { xs: 52, md: 50 }, height: { xs: 52, md: 50 },
                    backgroundColor: avatarColors[Math.abs(chat.id.charCodeAt(0)) % avatarColors.length],
                    color: '#fff', fontWeight: 600, fontSize: '1.15rem'
                  }}>{chat.avatar}</Avatar>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" noWrap sx={{
                      fontWeight: chat.unread > 0 ? 600 : 400, fontSize: '0.935rem',
                      color: currentChatId === chat.id ? t.onPrimaryContainer : t.onSurface
                    }}>{chat.title}</Typography>
                    <Typography variant="caption" sx={{ color: t.onSurfaceVariant, fontSize: '0.75rem', ml: 1, flexShrink: 0 }}>{chat.time}</Typography>
                  </Box>
                  <Typography variant="body2" noWrap sx={{ color: t.onSurfaceVariant, fontSize: '0.84rem', mt: 0.15 }}>
                    {chat.lastMessage || 'Нет сообщений'}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
              <Typography sx={{ fontSize: '2.5rem' }}>{'\u{1F50D}'}</Typography>
              <Typography sx={{ color: t.onSurfaceVariant }}>Чатов пока нет</Typography>
            </Box>
          </motion.div>
        )}
      </Box>

      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        style={{ position: 'absolute', bottom: 20, right: 20 }}
      >
        <Fab color="primary" onClick={() => setNewChatOpen(true)}
          component={motion.button}
          whileHover={{ scale: 1.08, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          sx={{
            background: `linear-gradient(135deg, ${t.primary}, ${t.tertiary})`,
            boxShadow: `0 4px 20px ${t.primary}55`,
          }}>
          <Add />
        </Fab>
      </motion.div>
      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </Box>
  );
};
