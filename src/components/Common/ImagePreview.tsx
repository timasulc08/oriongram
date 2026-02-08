import React from 'react';
import { Dialog, Box, IconButton } from '@mui/material';
import { Close, Download } from '@mui/icons-material';
import { useStore } from '../../stores/chatStore';

export const ImagePreview: React.FC = () => {
  const imagePreview=useStore(s=>s.imagePreview);
  const setImagePreview=useStore(s=>s.setImagePreview);
  if(!imagePreview) return null;

  const handleDownload=()=>{
    const a=document.createElement('a');a.href=imagePreview;a.download='image';a.click();
  };

  return (
    <Dialog open fullScreen onClose={()=>setImagePreview(null)}
      PaperProps={{sx:{backgroundColor:'rgba(0,0,0,0.92)'}}}>
      <Box sx={{position:'absolute',top:16,right:16,display:'flex',gap:1,zIndex:10}}>
        <IconButton onClick={handleDownload}
          sx={{color:'#fff',backgroundColor:'rgba(255,255,255,0.1)','&:hover':{backgroundColor:'rgba(255,255,255,0.2)'}}}>
          <Download/>
        </IconButton>
        <IconButton onClick={()=>setImagePreview(null)}
          sx={{color:'#fff',backgroundColor:'rgba(255,255,255,0.1)','&:hover':{backgroundColor:'rgba(255,255,255,0.2)'}}}>
          <Close/>
        </IconButton>
      </Box>
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',p:2}}
        onClick={()=>setImagePreview(null)}>
        <Box component="img" src={imagePreview}
          sx={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:'8px'}}/>
      </Box>
    </Dialog>
  );
};
