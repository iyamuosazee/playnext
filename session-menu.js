(()=>{
  const reset=document.getElementById('resetBtn');
  if(!reset)return;
  reset.textContent='•••';
  reset.setAttribute('aria-label','Session menu');
  reset.classList.add('session-menu-btn');

  document.body.insertAdjacentHTML('beforeend',`<div id="sessionMenuBackdrop" class="session-menu-backdrop hidden"><div class="session-menu-card"><div class="session-menu-head"><div><div class="eyebrow">PLAYNEXT</div><h3>Session menu</h3></div><button id="closeSessionMenu" class="icon-btn" aria-label="Close menu">×</button></div><button id="menuShare" class="session-menu-item"><span>Share / QR code</span><small>Invite players to this room</small></button><button id="menuCohost" class="session-menu-item"><span>Invite a co-host</span><small>Share live controls with one trusted person</small></button><button id="menuAlerts" class="session-menu-item"><span>Match alerts</span><small>Sound and vibration settings</small></button><button id="menuEndMatchday" class="session-menu-item danger-menu"><span>End Match Day</span><small>Close today’s room and preserve season records</small></button><button id="menuLeave" class="session-menu-item danger-menu"><span>Leave session</span><small>Exit this live room</small></button></div></div>`);
  const backdrop=document.getElementById('sessionMenuBackdrop');
  const open=()=>{document.getElementById('menuCohost').style.display=typeof hostKind!=='undefined'&&hostKind==='cohost'?'none':'';document.getElementById('menuEndMatchday').style.display=typeof hostKind!=='undefined'&&hostKind==='cohost'?'none':'';backdrop.classList.remove('hidden')};
  const close=()=>backdrop.classList.add('hidden');
  reset.onclick=open;
  document.getElementById('closeSessionMenu').onclick=close;
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
  document.getElementById('menuShare').onclick=()=>{close(); if(typeof openShare==='function')openShare()};
  document.getElementById('menuCohost').onclick=async()=>{
    if(typeof role==='undefined'||role!=='host'||hostKind!=='primary')return;
    const button=document.getElementById('menuCohost');button.disabled=true;
    try{
      const {data,error}=await sb.rpc('create_cohost_invite',{p_code:roomCode,p_host_token:hostToken});if(error)throw error;
      const token=Array.isArray(data)?data[0]:data,link=`${location.origin}${location.pathname}?room=${roomCode}&cohost=${token}`;
      close();
      if(navigator.share)await navigator.share({title:'PlayNext co-host invitation',text:`Help host PlayNext room ${roomCode}. This private link gives live match controls.`,url:link});
      else{await navigator.clipboard.writeText(link);toast('Co-host invitation copied')}
    }catch(error){if(error?.name!=='AbortError')toast('Could not create co-host invitation')}finally{button.disabled=false}
  };
  document.getElementById('menuAlerts').onclick=()=>{close(); const alertButton=document.getElementById('matchAlertSetting')||document.getElementById('alertSettingsBtn'); if(alertButton)alertButton.click(); else if(typeof toast==='function')toast('Match alerts are controlled from the host alert setting')};
  document.getElementById('menuEndMatchday').onclick=async()=>{
    if(typeof role==='undefined'||role!=='host')return;
    close();if(!confirm('End Match Day? This closes the live room immediately and cannot be resumed. Season records will remain saved.'))return;
    const button=document.getElementById('menuEndMatchday');button.disabled=true;
    try{
      await window.PlayNextSeason?.syncPendingGoals?.();
      if(typeof pauseClock==='function')pauseClock(false);
      const {error}=await sb.rpc('update_session_state',{p_code:roomCode,p_host_token:hostToken,p_state:publicState(),p_status:'ended'});
      if(error)throw error;
      localStorage.removeItem('playnext-host');toast('Match Day ended');setTimeout(()=>location.href=location.pathname,700);
    }catch{button.disabled=false;toast('Could not end Match Day — try again')}
  };
  document.getElementById('menuLeave').onclick=()=>{
    close();
    const message=typeof role!=='undefined'&&role==='host'?'Leave this hosted session? The live room will remain until it expires.':'Leave this room?';
    if(confirm(message)){
      localStorage.removeItem('playnext-host');
      location.href=location.pathname;
    }
  };
})();

(()=>{
  if(!document.querySelector('link[href="competition.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='competition.css';document.head.appendChild(link);
  }
  if(!document.querySelector('script[src="competition.js"]')){
    const script=document.createElement('script');script.src='competition.js';document.body.appendChild(script);
  }
  if(!document.querySelector('link[href="season.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='season.css';document.head.appendChild(link);
  }
  if(!document.querySelector('script[src="season.js"]')){
    const script=document.createElement('script');script.src='season.js';document.body.appendChild(script);
  }
})();
