(()=>{
  const KEY='playnext-season';
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let season=null,players=[];
  function saved(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  function persist(value){season=value;value?localStorage.setItem(KEY,JSON.stringify(value)):localStorage.removeItem(KEY);renderSeasonCard()}
  async function rpc(name,args){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
  const show=id=>document.getElementById(id)?.classList.remove('hidden');
  const hide=id=>document.getElementById(id)?.classList.add('hidden');

  function inject(){
    if(document.getElementById('seasonCard'))return;
    E.home.querySelector('.join-panel')?.insertAdjacentHTML('afterend','<div id="seasonCard" class="panel season-card"><div class="section-head"><div><span class="step">SEASON</span><h2>Sunday season</h2></div></div><div id="seasonCardBody"></div></div>');
    document.body.insertAdjacentHTML('beforeend',`<datalist id="seasonPlayerOptions"></datalist><div id="createSeasonModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">NEW SEASON</div><h3>Track goals every Sunday</h3><p>Players keep one profile even when their teammates change.</p><label class="season-label"><span>Season name</span><input id="seasonNameInput" maxlength="50" value="${new Date().getFullYear()} Sunday Football"></label><button id="confirmCreateSeason" class="primary-btn full-btn">Create season</button><button id="skipSeason" class="secondary-btn full-btn">Play without season</button></div></div><div id="restoreSeasonModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">RESTORE SEASON</div><h3>Enter recovery code</h3><p>Use the private code saved when the season was created.</p><label class="season-label"><span>Recovery code</span><input id="restoreCodeInput" maxlength="19" autocapitalize="characters" placeholder="PN-XXXX-XXXX-XXXX"></label><button id="confirmRestoreSeason" class="primary-btn full-btn">Restore season</button><button id="cancelRestoreSeason" class="secondary-btn full-btn">Cancel</button></div></div><div id="recoveryCodeModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">PRIVATE RECOVERY CODE</div><h3>Save this code</h3><p>It restores host access on another phone or after clearing browser data. Keep it private.</p><div id="recoveryCodeValue" class="recovery-code">—</div><button id="copyRecoveryCode" class="primary-btn full-btn">Copy recovery code</button><button id="closeRecoveryCode" class="secondary-btn full-btn">Done</button></div></div><div id="seasonBoardModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="sheet-head"><div><div class="eyebrow">ALL SUNDAYS</div><h3 id="seasonBoardTitle">Season goals</h3></div><button id="closeSeasonBoard" class="icon-btn">×</button></div><div id="seasonBoardContent"></div></div></div>`);
    document.getElementById('confirmCreateSeason').onclick=createSeason;
    document.getElementById('skipSeason').onclick=()=>{hide('createSeasonModal');screen(E.setup)};
    document.getElementById('closeSeasonBoard').onclick=()=>hide('seasonBoardModal');
    document.getElementById('confirmRestoreSeason').onclick=restoreFromCode;
    document.getElementById('cancelRestoreSeason').onclick=()=>hide('restoreSeasonModal');
    document.getElementById('closeRecoveryCode').onclick=()=>hide('recoveryCodeModal');
    document.getElementById('copyRecoveryCode').onclick=copyRecoveryCode;
    document.getElementById('restoreCodeInput').oninput=e=>e.target.value=e.target.value.toUpperCase();
    const oldHost=E.host.onclick;
    E.host.onclick=async()=>{if(!season)return show('createSeasonModal');await loadPlayers();oldHost()};
    const oldStart=E.start.onclick;
    E.start.onclick=async()=>{
      if(season){state.seasonId=season.id;state.seasonName=season.name}
      const before=roomCode;await oldStart();
      if(season&&role==='host'&&roomCode&&roomCode!==before){
        const names=[...document.querySelectorAll('.player-name-input')].map(x=>x.value.trim()).filter(Boolean);
        try{await rpc('start_season_matchday',{p_season_id:season.id,p_access_token:season.token,p_session_code:roomCode,p_player_names:names});await loadPlayers();addLiveButton();toast('Sunday added to the season')}catch{toast('Live game started, but season sync failed')}
      }
    };
    new MutationObserver(decoratePlayerInputs).observe(document.body,{childList:true,subtree:true});
    renderSeasonCard();decoratePlayerInputs();
    if(document.querySelector('.competition-actions'))addLiveButton();else window.addEventListener('playnext:competition-ready',addLiveButton,{once:true});
  }
  function renderSeasonCard(){
    const body=document.getElementById('seasonCardBody');if(!body)return;
    body.innerHTML=season?`<div class="season-summary"><div><strong>${esc(season.name)}</strong><small>Player goals carry over every Sunday</small></div><div class="season-card-actions"><button id="homeSeasonBoard" class="secondary-btn">View table</button><button id="newRecoveryCode" class="secondary-btn">Replace recovery code</button></div></div>`:'<p class="season-empty">Create a season to keep player goal totals from week to week.</p><div class="season-card-actions"><button id="homeCreateSeason" class="secondary-btn">Create a season</button><button id="homeRestoreSeason" class="secondary-btn">Restore season</button></div>';
    document.getElementById('homeSeasonBoard')?.addEventListener('click',openLeaderboard);document.getElementById('homeCreateSeason')?.addEventListener('click',()=>show('createSeasonModal'));document.getElementById('homeRestoreSeason')?.addEventListener('click',()=>show('restoreSeasonModal'));document.getElementById('newRecoveryCode')?.addEventListener('click',()=>{if(confirm('Replace the current recovery code? The previous code will stop working.'))generateRecoveryCode()});
  }
  function addLiveButton(){
    if(document.getElementById('seasonGoalsBtn')){document.getElementById('seasonGoalsBtn').style.display=state.seasonId?'':'none';return}
    document.querySelector('.competition-actions')?.insertAdjacentHTML('beforeend','<button id="seasonGoalsBtn" class="secondary-btn">Season goals</button>');
    const b=document.getElementById('seasonGoalsBtn');b.onclick=openLeaderboard;b.style.display=state.seasonId?'':'none';
  }
  async function createSeason(){
    const input=document.getElementById('seasonNameInput'),name=input.value.trim();if(!name)return toast('Enter a season name');
    const button=document.getElementById('confirmCreateSeason');button.disabled=true;
    try{const data=await rpc('create_season',{p_name:name}),row=Array.isArray(data)?data[0]:data;persist({id:row.season_id,token:row.access_token,name:row.season_name});await loadPlayers();hide('createSeasonModal');screen(E.setup);await generateRecoveryCode();toast('Season created')}catch{toast('Could not create season')}finally{button.disabled=false}
  }
  async function generateRecoveryCode(){
    if(!season)return;
    try{const code=await rpc('generate_season_recovery_code',{p_season_id:season.id,p_access_token:season.token});document.getElementById('recoveryCodeValue').textContent=code;show('recoveryCodeModal')}catch{toast('Could not generate a recovery code')}
  }
  async function restoreFromCode(){
    const input=document.getElementById('restoreCodeInput'),code=input.value.trim();if(!code)return toast('Enter your recovery code');
    const button=document.getElementById('confirmRestoreSeason');button.disabled=true;
    try{const data=await rpc('restore_season',{p_recovery_code:code}),row=Array.isArray(data)?data[0]:data;if(!row)return toast('Recovery code not found');persist({id:row.season_id,token:row.access_token,name:row.season_name});await loadPlayers();hide('restoreSeasonModal');input.value='';toast('Season restored')}catch{toast('Could not restore season')}finally{button.disabled=false}
  }
  async function copyRecoveryCode(){const code=document.getElementById('recoveryCodeValue').textContent;try{await navigator.clipboard.writeText(code);toast('Recovery code copied')}catch{toast(code)}}
  async function restore(){
    const value=saved();if(!value)return;
    try{const data=await rpc('get_season',{p_season_id:value.id,p_access_token:value.token}),row=Array.isArray(data)?data[0]:data;if(row&&row.status==='active'){season={id:row.season_id,token:value.token,name:row.season_name};await loadPlayers()}else persist(null)}catch{persist(null)}
  }
  async function loadPlayers(){
    if(!season)return;
    try{players=await rpc('get_season_players',{p_season_id:season.id,p_access_token:season.token})||[];const list=document.getElementById('seasonPlayerOptions');if(list)list.innerHTML=players.map(p=>`<option value="${esc(p.player_name)}"></option>`).join('');decoratePlayerInputs()}catch{}
  }
  function decoratePlayerInputs(){document.querySelectorAll('.player-name-input,.edit-player-row input,.live-player-input').forEach(input=>input.setAttribute('list','seasonPlayerOptions'))}
  async function openLeaderboard(){
    const id=state.seasonId||season?.id;if(!id)return show('createSeasonModal');
    const target=document.getElementById('seasonBoardContent');target.innerHTML='<div class="empty-state">Loading…</div>';show('seasonBoardModal');
    try{const rows=await rpc('get_season_leaderboard',{p_season_id:id})||[];document.getElementById('seasonBoardTitle').textContent=state.seasonName||season?.name||'Season goals';target.innerHTML=rows.length?`<table class="leader-table"><thead><tr><th>#</th><th>Player</th><th>Goals</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="rank">${rows.findIndex(x=>x.goals===p.goals)+1}</td><td><strong>${esc(p.player_name)}</strong></td><td><strong>${p.goals}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No season goals recorded yet.</div>'}catch{target.innerHTML='<div class="empty-state">Could not load the season table.</div>'}
  }
  async function recordGoal(playerName,eventId){if(!season||!roomCode||!playerName)return;try{await rpc('record_season_goal',{p_season_id:season.id,p_access_token:season.token,p_session_code:roomCode,p_player_name:playerName,p_event_id:eventId});await loadPlayers()}catch{toast('Goal saved live, but season sync failed')}}
  async function undoGoal(eventId){if(!season||!eventId)return;try{await rpc('undo_season_goal',{p_season_id:season.id,p_access_token:season.token,p_event_id:eventId});await loadPlayers()}catch{toast('Live undo worked, but season sync failed')}}
  window.PlayNextSeason={recordGoal,undoGoal,openLeaderboard};inject();restore().then(()=>{renderSeasonCard();addLiveButton()});
})();
