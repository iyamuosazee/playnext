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
    document.body.insertAdjacentHTML('beforeend',`<datalist id="seasonPlayerOptions"></datalist><div id="createSeasonModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">NEW SEASON</div><h3>Track goals every Sunday</h3><p>Players keep one profile even when their teammates change.</p><label class="season-label"><span>Season name</span><input id="seasonNameInput" maxlength="50" value="${new Date().getFullYear()} Sunday Football"></label><button id="confirmCreateSeason" class="primary-btn full-btn">Create season</button><button id="skipSeason" class="secondary-btn full-btn">Play without season</button></div></div><div id="seasonBoardModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="sheet-head"><div><div class="eyebrow">ALL SUNDAYS</div><h3 id="seasonBoardTitle">Season goals</h3></div><button id="closeSeasonBoard" class="icon-btn">×</button></div><div id="seasonBoardContent"></div></div></div>`);
    document.getElementById('confirmCreateSeason').onclick=createSeason;
    document.getElementById('skipSeason').onclick=()=>{hide('createSeasonModal');screen(E.setup)};
    document.getElementById('closeSeasonBoard').onclick=()=>hide('seasonBoardModal');
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
    body.innerHTML=season?`<div class="season-summary"><div><strong>${esc(season.name)}</strong><small>Player goals carry over every Sunday</small></div><button id="homeSeasonBoard" class="secondary-btn">View table</button></div>`:'<p class="season-empty">Create a season to keep player goal totals from week to week.</p><button id="homeCreateSeason" class="secondary-btn full-btn">Create a season</button>';
    document.getElementById('homeSeasonBoard')?.addEventListener('click',openLeaderboard);document.getElementById('homeCreateSeason')?.addEventListener('click',()=>show('createSeasonModal'));
  }
  function addLiveButton(){
    if(document.getElementById('seasonGoalsBtn')){document.getElementById('seasonGoalsBtn').style.display=state.seasonId?'':'none';return}
    document.querySelector('.competition-actions')?.insertAdjacentHTML('beforeend','<button id="seasonGoalsBtn" class="secondary-btn">Season goals</button>');
    const b=document.getElementById('seasonGoalsBtn');b.onclick=openLeaderboard;b.style.display=state.seasonId?'':'none';
  }
  async function createSeason(){
    const input=document.getElementById('seasonNameInput'),name=input.value.trim();if(!name)return toast('Enter a season name');
    const button=document.getElementById('confirmCreateSeason');button.disabled=true;
    try{const data=await rpc('create_season',{p_name:name}),row=Array.isArray(data)?data[0]:data;persist({id:row.season_id,token:row.access_token,name:row.season_name});await loadPlayers();hide('createSeasonModal');screen(E.setup);toast('Season created')}catch{toast('Could not create season')}finally{button.disabled=false}
  }
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
