import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, List, ListItemButton,
  ListItemAvatar, ListItemText, Avatar, Typography, Box, CircularProgress,
  Button, DialogActions, IconButton, InputAdornment, Chip,
} from '@mui/material';
import { Close, Search, GroupAdd, PersonAdd, AlternateEmail } from '@mui/icons-material';
import { useStore } from '../../stores/chatStore';
import { m3 } from '../../theme/material3';
import { searchUsers, createChat } from '../../api/chats';

interface Props { open:boolean; onClose:()=>void; }

export const NewChatDialog: React.FC<Props> = ({open,onClose}) => {
  const t=m3[useStore(s=>s.themeMode)];
  const [q,setQ]=useState('');
  const [results,setResults]=useState<Array<{id:string;email:string;displayName:string;username:string;avatarUrl:string}>>([]);
  const [loading,setLoading]=useState(false);
  const [mode,setMode]=useState<'search'|'group'>('search');
  const [groupName,setGroupName]=useState('');
  const [selected,setSelected]=useState<string[]>([]);

  const handleSearch=async()=>{
    if(!q.trim()) return;setLoading(true);
    const r=await searchUsers(q.trim());setResults(r);setLoading(false);
  };

  const handleStartChat=async(userId:string)=>{
    try{await createChat('',[userId],false);onClose();reset();}catch(e){console.error(e);}
  };

  const handleCreateGroup=async()=>{
    if(!groupName.trim()||selected.length===0) return;
    try{await createChat(groupName.trim(),selected,true);onClose();reset();}catch(e){console.error(e);}
  };

  const reset=()=>{setQ('');setResults([]);setGroupName('');setSelected([]);setMode('search');};

  return (
    <Dialog open={open} onClose={()=>{onClose();reset();}} maxWidth="sm" fullWidth
      PaperProps={{sx:{borderRadius:'24px',backgroundColor:t.surfaceContainerLow}}}>
      <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between',color:t.onSurface}}>
        {mode==='search'?'Новый чат':'Новая группа'}
        <IconButton onClick={()=>{onClose();reset();}} sx={{color:t.onSurfaceVariant}}><Close/></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{display:'flex',gap:1,mb:2}}>
          <Button variant={mode==='search'?'contained':'outlined'} size="small" startIcon={<PersonAdd/>}
            onClick={()=>setMode('search')} sx={{borderRadius:'12px',flex:1}}>Личный</Button>
          <Button variant={mode==='group'?'contained':'outlined'} size="small" startIcon={<GroupAdd/>}
            onClick={()=>setMode('group')} sx={{borderRadius:'12px',flex:1}}>Группа</Button>
        </Box>
        {mode==='group'&&<TextField fullWidth label="Название группы" value={groupName}
          onChange={e=>setGroupName(e.target.value)} sx={{mb:2,'& .MuiOutlinedInput-root':{borderRadius:'12px'}}}/>}
        <Box sx={{display:'flex',gap:1,mb:2}}>
          <TextField fullWidth placeholder="Поиск по @юзернейму, имени или email" value={q}
            onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()}
            InputProps={{startAdornment:<InputAdornment position="start">
              <AlternateEmail sx={{color:t.onSurfaceVariant,fontSize:18}}/></InputAdornment>}}
            sx={{'& .MuiOutlinedInput-root':{borderRadius:'12px'}}}/>
          <Button onClick={handleSearch} variant="contained" sx={{borderRadius:'12px',minWidth:50}}>
            {loading?<CircularProgress size={20} color="inherit"/>:<Search/>}
          </Button>
        </Box>
        {selected.length>0&&mode==='group'&&(
          <Box sx={{display:'flex',flexWrap:'wrap',gap:0.5,mb:1}}>
            {selected.map(id=>{
              const u=results.find(r=>r.id===id);
              return <Chip key={id} label={u?.displayName||id} onDelete={()=>setSelected(s=>s.filter(x=>x!==id))}
                sx={{borderRadius:'8px'}}/>;
            })}
          </Box>
        )}
        <List sx={{maxHeight:300,overflow:'auto'}}>
          {results.map(u=>(
            <ListItemButton key={u.id} selected={selected.includes(u.id)}
              onClick={()=>mode==='group'?setSelected(s=>s.includes(u.id)?s.filter(x=>x!==u.id):[...s,u.id]):handleStartChat(u.id)}
              sx={{borderRadius:'12px',mb:0.5}}>
              <ListItemAvatar>
                <Avatar src={u.avatarUrl} sx={{backgroundColor:t.primary,color:t.onPrimary}}>{u.displayName[0]}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
                  <span style={{color:t.onSurface}}>{u.displayName}</span>
                  {u.username&&<Typography variant="caption" sx={{color:t.primary}}>@{u.username}</Typography>}
                </Box>}
                secondary={u.email} secondaryTypographyProps={{sx:{color:t.onSurfaceVariant}}}/>
            </ListItemButton>
          ))}
          {results.length===0&&q&&!loading&&<Typography sx={{color:t.onSurfaceVariant,textAlign:'center',py:2}}>Не найдено</Typography>}
        </List>
      </DialogContent>
      {mode==='group'&&(
        <DialogActions sx={{px:3,pb:2}}>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!groupName.trim()||selected.length===0}
            sx={{borderRadius:'14px',px:3}}>Создать группу</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
