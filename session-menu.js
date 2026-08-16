(()=>{
  const reset=document.getElementById('resetBtn');
  if(!reset)return;
  reset.textContent='•••';
  reset.setAttribute('aria-label','Session menu');
  reset.classList.add('session-menu-btn');

  document.body.insertAdjacentHTML('beforeend',`<div id="sessionMenuBackdrop" class="session-menu-backdrop hidden"><div class="session-menu-card"><div class="session-menu-head"><div><div class="eyebrow">PLAYNEXT</div><h3>Session menu</h3></div><button id="closeSessionMenu" class="icon-btn" aria-label="Close menu">×</button></div><button id="menuShare" class="session-menu-item"><span>Share / QR code</span><small>Invite players to this room</small></button><button id="menuAlerts" class="session-menu-item"><span>Match alerts</span><small>Sound and vibration settings</small></button><button id="menuLeave" class="session-menu-item danger-menu"><span>Leave session</span><small>Exit this live room</small></button></div></div>`);
  const backdrop=document.getElementById('sessionMenuBackdrop');
  const open=()=>backdrop.classList.remove('hidden');
  const close=()=>backdrop.classList.add('hidden');
  reset.onclick=open;
  document.getElementById('closeSessionMenu').onclick=close;
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
  document.getElementById('menuShare').onclick=()=>{close(); if(typeof openShare==='function')openShare()};
  document.getElementById('menuAlerts').onclick=()=>{close(); const alertButton=document.getElementById('matchAlertSetting')||document.getElementById('alertSettingsBtn'); if(alertButton)alertButton.click(); else if(typeof toast==='function')toast('Match alerts are controlled from the host alert setting')};
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
