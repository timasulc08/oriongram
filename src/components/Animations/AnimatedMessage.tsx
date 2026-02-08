import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { DoneAll, Done, Edit } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { TypingText } from './TypingText';
import { TypingCode } from './TypingCode';
import { m3 } from '../../theme/material3';
import { useStore, Msg } from '../../stores/chatStore';

interface Props {
  msg: Msg;
  showSender?: boolean;
  senderColor?: string;
  onContextMenu: (e: React.MouseEvent, msg: Msg) => void;
}

interface TextPart { type: 'text' | 'code'; content: string; language?: string; }

function parseMessage(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const re = /```(\w*)?\n?([\s\S]*?)```/g;
  let last = 0, match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || '' });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  if (parts.length === 0 && text) parts.push({ type: 'text', content: text });
  return parts;
}

export const AnimatedMessage: React.FC<Props> = ({ msg, showSender, senderColor, onContextMenu }) => {
  const t = m3[useStore(s => s.themeMode)];
  const parts = useMemo(() => parseMessage(msg.text), [msg.text]);
  const shouldAnimate = !!msg.isNew;

  const bubbleVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.9,
      x: msg.isOutgoing ? 30 : -30,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        mass: 0.8,
      },
    },
  };

  return (
    <motion.div
      variants={bubbleVariants}
      initial={shouldAnimate ? 'hidden' : false}
      animate="visible"
      style={{
        display: 'flex',
        justifyContent: msg.isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: 3,
        paddingLeft: 8,
        paddingRight: 8,
      }}
      onContextMenu={(e) => onContextMenu(e, msg)}
    >
      <Box sx={{
        maxWidth: { xs: '88%', sm: '75%', md: '65%' },
        px: 1.5, py: 0.8,
        borderRadius: msg.isOutgoing ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        backgroundColor: msg.isOutgoing ? t.msgOut : t.msgIn,
        color: msg.isOutgoing ? t.msgOutText : t.msgInText,
        boxShadow: `0 1px 4px ${t.shadow}0D`,
        position: 'relative', overflow: 'hidden', cursor: 'context-menu',
        transition: 'box-shadow 200ms',
        '&:hover': { boxShadow: `0 2px 8px ${t.shadow}1A` },
      }}>
        {showSender && msg.senderName && (
          <Typography variant="caption" sx={{ color: senderColor || t.primary, fontWeight: 600, fontSize: '0.8rem', display: 'block', mb: 0.3 }}>
            {msg.senderName}
          </Typography>
        )}
        {msg.replyTo && (
          <Box sx={{
            borderLeft: `3px solid ${t.primary}`, pl: 1, mb: 0.5, py: 0.3,
            backgroundColor: msg.isOutgoing ? t.primary + '15' : t.surfaceContainerHighest,
            borderRadius: '0 8px 8px 0',
          }}>
            <Typography variant="caption" sx={{ color: t.primary, fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              {msg.replyTo.name}
            </Typography>
            <Typography variant="caption" sx={{ color: t.onSurfaceVariant, fontSize: '0.72rem' }} noWrap>
              {msg.replyTo.text.slice(0, 60)}
            </Typography>
          </Box>
        )}
        {msg.mediaUrl && msg.mediaType === 'photo' && (
          <motion.div
            initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Box component="img" src={msg.mediaUrl}
              onClick={() => useStore.getState().setImagePreview(msg.mediaUrl!)}
              sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: '8px', mb: 0.5, cursor: 'pointer', objectFit: 'cover' }} />
          </motion.div>
        )}
        {msg.mediaUrl && msg.mediaType === 'video' && (
          <Box component="video" src={msg.mediaUrl} controls sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: '8px', mb: 0.5 }} />
        )}
        {msg.mediaUrl && msg.mediaType === 'document' && (
          <Box component="a" href={msg.mediaUrl} target="_blank" rel="noopener"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, p: 1, borderRadius: '8px', textDecoration: 'none',
              backgroundColor: msg.isOutgoing ? t.primary + '22' : t.surfaceContainerHighest }}>
            <Box sx={{ fontSize: 28 }}>📎</Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'inherit' }}>{msg.fileName || 'файл'}</Typography>
              {msg.fileSize && <Typography variant="caption" sx={{ opacity: 0.7 }}>{msg.fileSize}</Typography>}
            </Box>
          </Box>
        )}
        {parts.map((part, i) => {
          if (part.type === 'code') return <TypingCode key={i} code={part.content} language={part.language} animate={shouldAnimate} speed={12} />;
          if (!part.content.trim()) return null;
          if (shouldAnimate) return <TypingText key={i} text={part.content} speed={25} animate variant="body2"
            cursorColor={msg.isOutgoing ? t.msgOutText : t.primary} sx={{ fontSize: '0.92rem', lineHeight: 1.45, color: 'inherit' }} />;
          return <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.92rem', lineHeight: 1.45 }}>{part.content}</Typography>;
        })}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.3, mt: 0.3, opacity: 0.5 }}>
          {msg.editedAt && <Edit sx={{ fontSize: 12, mr: 0.3 }} />}
          <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>{msg.time}</Typography>
          {msg.isOutgoing && (msg.isRead ? <DoneAll sx={{ fontSize: 15, color: t.primary, opacity: 1 }} /> : <Done sx={{ fontSize: 15 }} />)}
        </Box>
      </Box>
    </motion.div>
  );
};
