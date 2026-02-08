import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Avatar, Typography, CircularProgress, useMediaQuery } from '@mui/material';
import {
  ArrowBack, MoreVert, Send, Mood, AttachFile, Mic, Search, Phone,
  Videocam, Close, Edit, Reply as ReplyIcon, Bookmark,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useStore, Msg } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import {
  sendMessage as fbSend, subscribeMessages, editMessage,
  sendFileMessage, getUserById, markMessagesAsRead,
} from '../../api/chats';
import { subscribeUserOnline } from '../../api/auth';
import { startOutgoingCall, sendCallSignal, getPeerId, initPeer } from '../../api/calls';
import { AnimatedMessage } from '../Animations/AnimatedMessage';
import { MessageContextMenu } from './MessageContextMenu';
import { SmoothInput } from '../Common/SmoothInput';

const avatarColors = ['#E57373','#F06292','#BA68C8','#9575CD','#7986CB','#64B5F6','#4FC3F7','#4DD0E1','#4DB6AC','#81C784','#AED581','#FFD54F'];
const senderColorPool = ['#E57373','#81C784','#64B5F6','#FFB74D','#BA68C8','#4DD0E1','#AED581','#FF8A65'];
const senderColorMap: Record<string, string> = {};
function getSenderColor(id: string) {
  if (!senderColorMap[id]) senderColorMap[id] = senderColorPool[Object.keys(senderColorMap).length % senderColorPool.length];
  return senderColorMap[id];
}

function formatLastSeen(ts: number): string {
  if (!ts) return 'был(а) давно';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'был(а) только что';
  if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин. назад`;
  if (diff < 86400000) return `был(а) ${Math.floor(diff / 3600000)} ч. назад`;
  return 'был(а) ' + new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export const ChatView: React.FC = () => {
  const themeMode = useStore(s => s.themeMode);
  const t = m3[themeMode];
  const isMobile = useMediaQuery('(max-width: 768px)');
  const currentChatId = useStore(s => s.currentChatId);
  const chats = useStore(s => s.chats);
  const messages = useStore(s => s.messages);
  const setMessages = useStore(s => s.setMessages);
  const setCurrentChat = useStore(s => s.setCurrentChat);
  const setChatInfoOpen = useStore(s => s.setChatInfoOpen);
  const myProfile = useStore(s => s.myProfile);
  const replyingTo = useStore(s => s.replyingTo);
  const setReplyingTo = useStore(s => s.setReplyingTo);
  const editingMsg = useStore(s => s.editingMsg);
  const setEditingMsg = useStore(s => s.setEditingMsg);
  const contextMenu = useStore(s => s.contextMenu);
  const setContextMenu = useStore(s => s.setContextMenu);
  const setCallState = useStore(s => s.setCallState);

  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chat = chats.find(c => c.id === currentChatId);
  const msgs = currentChatId ? messages.get(currentChatId) || [] : [];

  // Подписка на сообщения
  useEffect(() => {
    if (!currentChatId) return;
    const unsub = subscribeMessages(currentChatId, (m) => { setMessages(currentChatId, m); });
    return unsub;
  }, [currentChatId]);

  // Помечаем как прочитанные при открытии чата
  useEffect(() => {
    if (currentChatId) {
      markMessagesAsRead(currentChatId);
    }
  }, [currentChatId, msgs.length]);

  // Помечаем при фокусе
  useEffect(() => {
    const handleFocus = () => {
      if (currentChatId) markMessagesAsRead(currentChatId);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentChatId]);

  // Подписка на онлайн-статус собеседника
  useEffect(() => {
    if (!chat || chat.isGroup || chat.isSavedMessages) {
      setPeerOnline(false);
      return;
    }
    const otherId = chat.members.find(m => m !== myProfile?.id);
    if (!otherId) return;
    const unsub = subscribeUserOnline(otherId, (online, lastSeen) => {
      setPeerOnline(online);
      setPeerLastSeen(lastSeen);
    });
    return unsub;
  }, [chat, myProfile]);

  useEffect(() => {
    setTimeout(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }, [msgs.length]);

  useEffect(() => {
    if (editingMsg) setInput(editingMsg.text);
    else if (!replyingTo) setInput('');
  }, [editingMsg]);

  const handleSend = async () => {
    if (!input.trim() || !chat || !currentChatId) return;
    const text = input.trim(); setInput('');
    if (editingMsg) {
      try { await editMessage(currentChatId, editingMsg.id, text); } catch (e) { console.error(e); }
      setEditingMsg(null); return;
    }
    const reply = replyingTo ? { id: replyingTo.id, name: replyingTo.senderName || '', text: replyingTo.text } : undefined;
    setReplyingTo(null);
    try { await fbSend(currentChatId, text, myProfile?.displayName || 'User', reply); } catch (e) { console.error(e); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat || !currentChatId) return;
    setUploading(true);
    try { await sendFileMessage(currentChatId, file, myProfile?.displayName || 'User'); } catch (err) { console.error(err); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { setReplyingTo(null); setEditingMsg(null); setInput(''); }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Msg) => {
    e.preventDefault();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY, msg });
  };

  const handleCall = async (type: 'audio' | 'video') => {
    if (!chat || chat.isGroup || chat.isSavedMessages) return;
    const otherId = chat.members.find(m => m !== myProfile?.id);
    if (!otherId) return;
    try {
      const myPeerId = getPeerId() || await initPeer();
      const otherUser = await getUserById(otherId) as any;
      if (!otherUser?.peerId) return;
      await sendCallSignal(otherId, myProfile?.displayName || 'User', type, myPeerId);
      setCallState({ active: true, incoming: false, callerName: chat.title, type, chatId: currentChatId, videoEnabled: type === 'video', peerId: otherUser.peerId });
      await startOutgoingCall(otherUser.peerId, type, myProfile?.displayName || 'User', () => {});
    } catch (e) { console.error('Call error:', e); setCallState({ active: false, incoming: false }); }
  };

  if (!chat) return null;
  const isSaved = !!chat.isSavedMessages;
  const sidePadding = isMobile ? { xs: 0.5 } : { xs: 1, md: 3, lg: 6 };
  const inputPadding = isMobile ? { xs: 0.5 } : { xs: 1, md: 4, lg: 8 };

  // Статус
  let statusText = '';
  let statusColor = t.onSurfaceVariant;
  if (isSaved) {
    statusText = 'сохранённые';
  } else if (chat.isGroup) {
    statusText = `${chat.members.length} участников`;
  } else if (peerOnline) {
    statusText = 'в сети';
    statusColor = '#4CAF50';
  } else {
    statusText = formatLastSeen(peerLastSeen);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: t.surface }}>
      {/* Header */}
      <Box onClick={() => !isMobile && setChatInfoOpen(true)} sx={{
        display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 },
        px: { xs: 0.5, md: 2 }, py: 1,
        backgroundColor: t.surfaceContainerLow,
        borderBottom: `1px solid ${t.outlineVariant}22`,
        minHeight: { xs: 52, md: 60 },
        cursor: isMobile ? 'default' : 'pointer',
      }}>
        <IconButton onClick={e => { e.stopPropagation(); setCurrentChat(null); }} sx={{ color: t.onSurfaceVariant }}>
          <ArrowBack />
        </IconButton>
        <Box onClick={() => isMobile && setChatInfoOpen(true)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, cursor: 'pointer', minWidth: 0 }}>
          {isSaved ? (
            <Avatar sx={{ width: { xs: 38, md: 42 }, height: { xs: 38, md: 42 }, backgroundColor: t.primary, color: t.onPrimary }}>
              <Bookmark sx={{ fontSize: 20 }} />
            </Avatar>
          ) : (
            <Avatar src={chat.avatarUrl} sx={{
              width: { xs: 38, md: 42 }, height: { xs: 38, md: 42 },
              backgroundColor: avatarColors[Math.abs(chat.id.charCodeAt(0)) % avatarColors.length],
              color: '#fff', fontWeight: 600
            }}>{chat.avatar}</Avatar>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, color: t.onSurface, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              {chat.title}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: statusColor, display: 'block', fontSize: '0.75rem' }}>
              {statusText}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          {!isSaved && !chat.isGroup && (
            <IconButton onClick={e => { e.stopPropagation(); handleCall('audio'); }} sx={{ color: t.onSurfaceVariant }}><Phone /></IconButton>
          )}
          {!isSaved && !chat.isGroup && !isMobile && (
            <IconButton onClick={e => { e.stopPropagation(); handleCall('video'); }} sx={{ color: t.onSurfaceVariant }}><Videocam /></IconButton>
          )}
          <IconButton sx={{ color: t.onSurfaceVariant }}><MoreVert /></IconButton>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', px: sidePadding, py: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }} />
        {msgs.map((msg, i) => {
          const shouldShowSender = !!(chat.isGroup && !msg.isOutgoing && msg.senderName &&
            (i === 0 || msgs[i - 1]?.isOutgoing || msgs[i - 1]?.senderId !== msg.senderId));
          return (
            <AnimatedMessage key={msg.id} msg={msg} showSender={shouldShowSender}
              senderColor={msg.senderId ? getSenderColor(msg.senderId) : undefined}
              onContextMenu={handleContextMenu} />
          );
        })}
        <div ref={endRef} />
      </Box>

      {/* Reply/Edit */}
      {(replyingTo || editingMsg) && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: inputPadding, py: 0.5,
            backgroundColor: t.surfaceContainerHigh, borderTop: `1px solid ${t.outlineVariant}22` }}>
            {editingMsg ? <Edit sx={{ color: t.primary, fontSize: 20 }} /> : <ReplyIcon sx={{ color: t.primary, fontSize: 20 }} />}
            <Box sx={{ flex: 1, borderLeft: `3px solid ${t.primary}`, pl: 1, py: 0.2, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: t.primary, fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
                {editingMsg ? 'Редактирование' : (replyingTo?.senderName || 'Сообщение')}
              </Typography>
              <Typography variant="caption" sx={{ color: t.onSurfaceVariant, fontSize: '0.72rem' }} noWrap>
                {(editingMsg?.text || replyingTo?.text || '').slice(0, 60)}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => { setReplyingTo(null); setEditingMsg(null); setInput(''); }}
              sx={{ color: t.onSurfaceVariant }}><Close sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        </motion.div>
      )}

      {/* Input */}
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', gap: 0.5,
        px: inputPadding, py: { xs: 0.5, md: 1 },
        backgroundColor: t.surfaceContainerLow, borderTop: `1px solid ${t.outlineVariant}11`,
        pb: { xs: 'calc(0.5rem + env(safe-area-inset-bottom))', md: 1 },
      }}>
        {!isMobile && <IconButton sx={{ color: t.onSurfaceVariant, mb: 0.3 }}><Mood /></IconButton>}
        <Box sx={{ flex: 1, minWidth: 0, position: 'relative', backgroundColor: t.surfaceContainerHigh,
          borderRadius: '22px', display: 'flex', alignItems: 'flex-end' }}>
          {isMobile && <IconButton size="small" sx={{ color: t.onSurfaceVariant, ml: 0.5, mb: 0.8 }}><Mood /></IconButton>}
          <SmoothInput value={input} onChange={setInput} onKeyDown={handleKeyDown}
            placeholder={isSaved ? 'Сохранить...' : 'Сообщение...'} maxRows={isMobile ? 4 : 6} />
          <Box sx={{ pr: 0.5, pb: 0.8 }}>
            {uploading ? <CircularProgress size={20} sx={{ color: t.primary, m: 0.5 }} /> : (
              <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: t.onSurfaceVariant }}>
                <AttachFile sx={{ fontSize: 20, transform: 'rotate(45deg)' }} />
              </IconButton>
            )}
          </Box>
        </Box>
        <input ref={fileInputRef} type="file" hidden onChange={handleFile} accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar,.txt" />
        <motion.div whileTap={{ scale: 0.85 }}>
          <IconButton onClick={handleSend} sx={{
            backgroundColor: input.trim() ? t.primary : 'transparent',
            color: input.trim() ? t.onPrimary : t.onSurfaceVariant,
            width: { xs: 44, md: 48 }, height: { xs: 44, md: 48 }, mb: 0.3,
            transition: 'all 200ms cubic-bezier(.34,1.56,.64,1)',
          }}>
            {input.trim() ? <Send /> : <Mic />}
          </IconButton>
        </motion.div>
      </Box>

      <MessageContextMenu
        anchorPosition={contextMenu.open ? { top: contextMenu.y, left: contextMenu.x } : null}
        open={contextMenu.open} msg={contextMenu.msg}
        onClose={() => setContextMenu({ open: false, x: 0, y: 0, msg: null })}
        chatTitle={chat.title} />
    </Box>
  );
};
