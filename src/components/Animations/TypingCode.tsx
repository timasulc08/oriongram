import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { m3 } from '../../theme/material3';
import { useStore } from '../../stores/chatStore';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

hljs.registerLanguage('javascript',javascript);
hljs.registerLanguage('typescript',typescript);
hljs.registerLanguage('python',python);
hljs.registerLanguage('css',css);
hljs.registerLanguage('xml',xml);
hljs.registerLanguage('html',xml);
hljs.registerLanguage('json',json);
hljs.registerLanguage('bash',bash);

interface Props {code:string;language?:string;animate?:boolean;speed?:number;}

export const TypingCode: React.FC<Props> = ({code,language='',animate=true,speed=18}) => {
  const themeMode=useStore(s=>s.themeMode);
  const t=m3[themeMode];
  const lines=useMemo(()=>code.split('\n'),[code]);
  const [displayedLines,setDisplayedLines]=useState<string[]>(animate?[]:lines);
  const [isComplete,setIsComplete]=useState(!animate);
  const [copied,setCopied]=useState(false);
  const scrollRef=useRef<HTMLDivElement>(null);

  const detectedLang=useMemo(()=>{
    if(language) return language;
    try{return hljs.highlightAuto(code).language||'plaintext';}catch{return 'plaintext';}
  },[code,language]);

  const highlightedFull=useMemo(()=>{
    try{return hljs.highlight(code,{language:detectedLang}).value;}
    catch{return code.replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  },[code,detectedLang]);

  useEffect(()=>{
    if(!animate||isComplete) return;
    let lineIdx=0,charIdx=0;const result:string[]=[];
    const tick=()=>{
      if(lineIdx>=lines.length){setIsComplete(true);return;}
      const line=lines[lineIdx];charIdx++;
      if(charIdx>line.length){
        result.push(line);lineIdx++;charIdx=0;
        setDisplayedLines([...result]);
        if(scrollRef.current) scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
        setTimeout(tick,speed*2+Math.random()*speed);return;
      }
      setDisplayedLines([...result,line.slice(0,charIdx)]);
      const ch=line[charIdx-1];
      let ns=speed;
      if('{};():'.includes(ch)) ns=speed*2;
      else if(ch===' ') ns=speed*0.5;
      else ns=speed+Math.random()*speed*0.3;
      setTimeout(tick,ns);
    };
    const d2=setTimeout(tick,300);
    return ()=>clearTimeout(d2);
  },[animate,code]);

  const partialCode=displayedLines.join('\n');
  const highlighted=useMemo(()=>{
    if(isComplete) return highlightedFull;
    try{return hljs.highlight(partialCode,{language:detectedLang,ignoreIllegals:true}).value;}
    catch{return partialCode.replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  },[partialCode,isComplete,highlightedFull,detectedLang]);

  const handleCopy=async()=>{await navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);};

  const sc=themeMode==='dark'?{
    kw:'#C792EA',str:'#C3E88D',cmt:'#697098',fn:'#82AAFF',num:'#F78C6C',op:'#89DDFF',tag:'#F07178',attr:'#FFCB6B',v:'#EEFFFF',
  }:{
    kw:'#7C4DFF',str:'#558B2F',cmt:'#90A4AE',fn:'#1565C0',num:'#E65100',op:'#39ADB5',tag:'#E53935',attr:'#F9A825',v:'#2D1B69',
  };

  return (
    <Box sx={{borderRadius:'12px',overflow:'hidden',my:0.5,border:`1px solid ${t.codeBorder}`,backgroundColor:t.codeBackground}}>
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',px:1.5,py:0.5,
        borderBottom:`1px solid ${t.codeBorder}`,backgroundColor:themeMode==='dark'?'#1A1525':'#EDE7F6'}}>
        <Box sx={{display:'flex',alignItems:'center',gap:0.8}}>
          <Box sx={{display:'flex',gap:0.5}}>
            <Box sx={{width:10,height:10,borderRadius:'50%',backgroundColor:'#FF5F56'}}/>
            <Box sx={{width:10,height:10,borderRadius:'50%',backgroundColor:'#FFBD2E'}}/>
            <Box sx={{width:10,height:10,borderRadius:'50%',backgroundColor:'#27CA40'}}/>
          </Box>
          <Typography variant="caption" sx={{color:t.onSurfaceVariant,ml:1,fontSize:'0.7rem',fontFamily:'"JetBrains Mono",monospace'}}>{detectedLang}</Typography>
        </Box>
        <Tooltip title={copied?'Скопировано!':'Копировать'}>
          <IconButton size="small" onClick={handleCopy} sx={{color:t.onSurfaceVariant}}>
            {copied?<Check sx={{fontSize:16,color:'#27CA40'}}/>:<ContentCopy sx={{fontSize:16}}/>}
          </IconButton>
        </Tooltip>
      </Box>
      <Box ref={scrollRef} sx={{px:1.5,py:1,overflow:'auto',maxHeight:400,fontFamily:'"JetBrains Mono",monospace',fontSize:'0.82rem',lineHeight:1.6,color:t.codeText}}>
        <style>{`
          .hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:${sc.kw};font-weight:500}
          .hljs-string,.hljs-attr{color:${sc.str}}.hljs-comment,.hljs-quote{color:${sc.cmt};font-style:italic}
          .hljs-function .hljs-title,.hljs-title.function_{color:${sc.fn}}.hljs-number,.hljs-literal{color:${sc.num}}
          .hljs-operator,.hljs-punctuation{color:${sc.op}}.hljs-tag,.hljs-name{color:${sc.tag}}
          .hljs-attribute{color:${sc.attr}}.hljs-variable,.hljs-template-variable,.hljs-params{color:${sc.v}}
        `}</style>
        <Box sx={{display:'flex'}}>
          <Box sx={{pr:1.5,mr:1.5,borderRight:`1px solid ${t.codeBorder}`,color:t.onSurfaceVariant+'66',userSelect:'none',textAlign:'right',minWidth:30}}>
            {(isComplete?lines:displayedLines).map((_,i)=><Box key={i} sx={{fontSize:'0.75rem',lineHeight:1.6}}>{i+1}</Box>)}
          </Box>
          <Box sx={{flex:1,overflow:'hidden'}}>
            <pre style={{margin:0,whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
              <code dangerouslySetInnerHTML={{__html:highlighted}}/>
              {!isComplete&&<span className="typing-cursor moving" style={{backgroundColor:t.primary,display:'inline-block',width:'2px',height:'1em',verticalAlign:'text-bottom',marginLeft:'1px'}}/>}
            </pre>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
