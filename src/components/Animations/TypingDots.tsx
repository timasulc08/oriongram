import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';

export const TypingDots: React.FC = () => {
  const t = m3[useStore(s => s.themeMode)];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1 }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: t.primary,
          }}
        />
      ))}
    </Box>
  );
};
