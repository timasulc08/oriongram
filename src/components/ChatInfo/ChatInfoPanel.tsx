import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, IconButton, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Close, Notifications, Image, InsertDriveFile, Link as LinkIcon, Group, VolumeOff, AlternateEmail } from '@mui/icons-material';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { getUserById } from '../../api/chats';

const avatarColors = ['#E57373','#F06292','#BA68C8','#9575CD','#7986CB','#64B5F6','#4FC3F7','#4DD0E1','#4DB6AC','#81C784','#AED581','#FFD54F'];

export const ChatInfoPanel: React.FC = () => {
  const t=m3[useStore(s=>s.themeMode)];
  const chatInfoOpen=useStore(s=>s.chatInfoOpen);
  const setChatInfoOpen=useStore(s=>s.setChatInfoOpen);
  const currentChatId=useStore(s=>s.currentChatId);
  const chats=useStore(s=>s.chats);
  const myProfile=useStore(s=>s.myProfile);
  const chat=chats.find(c=>c.id===currentChatId);
  const [otherUser,setOtherUser]=useState<any>(null);

  useEffect(()=>{
    if(!chat||chat.isGroup||chat.isSavedMessages){setOtherUser(null);return;}
    const otherId=chat.members.find(m=>m!==myProfile?.id);
    if(otherId) getUserById(otherId).then(u=>setOtherUser(u)).catch(()=>{});
  },[chat,myProfile]);

  if(!chat) return null;

  return (
    <Drawer anchor="right" open={chatInfoOpen} onClose={()=>setChatInfoOpen(false)}
      PaperProps={{sx:{width:380,backgroundColor:t.surfaceContainerLow}}}>
      <Box sx={{display:'flex',flexDirection:'column',height:'100%'}}>
        <Box sx={{display:'flex',alignItems:'center',px:1,py:1,borderBottom:`1px solid ${t.outlineVariant}22`}}>
          <IconButton onClick={()=>setChatInfoOpen(false)} sx={{color:t.onSurfaceVariant}}><Close/></IconButton>
          <Typography variant="h6" sx={{ml:1,fontWeight:600,color:t.onSurface,fontSize:'1.1rem'}}>Информация</Typography>
        </Box>
        <Box sx={{display:'flex',flexDirection:'column',alignItems:'center',py:3,gap:1}}>
          <Avatar src={chat.avatarUrl} sx={{width:100,height:100,
            backgroundColor:chat.isSavedMessages?t.primary:avatarColors[Math.abs(chat.id.charCodeAt(0))%avatarColors.length],
            color:'#fff',fontSize:'2.5rem',fontWeight:600}}>
            {chat.isSavedMessages?'⭐':chat.avatar}
          </Avatar>
          <Typography variant="h6" fontWeight={600} sx={{color:t.onSurface}}>{chat.title}</Typography>
          {otherUser?.username&&(
            <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
              <AlternateEmail sx={{fontSize:16,color:t.primary}}/>
              <Typography variant="body2" sx={{color:t.primary}}>{otherUser.username}</Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{color:t.onSurfaceVariant}}>
            {chat.isSavedMessages?'Ваши сохранённые сообщения':chat.isGroup?`${chat.members.length} участников`:'Личный чат'}
          </Typography>
          {otherUser?.bio&&<Typography variant="body2" sx={{color:t.onSurfaceVariant,textAlign:'center',px:3}}>{otherUser.bio}</Typography>}
        </Box>
        <Divider sx={{borderColor:t.outlineVariant+'44'}}/>
        <List sx={{py:0.5}}>
          {[
            {icon:<Image/>,label:'Медиа'},
            {icon:<InsertDriveFile/>,label:'Файлы'},
            {icon:<LinkIcon/>,label:'Ссылки'},
            ...(chat.isGroup?[{icon:<Group/>,label:'Участники'}]:[]),
            {icon:<Notifications/>,label:'Уведомления'},
            {icon:<VolumeOff/>,label:'Без звука'},
          ].map((item,i)=>(
            <ListItemButton key={i} sx={{borderRadius:'12px',mx:1}}>
              <ListItemIcon sx={{color:t.onSurfaceVariant,minWidth:40}}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{sx:{color:t.onSurface}}}/>
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};
