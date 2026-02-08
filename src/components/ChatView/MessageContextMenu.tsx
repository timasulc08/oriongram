import React, { useState } from 'react';
import {
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, FormControlLabel, Checkbox, Typography, Box
} from '@mui/material';
import { Reply, Edit, ContentCopy, Delete, PushPin, Forward } from '@mui/icons-material';
import { useStore, Msg } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { deleteMessage } from '../../api/chats';

interface Props {
  anchorPosition:{top:number;left:number}|null;
  open:boolean;msg:Msg|null;onClose:()=>void;chatTitle:string;
}

export const MessageContextMenu: React.FC<Props> = ({anchorPosition,open,msg,onClose,chatTitle}) => {
  const t=m3[useStore(s=>s.themeMode)];
  const currentChatId=useStore(s=>s.currentChatId);
  const setReplyingTo=useStore(s=>s.setReplyingTo);
  const setEditingMsg=useStore(s=>s.setEditingMsg);
  const [deleteDialog,setDeleteDialog]=useState(false);
  const [deleteForAll,setDeleteForAll]=useState(false);

  if(!msg) return null;

  const handleReply=()=>{setReplyingTo(msg);onClose();};
  const handleEdit=()=>{if(msg.isOutgoing){setEditingMsg(msg);onClose();}};
  const handleCopy=()=>{navigator.clipboard.writeText(msg.text);onClose();};
  const handleDeleteClick=()=>{setDeleteDialog(true);onClose();};

  const handleDeleteConfirm=async()=>{
    if(currentChatId&&msg) await deleteMessage(currentChatId,msg.id,deleteForAll);
    setDeleteDialog(false);setDeleteForAll(false);
  };

  return (<>
    <Menu open={open} onClose={onClose} anchorReference="anchorPosition"
      anchorPosition={anchorPosition?{top:anchorPosition.top,left:anchorPosition.left}:undefined}
      PaperProps={{sx:{borderRadius:'14px',backgroundColor:t.surfaceContainer,minWidth:200,
        boxShadow:`0 8px 32px ${t.shadow}33`,border:`1px solid ${t.outlineVariant}33`}}}>
      <MenuItem onClick={handleReply} sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
        <ListItemIcon><Reply sx={{color:t.onSurfaceVariant}}/></ListItemIcon>
        <ListItemText primaryTypographyProps={{sx:{color:t.onSurface,fontSize:'0.9rem'}}}>Ответить</ListItemText>
      </MenuItem>
      {msg.isOutgoing&&(
        <MenuItem onClick={handleEdit} sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
          <ListItemIcon><Edit sx={{color:t.onSurfaceVariant}}/></ListItemIcon>
          <ListItemText primaryTypographyProps={{sx:{color:t.onSurface,fontSize:'0.9rem'}}}>Изменить</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={handleCopy} sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
        <ListItemIcon><ContentCopy sx={{color:t.onSurfaceVariant}}/></ListItemIcon>
        <ListItemText primaryTypographyProps={{sx:{color:t.onSurface,fontSize:'0.9rem'}}}>Копировать</ListItemText>
      </MenuItem>
      <MenuItem sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
        <ListItemIcon><PushPin sx={{color:t.onSurfaceVariant}}/></ListItemIcon>
        <ListItemText primaryTypographyProps={{sx:{color:t.onSurface,fontSize:'0.9rem'}}}>Закрепить</ListItemText>
      </MenuItem>
      <MenuItem sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
        <ListItemIcon><Forward sx={{color:t.onSurfaceVariant}}/></ListItemIcon>
        <ListItemText primaryTypographyProps={{sx:{color:t.onSurface,fontSize:'0.9rem'}}}>Переслать</ListItemText>
      </MenuItem>
      <Divider sx={{borderColor:t.outlineVariant+'44'}}/>
      <MenuItem onClick={handleDeleteClick} sx={{borderRadius:'8px',mx:0.5,my:0.2}}>
        <ListItemIcon><Delete sx={{color:t.error}}/></ListItemIcon>
        <ListItemText primaryTypographyProps={{sx:{color:t.error,fontSize:'0.9rem'}}}>Удалить</ListItemText>
      </MenuItem>
    </Menu>

    <Dialog open={deleteDialog} onClose={()=>{setDeleteDialog(false);setDeleteForAll(false);}}
      PaperProps={{sx:{borderRadius:'24px',backgroundColor:t.surfaceContainerLow,minWidth:340}}}>
      <DialogTitle sx={{color:t.onSurface,fontWeight:600}}>Удалить сообщение?</DialogTitle>
      <DialogContent>
        <Box sx={{mb:1}}>
          <Box sx={{p:1.5,borderRadius:'12px',backgroundColor:t.surfaceContainerHigh,mb:2}}>
            <Typography variant="body2" sx={{color:t.onSurfaceVariant,fontSize:'0.85rem'}} noWrap>
              {msg.text.slice(0,80)}{msg.text.length>80?'...':''}
              {!msg.text&&msg.mediaType==='photo'?'🖼 Фото':!msg.text&&msg.mediaType?'📎 Файл':''}
            </Typography>
          </Box>
          {msg.isOutgoing&&(
            <FormControlLabel
              control={<Checkbox checked={deleteForAll} onChange={e=>setDeleteForAll(e.target.checked)}
                sx={{color:t.outline,'&.Mui-checked':{color:t.error}}}/>}
              label={
                <Typography variant="body2" sx={{color:t.onSurface}}>
                  Удалить для <strong>{chatTitle}</strong>
                </Typography>
              }
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{px:3,pb:2}}>
        <Button onClick={()=>{setDeleteDialog(false);setDeleteForAll(false);}}
          sx={{borderRadius:'12px',color:t.onSurfaceVariant}}>Отмена</Button>
        <Button onClick={handleDeleteConfirm} variant="contained" color="error"
          sx={{borderRadius:'12px'}}>Удалить</Button>
      </DialogActions>
    </Dialog>
  </>);
};
