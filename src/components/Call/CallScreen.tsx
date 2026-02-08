import React, { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Avatar } from '@mui/material';
import { CallEnd, Mic, MicOff, Videocam, VideocamOff, VolumeUp } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { answerIncomingCall, endCall as apiEndCall, toggleMute, toggleVideo, getLocalStream } from '../../api/calls';

export const CallScreen: React.FC = () => {
  const t = m3[useStore(s => s.themeMode)];
  const callState = useStore(s => s.callState);
  const setCallState = useStore(s => s.setCallState);
  const resetCallState = useStore(s => s.resetCallState);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [connecting, setConnecting] = useState(false);

  // Таймер
  useEffect(() => {
    if (!callState.active || callState.incoming) { setDuration(0); return; }
    const iv = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [callState.active, callState.incoming]);

  // Привязка локального видео
  useEffect(() => {
    if (callState.active && !callState.incoming) {
      const ls = getLocalStream();
      if (ls && localVideoRef.current) {
        localVideoRef.current.srcObject = ls;
      }
    }
  }, [callState.active, callState.incoming]);

  const handleAnswer = async () => {
    if (!callState.peerId) return;
    setConnecting(true);
    try {
      await answerIncomingCall(callState.peerId, callState.type, (stream) => {
        if (callState.type === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
        const ls = getLocalStream();
        if (ls && localVideoRef.current) {
          localVideoRef.current.srcObject = ls;
        }
      });
      setCallState({ incoming: false, active: true });
    } catch (e) {
      console.error('[CallScreen] Answer error:', e);
    }
    setConnecting(false);
  };

  const handleEnd = () => {
    apiEndCall();
    resetCallState();
    setDuration(0);
  };

  const handleMute = () => {
    const muted = toggleMute();
    setCallState({ muted });
  };

  const handleVideo = () => {
    const off = toggleVideo();
    setCallState({ videoEnabled: !off });
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (!callState.active && !callState.incoming) return null;

  return (
    <Dialog open fullScreen PaperProps={{ sx: { background: 'linear-gradient(180deg, #0d0b1a 0%, #1a1533 50%, #0d0b1a 100%)' } }}>
      <audio ref={remoteAudioRef} autoPlay />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>

        {/* Фоновые кольца анимации */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              animate={{ scale: [1, 2.5], opacity: [0.15, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 150, height: 150, borderRadius: '50%',
                border: '2px solid ' + t.primary,
              }}
            />
          ))}
        </Box>

        {/* INCOMING CALL */}
        <AnimatePresence>
          {callState.incoming && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 1 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Typography variant="body1" sx={{ color: '#fff', opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  Входящий {callState.type === 'video' ? 'видео' : 'аудио'} звонок
                </Typography>
              </motion.div>

              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Avatar sx={{
                  width: 140, height: 140, fontSize: '3.5rem',
                  backgroundColor: t.primary + '33',
                  border: `3px solid ${t.primary}`,
                  color: '#fff',
                  boxShadow: `0 0 60px ${t.primary}44`,
                }}>
                  {callState.callerName?.[0]?.toUpperCase() || '?'}
                </Avatar>
              </motion.div>

              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mt: 1 }}>
                {callState.callerName}
              </Typography>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Typography variant="body2" sx={{ color: '#fff', opacity: 0.5 }}>
                  {connecting ? 'Подключение...' : 'Звонит вам...'}
                </Typography>
              </motion.div>

              <Box sx={{ display: 'flex', gap: 5, mt: 4 }}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton onClick={handleEnd} sx={{
                    backgroundColor: '#f44336', color: '#fff', width: 72, height: 72,
                    boxShadow: '0 4px 20px rgba(244,67,54,0.5)',
                    '&:hover': { backgroundColor: '#d32f2f' },
                  }}>
                    <CallEnd sx={{ fontSize: 32 }} />
                  </IconButton>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <IconButton onClick={handleAnswer} disabled={connecting} sx={{
                    backgroundColor: '#4CAF50', color: '#fff', width: 72, height: 72,
                    boxShadow: '0 4px 20px rgba(76,175,80,0.5)',
                    '&:hover': { backgroundColor: '#388E3C' },
                  }}>
                    <VolumeUp sx={{ fontSize: 32 }} />
                  </IconButton>
                </motion.div>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTIVE CALL */}
        <AnimatePresence>
          {callState.active && !callState.incoming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              {callState.type === 'video' ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                  <video ref={remoteVideoRef} autoPlay playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    style={{ position: 'absolute', bottom: 100, right: 16 }}
                  >
                    <Box sx={{ width: 140, height: 105, borderRadius: '16px', overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                      <video ref={localVideoRef} autoPlay playsInline muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    </Box>
                  </motion.div>
                  {/* Таймер поверх видео */}
                  <Box sx={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.4)', px: 2, py: 0.5, borderRadius: '12px' }}>
                    <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>{fmtDuration(duration)}</Typography>
                  </Box>
                </Box>
              ) : (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                >
                  <Avatar sx={{
                    width: 130, height: 130, fontSize: '3rem',
                    backgroundColor: t.primary + '33', border: `2px solid ${t.primary}66`,
                    color: '#fff', boxShadow: `0 0 40px ${t.primary}22`,
                  }}>
                    {callState.callerName?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600 }}>
                    {callState.callerName}
                  </Typography>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Typography variant="h6" sx={{ color: t.primary, fontWeight: 300 }}>
                      {fmtDuration(duration)}
                    </Typography>
                  </motion.div>
                </motion.div>
              )}

              {/* Controls */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)' }}
              >
                <Box sx={{
                  display: 'flex', gap: 2.5, p: 2, borderRadius: '28px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                }}>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton onClick={handleMute} sx={{
                      backgroundColor: callState.muted ? '#f44336' : 'rgba(255,255,255,0.12)',
                      color: '#fff', width: 56, height: 56,
                      transition: 'background-color 200ms',
                    }}>
                      {callState.muted ? <MicOff /> : <Mic />}
                    </IconButton>
                  </motion.div>

                  {callState.type === 'video' && (
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <IconButton onClick={handleVideo} sx={{
                        backgroundColor: !callState.videoEnabled ? '#f44336' : 'rgba(255,255,255,0.12)',
                        color: '#fff', width: 56, height: 56,
                      }}>
                        {callState.videoEnabled ? <Videocam /> : <VideocamOff />}
                      </IconButton>
                    </motion.div>
                  )}

                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton onClick={handleEnd} sx={{
                      backgroundColor: '#f44336', color: '#fff', width: 56, height: 56,
                      boxShadow: '0 4px 16px rgba(244,67,54,0.4)',
                      '&:hover': { backgroundColor: '#d32f2f' },
                    }}>
                      <CallEnd />
                    </IconButton>
                  </motion.div>
                </Box>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Dialog>
  );
};
