import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress, useMediaQuery } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatList } from '../ChatList/ChatList';
import { ChatView } from '../ChatView/ChatView';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { ChatInfoPanel } from '../ChatInfo/ChatInfoPanel';
import { CallScreen } from '../Call/CallScreen';
import { ImagePreview } from '../Common/ImagePreview';
import { SkeletonChat } from '../Animations/SkeletonChat';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { subscribeChats } from '../../api/chats';
import { initPeer, listenForCalls } from '../../api/calls';
import { isDesktopApp } from '../../utils/platform';

export const MainLayout: React.FC = () => {
  const currentChatId = useStore(s => s.currentChatId);
  const themeMode = useStore(s => s.themeMode);
  const t = m3[themeMode];
  const setChats = useStore(s => s.setChats);
  const setCurrentChat = useStore(s => s.setCurrentChat);
  const loading = useStore(s => s.loading);
  const setLoading = useStore(s => s.setLoading);
  const setCallState = useStore(s => s.setCallState);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeChats(chats => { setChats(chats); setLoading(false); });

    // Инициализация PeerJS
    initPeer()
      .then(peerId => console.log('[App] PeerJS ready:', peerId))
      .catch(e => console.warn('[App] PeerJS init failed:', e));

    // Слушаем входящие звонки через Firestore
    const unsubCalls = listenForCalls((data) => {
      console.log('[App] Incoming call from:', data.callerName, 'peerId:', data.callerPeerId);
      setCallState({
        incoming: true,
        active: false,
        callerName: data.callerName,
        type: data.type,
        peerId: data.callerPeerId,
      });
    });

    return () => { unsub(); unsubCalls(); };
  }, []);

  // Кнопка "Назад" на Android
  useEffect(() => {
    const handleBack = () => { if (currentChatId) setCurrentChat(null); };
    window.addEventListener('hardwareBackPress', handleBack);
    return () => window.removeEventListener('hardwareBackPress', handleBack);
  }, [currentChatId]);

  return (
    <Box sx={{
      display: 'flex', height: '100dvh',
      backgroundColor: t.surface, overflow: 'hidden',
      pt: isDesktopApp() ? '36px' : 0,
    }}>
      <SettingsPanel />
      <ChatInfoPanel />
      <CallScreen />
      <ImagePreview />

      {isMobile ? (
        <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {!currentChatId ? (
              <motion.div
                key="chatlist"
                initial={{ x: '-100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              >
                <Box sx={{ width: '100%', height: '100%', backgroundColor: t.surfaceContainerLow }}>
                  {loading ? <SkeletonChat /> : <ChatList />}
                </Box>
              </motion.div>
            ) : (
              <motion.div
                key="chatview"
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              >
                <ChatView />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      ) : (
        <>
          <Box sx={{
            width: { sm: 320, md: 360, lg: 400 },
            display: 'flex', flexDirection: 'column',
            backgroundColor: t.surfaceContainerLow,
            borderRight: `1px solid ${t.outlineVariant}22`,
            height: '100%',
          }}>
            {loading ? <SkeletonChat /> : <ChatList />}
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <AnimatePresence mode="wait">
              {currentChatId ? (
                <motion.div
                  key={currentChatId}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <ChatView />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Box sx={{
                      width: 120, height: 120, borderRadius: '32px',
                      background: `linear-gradient(135deg, ${t.primaryContainer}, ${t.secondaryContainer})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50,
                    }}>{'\u{1F4AC}'}</Box>
                  </motion.div>
                  <Typography variant="h5" sx={{ color: t.onSurface, fontWeight: 600 }}>OrionGram</Typography>
                  <Typography variant="body2" sx={{ color: t.onSurfaceVariant }}>Выберите чат или создайте новый</Typography>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </>
      )}
    </Box>
  );
};
