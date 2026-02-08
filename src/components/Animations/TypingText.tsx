import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';

interface Props {
  text:string;speed?:number;delay?:number;animate?:boolean;
  onComplete?:()=>void;sx?:any;variant?:any;cursorColor?:string;
}

export const TypingText: React.FC<Props> = ({
  text,speed=35,delay=0,animate=true,onComplete,sx,variant='body2',cursorColor,
}) => {
  const t=m3[useStore(s=>s.themeMode)];
  const [displayed,setDisplayed]=useState(animate?'':text);
  const [showCursor,setShowCursor]=useState(animate);
  const [isTyping,setIsTyping]=useState(false);

  useEffect(()=>{
    if(!animate){setDisplayed(text);return;}
    setDisplayed('');setShowCursor(true);setIsTyping(false);
    const start=setTimeout(()=>{
      setIsTyping(true);let i=0;
      const iv=setInterval(()=>{
        if(i<text.length){setDisplayed(text.slice(0,i+1));i++;}
        else{clearInterval(iv);setIsTyping(false);
          setTimeout(()=>{setShowCursor(false);onComplete?.();},800);}
      },speed+Math.random()*speed*0.5);
      return ()=>clearInterval(iv);
    },delay);
    return ()=>clearTimeout(start);
  },[text,animate,speed,delay]);

  return (
    <Typography variant={variant} component="span"
      sx={{...sx,position:'relative',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
      <span>{displayed}</span>
      {showCursor&&<span className={`typing-cursor ${isTyping?'moving':''}`}
        style={{backgroundColor:cursorColor||t.primary}}/>}
    </Typography>
  );
};
