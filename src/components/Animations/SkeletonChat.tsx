import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';

export const SkeletonChat: React.FC = () => {
  const t = m3[useStore(s => s.themeMode)];

  return (
    <Box sx={{ px: 1.5, py: 0.5 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1.2, mx: 0.5 }}>
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              style={{
                width: 50, height: 50, borderRadius: '50%',
                backgroundColor: t.onSurface,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <motion.div
                animate={{ opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                style={{
                  height: 14, borderRadius: 7,
                  backgroundColor: t.onSurface,
                  width: `${60 + Math.random() * 30}%`,
                  marginBottom: 8,
                }}
              />
              <motion.div
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.1 }}
                style={{
                  height: 11, borderRadius: 5,
                  backgroundColor: t.onSurface,
                  width: `${40 + Math.random() * 40}%`,
                }}
              />
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};
