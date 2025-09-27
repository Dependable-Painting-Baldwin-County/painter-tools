/* Lightweight site-wide AI chat widget */
(function(){
  const PHONE_DISPLAY = '(251) 423-5855';
  const ENDPOINT = '/api/chat';
  const STORAGE_KEY = 'dp_session_id_v1';
  function sid(){ let s=localStorage.getItem(STORAGE_KEY); if(!s){ s=crypto.randomUUID(); localStorage.setItem(STORAGE_KEY,s);} return s; }
  function h(tag, attrs={}, children=[]) { const el=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') el.className=v; else if(k.startsWith('on')&&typeof v==='function') el.addEventListener(k.slice(2),v); else el.setAttribute(k,v); }); children.forEach(c=>{ if(typeof c==='string') el.appendChild(document.createTextNode(c)); else if(c) el.appendChild(c);}); return el; }
  const style = h('style', {}, [
    `.dp-chat-launch {position:fixed;bottom:18px;right:18px;z-index:99999;background:#ff3b3b;color:#fff;border:none;border-radius:50%;width:58px;height:58px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:600;font-family:system-ui,Arial,sans-serif;}
     .dp-chat-launch:hover{background:#e62e2e;}
     .dp-chat-panel {position:fixed;bottom:86px;right:18px;width:330px;max-height:520px;background:#0f0f0f;color:#fff;border:1px solid #2a2a2a;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.55);display:flex;flex-direction:column;font-family:system-ui,Arial,sans-serif;overflow:hidden;z-index:99999;}
     .dp-chat-header{padding:12px 14px;background:#191919;display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:14px;letter-spacing:.5px;border-bottom:1px solid #262626;}
     .dp-chat-header button{background:transparent;color:#ccc;border:none;cursor:pointer;font-size:16px;}
     .dp-chat-header button:hover{color:#fff;}
     .dp-chat-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.45;}
     .dp-msg{padding:8px 10px;border-radius:10px;max-width:85%;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 5px rgba(0,0,0,.4);}
     .dp-msg.user{align-self:flex-end;background:#ff3b3b;color:#fff;border-bottom-right-radius:2px;}
     .dp-msg.ai{align-self:flex-start;background:#1d1d1d;color:#f2f2f2;border-bottom-left-radius:2px;}
     .dp-chat-footer{padding:10px;border-top:1px solid #262626;background:#141414;display:flex;gap:6px;}
     .dp-chat-footer textarea{flex:1;resize:none;height:44px;padding:8px 10px;background:#1c1c1c;border:1px solid #333;border-radius:10px;color:#eee;font-size:13px;font-family:inherit;line-height:1.35;}
     .dp-chat-footer button{background:#ff3b3b;border:none;color:#fff;font-weight:600;padding:0 16px;border-radius:10px;cursor:pointer;font-size:13px;}
     .dp-chat-footer button:disabled{opacity:.5;cursor:not-allowed;}
     .dp-cta-line{font-size:11px;color:#bbb;margin-top:2px;text-align:center;}
     .dp-suggestion-bar{display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;background:#151515;border-top:1px solid #222;}
     .dp-suggestion-bar button{background:#222;border:1px solid #333;color:#bbb;font-size:11px;padding:4px 8px;border-radius:40px;cursor:pointer;}
     .dp-suggestion-bar button:hover{background:#2d2d2d;color:#fff;}
     .dp-spinner{width:16px;height:16px;border:2px solid #ff3b3b;border-right-color:transparent;border-radius:50%;animation:dpSpin .9s linear infinite;display:inline-block;margin-left:6px;vertical-align:middle;}
     @keyframes dpSpin{to{transform:rotate(360deg);}}
     @media (max-width:560px){.dp-chat-panel{right:8px;left:8px;width:auto;max-height:70vh;}.dp-chat-launch{right:14px;}}
    `
  ]);
  document.head.appendChild(style);

  const launch = h('button',{class:'dp-chat-launch',title:'Chat Painting Questions',ariaLabel:'Open painting assistant'},['?']);
  const panel = h('div',{class:'dp-chat-panel',style:'display:none'},[]);
  const header = h('div',{class:'dp-chat-header'},[
    h('span',{},['Painting Assistant']),
    h('button',{ariaLabel:'Close chat',onclick:()=>{panel.style.display='none';launch.style.display='flex';}},['✕'])
  ]);
  const bodyEl = h('div',{class:'dp-chat-body',role:'log','aria-live':'polite'});
  const suggestions = h('div',{class:'dp-suggestion-bar'},[
    'How to prep exterior','Best cabinet finish','Paint for humid climate','Deck repaint steps','Trim paint advice'
  ].map(txt=>h('button',{onclick:()=>{ textArea.value=txt; textArea.focus();}},[txt])));
  const textArea = h('textarea',{placeholder:'Ask about surfaces, Sherwin-Williams, prep, scheduling...'});
  const sendBtn = h('button',{disabled:true},['Send']);
  const footer = h('div',{class:'dp-chat-footer'},[textArea,sendBtn]);
  const ctaLine = h('div',{class:'dp-cta-line'},[`Need a fast estimate? Call ${PHONE_DISPLAY}`]);
  panel.append(header,bodyEl,suggestions,footer,ctaLine);
  document.body.appendChild(launch); document.body.appendChild(panel);

  function addMsg(content, role){ const el=h('div',{class:'dp-msg '+role},[content]); bodyEl.appendChild(el); bodyEl.scrollTop=bodyEl.scrollHeight; }
  function thinking(){ const el=h('div',{class:'dp-msg ai'},[h('span',{},['Thinking ']),h('span',{class:'dp-spinner'})]); bodyEl.appendChild(el); bodyEl.scrollTop=bodyEl.scrollHeight; return el; }

  function open(){ launch.style.display='none'; panel.style.display='flex'; textArea.focus(); }
  launch.addEventListener('click',open);

  textArea.addEventListener('input',()=>{ sendBtn.disabled=!textArea.value.trim(); });

  async function send(){ const msg=textArea.value.trim(); if(!msg) return; addMsg(msg,'user'); textArea.value=''; sendBtn.disabled=true; const tEl=thinking(); try {
      const res = await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,session:sid(),page:location.pathname})});
      if(!res.ok){ throw new Error('Network'); }
      const data= await res.json();
      tEl.remove();
      addMsg(data.answer || '[No answer]', 'ai');
    } catch(e){ tEl.remove(); addMsg('Error fetching answer. Please call '+PHONE_DISPLAY+'.','ai'); }
    sendBtn.disabled=false; bodyEl.scrollTop=bodyEl.scrollHeight; }
  sendBtn.addEventListener('click',send);
  textArea.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }});

  // Intro message
  setTimeout(()=>{ addMsg('Hi! I can help with painting surfaces, Sherwin-Williams product guidance, prep steps, and our services. Ask away.', 'ai'); }, 800);
})();
