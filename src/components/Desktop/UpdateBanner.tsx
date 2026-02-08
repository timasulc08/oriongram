import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';

export const UpdateBanner: React.FC = () => {
  const themeMode = useStore(s => s.themeMode);
  const t = m3[themeMode];
  const b = useStore(s => s.updateBanner);
  const hide = useStore(s => s.hideUpdateBanner);

  return (
    <AnimatePresence>
      {b.open && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }}
        >
          <Box sx={{
            width: '100%',
            height: 46,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            backgroundColor: t.surfaceContainerHigh,
            borderBottom: `1px solid ${t.outlineVariant}44`,
            backdropFilter: 'blur(10px)',
          }}>
            <Typography sx={{ color: t.onSurface, fontWeight: 600 }}>
              Доступно обновление {b.latestVersion}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  (window as any).electronAPI?.openExternal?.(b.url);
                }}
                sx={{ borderRadius: '12px' }}
              >
                Скачать
              </Button>
              <Button size="small" onClick={hide} sx={{ borderRadius: '12px', color: t.onSurfaceVariant }}>
                Скрыть
              </Button>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
