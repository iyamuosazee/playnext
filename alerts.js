(()=>{
  const STORAGE_KEY='playnext-alert-mode';
  const MODES={
    'sound-vibrate':'Sound + Vibration',
    'sound':'Sound only',
    'off':'Off'
  };
  let audioCtx=null;

  function mode(){
    return localStorage.getItem(STORAGE_KEY)||'sound-vibrate';
  }

  function setMode(value){
    localStorage.setItem(STORAGE_KEY,value);
    document.querySelectorAll('[data-alert-mode]').forEach(el=>el.value=value);
    const liveLabel=document.getElementById('alertModeLive');
    if(liveLabel) liveLabel.textContent=MODES[value]||MODES['sound-vibrate'];
    armAudio();
  }

  function armAudio(){
    if(mode()==='off') return;
    try{
      const A=window.AudioContext||window.webkitAudioContext;
      if(!A) return;
      if(!audioCtx) audioCtx=new A();
      if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
    }catch(e){}
  }

  function tone(freq,start,duration,volume=.075){
    try{
      const A=window.AudioContext||window.webkitAudioContext;
      if(!A) return;
      if(!audioCtx) audioCtx=new A();
      if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
      const o=audioCtx.createOscillator();
      const g=audioCtx.createGain();
      o.type='sine';
      o.frequency.value=freq;
      g.gain.setValueAtTime(0.0001,audioCtx.currentTime+start);
      g.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+start+.015);
      g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+start+duration);
      o.connect(g);g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime+start);
      o.stop(audioCtx.currentTime+start+duration+.03);
    }catch(e){}
  }

  function playMinuteWarning(){
    tone(740,0,.16,.085);
    tone(740,.27,.16,.085);
  }

  function playFullTime(){
    tone(560,0,.18,.09);
    tone(660,.23,.18,.09);
    tone(820,.46,.34,.1);
  }

  // Override the lightweight V2.1 alert handler without touching match/queue logic.
  window.alertUser=function(kind){
    const selected=mode();
    if(selected==='off') return;
    if(selected==='sound-vibrate' && navigator.vibrate){
      navigator.vibrate(kind==='full'?[250,120,250,120,450]:[160,90,160]);
    }
    if(selected==='sound-vibrate' || selected==='sound'){
      if(kind==='full') playFullTime(); else playMinuteWarning();
    }
  };

  function buildSetting(){
    const setup=document.getElementById('setupScreen');
    if(setup && !document.getElementById('alertSettingsPanel')){
      const panel=document.createElement('div');
      panel.id='alertSettingsPanel';
      panel.className='panel compact-panel alert-settings-panel';
      panel.innerHTML=`
        <div class="section-head"><div><span class="step">03</span><h2>Match alerts</h2></div></div>
        <label class="alert-setting-label"><span>1-minute & full-time alerts</span>
          <select data-alert-mode aria-label="Match alert mode">
            <option value="sound-vibrate">Sound + Vibration</option>
            <option value="sound">Sound only</option>
            <option value="off">Off</option>
          </select>
        </label>
        <p class="alert-help">At 1:00: two short alerts. At 0:00: a stronger full-time alert. Vibration depends on browser/device support.</p>`;
      const start=document.getElementById('startSessionBtn');
      setup.insertBefore(panel,start);
      panel.querySelector('select').value=mode();
      panel.querySelector('select').addEventListener('change',e=>setMode(e.target.value));
    }

    const game=document.getElementById('gameScreen');
    const actions=game?.querySelector('.action-row');
    if(actions && !document.getElementById('liveAlertSetting')){
      const wrap=document.createElement('div');
      wrap.id='liveAlertSetting';
      wrap.className='live-alert-setting';
      wrap.innerHTML=`<span>🔔 Match alerts</span><select data-alert-mode aria-label="Live match alert mode"><option value="sound-vibrate">Sound + Vibration</option><option value="sound">Sound only</option><option value="off">Off</option></select>`;
      actions.parentNode.insertBefore(wrap,actions);
      wrap.querySelector('select').value=mode();
      wrap.querySelector('select').addEventListener('change',e=>setMode(e.target.value));
    }

    const style=document.createElement('style');
    style.textContent=`
      .alert-setting-label{display:block}.alert-setting-label>span{display:block;font-size:11px;color:var(--muted);margin:0 0 7px 4px}.alert-setting-label select,.live-alert-setting select{width:100%;background:#09150f;color:var(--text);border:1px solid var(--line);padding:12px;border-radius:12px}.alert-help{margin:10px 2px 0;color:var(--muted);font-size:10px;line-height:1.5}.live-alert-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:11px 13px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025)}.live-alert-setting>span{font-size:11px;font-weight:800;color:var(--muted);white-space:nowrap}.live-alert-setting select{width:auto;min-width:145px;padding:9px 10px;font-size:11px}.spectator #liveAlertSetting{display:none}@media(max-width:390px){.live-alert-setting{align-items:stretch;flex-direction:column}.live-alert-setting select{width:100%}}
    `;
    document.head.appendChild(style);
  }

  // Browsers, especially iOS Safari, are more reliable after audio is armed by a user gesture.
  ['pointerdown','touchstart','keydown'].forEach(evt=>document.addEventListener(evt,armAudio,{once:true,passive:true}));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildSetting); else buildSetting();
})();
