(()=>{
  const KEY='playnext-season';
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let season=null,players=[],archiveRows=[];
  function saved(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  function persist(value){season=value;value?localStorage.setItem(KEY,JSON.stringify(value)):localStorage.removeItem(KEY);renderSeasonCard()}
  async function rpc(name,args){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
  const show=id=>document.getElementById(id)?.classList.remove('hidden');
  const hide=id=>document.getElementById(id)?.classList.add('hidden');

  function inject(){
    if(document.getElementById('seasonCard'))return;
    E.home.querySelector('.join-panel')?.insertAdjacentHTML('afterend','<div id="seasonCard" class="panel season-card"><div class="section-head"><div><span class="step">SEASON</span><h2>Player Records</h2></div></div><div id="seasonCardBody"></div></div>');
    document.body.insertAdjacentHTML('beforeend',`<datalist id="seasonPlayerOptions"></datalist><div id="createSeasonModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">NEW SEASON</div><h3>Track goals every Sunday</h3><p>Players keep one profile even when their teammates change.</p><label class="season-label"><span>Season name</span><input id="seasonNameInput" maxlength="50" value="${new Date().getFullYear()} Sunday Football"></label><button id="confirmCreateSeason" class="primary-btn full-btn">Create season</button><button id="skipSeason" class="secondary-btn full-btn">Play without season</button></div></div><div id="restoreSeasonModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">RESTORE SEASON</div><h3>Enter recovery code</h3><p>Use the private code saved when the season was created.</p><label class="season-label"><span>Recovery code</span><input id="restoreCodeInput" maxlength="19" autocapitalize="characters" placeholder="PN-XXXX-XXXX-XXXX"></label><button id="confirmRestoreSeason" class="primary-btn full-btn">Restore season</button><button id="cancelRestoreSeason" class="secondary-btn full-btn">Cancel</button></div></div><div id="recoveryCodeModal" class="modal-backdrop hidden"><div class="modal-card season-modal"><div class="eyebrow">PRIVATE RECOVERY CODE</div><h3>Save this code</h3><p>It restores host access on another phone or after clearing browser data. Keep it private.</p><div id="recoveryCodeValue" class="recovery-code">—</div><button id="copyRecoveryCode" class="primary-btn full-btn">Copy recovery code</button><button id="closeRecoveryCode" class="secondary-btn full-btn">Done</button></div></div><div id="seasonBoardModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="sheet-head"><div><div class="eyebrow">ALL SUNDAYS</div><h3 id="seasonBoardTitle">Season goals</h3></div><button id="closeSeasonBoard" class="icon-btn">×</button></div><div id="seasonBoardContent"></div></div></div>`);
    document.body.insertAdjacentHTML('beforeend','<div id="matchdayArchiveModal" class="modal-backdrop hidden"><div class="modal-card competition-card archive-card"><div id="matchdayArchiveContent"></div></div></div>');
    document.getElementById('confirmCreateSeason').onclick=createSeason;
    document.getElementById('skipSeason').onclick=()=>{hide('createSeasonModal');screen(E.setup)};
    document.getElementById('closeSeasonBoard').onclick=()=>hide('seasonBoardModal');
    document.getElementById('confirmRestoreSeason').onclick=restoreFromCode;
    document.getElementById('cancelRestoreSeason').onclick=()=>hide('restoreSeasonModal');
    document.getElementById('closeRecoveryCode').onclick=()=>hide('recoveryCodeModal');
    document.getElementById('copyRecoveryCode').onclick=copyRecoveryCode;
    document.getElementById('restoreCodeInput').oninput=e=>e.target.value=e.target.value.toUpperCase();
    document.getElementById('matchdayArchiveModal').addEventListener('click',e=>{if(e.target.id==='matchdayArchiveModal')hide('matchdayArchiveModal')});
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
    body.innerHTML=season?`<div class="season-summary"><div><strong>${esc(season.name)}</strong><small>Player goals carry over every Sunday</small></div><div class="season-card-actions"><button id="homeSeasonBoard" class="secondary-btn">View table</button><button id="homeMatchdays" class="secondary-btn">Match Days</button><button id="newRecoveryCode" class="secondary-btn">Replace recovery code</button></div></div>`:'<p class="season-empty">Create a season to keep player goal totals from week to week.</p><div class="season-card-actions"><button id="homeCreateSeason" class="secondary-btn">Create a season</button><button id="homeRestoreSeason" class="secondary-btn">Restore season</button></div>';
    document.getElementById('homeSeasonBoard')?.addEventListener('click',openLeaderboard);document.getElementById('homeMatchdays')?.addEventListener('click',openArchive);document.getElementById('homeCreateSeason')?.addEventListener('click',()=>show('createSeasonModal'));document.getElementById('homeRestoreSeason')?.addEventListener('click',()=>show('restoreSeasonModal'));document.getElementById('newRecoveryCode')?.addEventListener('click',()=>{if(confirm('Replace the current recovery code? The previous code will stop working.'))generateRecoveryCode()});
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
    try{const data=await rpc('get_season',{p_season_id:value.id,p_access_token:value.token}),row=Array.isArray(data)?data[0]:data;if(row&&row.status==='active'){season={id:row.season_id,token:value.token,name:row.season_name};await syncPendingGoals();await loadPlayers()}else persist(null)}catch{persist(null)}
  }
  async function loadPlayers(){
    if(!season)return;
    try{players=await rpc('get_season_players',{p_season_id:season.id,p_access_token:season.token})||[];const list=document.getElementById('seasonPlayerOptions');if(list)list.innerHTML=players.map(p=>`<option value="${esc(p.player_name)}"></option>`).join('');decoratePlayerInputs()}catch{}
  }
  function decoratePlayerInputs(){document.querySelectorAll('.player-name-input,.edit-player-row input,.live-player-input').forEach(input=>input.setAttribute('list','seasonPlayerOptions'))}
  async function openLeaderboard(){
    const id=state.seasonId||season?.id;if(!id)return show('createSeasonModal');
    const target=document.getElementById('seasonBoardContent');target.innerHTML='<div class="empty-state">Loading…</div>';show('seasonBoardModal');
    try{await syncPendingGoals();const rows=await rpc('get_season_leaderboard',{p_season_id:id})||[];document.getElementById('seasonBoardTitle').textContent=state.seasonName||season?.name||'Season goals';target.innerHTML=rows.length?`<table class="leader-table season-leader-table"><thead><tr><th>#</th><th>Player</th><th>Match Days</th><th>Goals</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="rank">${rows.findIndex(x=>x.goals===p.goals)+1}</td><td><strong>${esc(p.player_name)}</strong></td><td>${p.match_days||0}</td><td><strong>${p.goals}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No season goals recorded yet.</div>'}catch{target.innerHTML='<div class="empty-state">Could not load the season table.</div>'}
  }
  const matchdayDate=value=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const scorerSummary=history=>{
    const counts={};(history||[]).forEach(h=>{if(h.scorer)counts[h.scorer]=(counts[h.scorer]||0)+1});
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));if(!sorted.length)return {label:'No goals assigned',goals:0};
    const top=sorted[0][1],names=sorted.filter(x=>x[1]===top).map(x=>x[0]);return {label:names.join(' · '),goals:top};
  };
  async function openArchive(){
    const id=state.seasonId||season?.id;if(!id)return show('createSeasonModal');
    const target=document.getElementById('matchdayArchiveContent');target.innerHTML='<div class="empty-state">Loading match days…</div>';show('matchdayArchiveModal');
    try{archiveRows=await rpc('get_matchday_archive',{p_season_id:id})||[];renderArchive()}catch{target.innerHTML='<div class="sheet-head"><h3>Match Days</h3><button id="closeArchive" class="icon-btn">×</button></div><div class="empty-state">Could not load match days.</div>';document.getElementById('closeArchive').onclick=()=>hide('matchdayArchiveModal')}
  }
  function renderArchive(){
    const target=document.getElementById('matchdayArchiveContent');target.innerHTML=`<div class="sheet-head"><div><div class="eyebrow">SEASON ARCHIVE</div><h3>Match Days</h3></div><button id="closeArchive" class="icon-btn">×</button></div>${archiveRows.length?`<div class="archive-list">${archiveRows.map((row,i)=>{const s=row.snapshot||{},history=s.history||[],top=scorerSummary(history);return `<button class="archive-row" data-index="${i}"><span><strong>${matchdayDate(row.played_on)}</strong><small>${(s.players||[]).length} players · ${history.length} matches</small></span><span><b>${top.label}</b><small>${top.goals?`${top.goals} goal${top.goals===1?'':'s'}`:row.matchday_status==='active'?'In progress':'Completed'}</small></span></button>`}).join('')}</div>`:'<div class="empty-state">Completed match days will appear here.</div>'}`;
    document.getElementById('closeArchive').onclick=()=>hide('matchdayArchiveModal');target.querySelectorAll('.archive-row').forEach(b=>b.onclick=()=>renderArchiveDetails(+b.dataset.index));
  }
  function renderArchiveDetails(index){
    const row=archiveRows[index],s=row.snapshot||{},players=s.players||[],teams=[...(s.teams||[])].sort((a,b)=>(b.wins||0)-(a.wins||0)||(b.draws||0)-(a.draws||0)),history=[...(s.history||[])].reverse(),top=scorerSummary(s.history||[]),target=document.getElementById('matchdayArchiveContent');
    target.innerHTML=`<div class="archive-detail-head"><button id="backArchive" class="mini-btn">← Match Days</button><button id="closeArchive" class="icon-btn">×</button></div><div class="eyebrow">${row.matchday_status==='active'?'IN PROGRESS':'COMPLETED'}</div><h3>${matchdayDate(row.played_on)}</h3><div class="archive-stats"><div><span>PLAYERS</span><strong>${players.length}</strong></div><div><span>MATCHES</span><strong>${history.length}</strong></div><div><span>TOP SCORER</span><strong>${esc(top.label)}</strong><small>${top.goals||0} goals</small></div></div><div class="archive-section"><h4>Players</h4><div class="archive-players">${players.map(p=>`<span>${esc(p.name)}</span>`).join('')||'<small>No roster saved</small>'}</div></div><div class="archive-section"><h4>Team standings</h4>${teams.length?`<table class="leader-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td class="rank">${i+1}</td><td><strong>${esc(t.name)}</strong><small class="archive-team-players">${(t.players||[]).map(esc).join(' · ')}</small></td><td>${t.games||0}</td><td>${t.wins||0}</td><td>${t.draws||0}</td><td>${t.losses||0}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No team data saved.</div>'}</div><div class="archive-section"><h4>Results</h4><div class="archive-results">${history.map((h,i)=>h.type==='win'?`<div><span>${i+1}</span><p><strong>${esc(h.winner)} beat ${esc(h.loser)}</strong><small>${h.scorer?`${esc(h.scorer)} scored`: 'Unassigned goal'} · ${esc(h.time)}</small></p></div>`:`<div><span>${i+1}</span><p><strong>${esc(h.a)} vs ${esc(h.b)} · Draw</strong><small>0–0 after ${esc(h.time)}</small></p></div>`).join('')||'<div class="empty-state">No completed matches.</div>'}</div></div>`;
    document.getElementById('backArchive').onclick=renderArchive;document.getElementById('closeArchive').onclick=()=>hide('matchdayArchiveModal');
  }
  async function syncPendingGoals(){
    if(!season||!roomCode||state.seasonId!==season.id||role!=='host')return;
    const pending=(state.history||[]).filter(h=>h.type==='win'&&h.scorer&&h.seasonEventId);
    for(const h of pending)await rpc('record_season_goal',{p_season_id:season.id,p_access_token:season.token,p_session_code:roomCode,p_player_name:h.scorer,p_event_id:h.seasonEventId});
  }
  async function recordGoal(playerName,eventId){if(!season)await restore();if(!season||!roomCode||!playerName)return toast('Goal saved live; season sync will retry');try{await rpc('record_season_goal',{p_season_id:season.id,p_access_token:season.token,p_session_code:roomCode,p_player_name:playerName,p_event_id:eventId});await loadPlayers()}catch{toast('Goal saved live; season sync will retry')}}
  async function undoGoal(eventId){if(!season||!eventId)return;try{await rpc('undo_season_goal',{p_season_id:season.id,p_access_token:season.token,p_event_id:eventId});await loadPlayers()}catch{toast('Live undo worked, but season sync failed')}}
  function setupReturningPlayerSuggestions(){
    if(!document.getElementById('seasonPlayerSuggestions')){
      document.body.insertAdjacentHTML('beforeend','<div id="seasonPlayerSuggestions" class="player-suggestions hidden" role="listbox"></div>');
      const style=document.createElement('style');style.textContent='.player-suggestions{position:fixed;z-index:1200;max-height:250px;overflow:auto;padding:5px;background:#101c17;border:1px solid #3a4b42;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.45)}.player-suggestions-label{padding:7px 9px 5px;color:var(--accent);font-size:8px;font-weight:900;letter-spacing:.14em}.player-suggestions button{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:11px 10px;border:0;border-radius:8px;background:transparent;color:var(--text);font:inherit;text-align:left}.player-suggestions button:active,.player-suggestions button:hover{background:rgba(184,255,79,.1)}.player-suggestions button span{font-size:12px;font-weight:800}.player-suggestions button small{color:var(--muted);font-size:9px;white-space:nowrap}';document.head.appendChild(style);
    }
    const close=()=>document.getElementById('seasonPlayerSuggestions')?.classList.add('hidden');
    const showSuggestions=input=>{
      const menu=document.getElementById('seasonPlayerSuggestions');if(!menu||!season||!players.length)return close();
      const query=input.value.trim().toLocaleLowerCase();
      const used=new Set([...document.querySelectorAll('.player-name-input,.edit-player-row input,.live-player-input')].filter(x=>x!==input).map(x=>x.value.trim().toLocaleLowerCase()).filter(Boolean));
      const matches=players.filter(p=>{const name=String(p.player_name||'');return name.toLocaleLowerCase().includes(query)&&!used.has(name.toLocaleLowerCase())}).slice(0,7);
      if(!matches.length)return close();
      menu.innerHTML=`<div class="player-suggestions-label">RETURNING PLAYERS</div>${matches.map(p=>`<button type="button" role="option" data-name="${esc(p.player_name)}"><span>${esc(p.player_name)}</span><small>Select player</small></button>`).join('')}`;
      const rect=input.getBoundingClientRect(),spaceBelow=innerHeight-rect.bottom,menuHeight=Math.min(250,35+matches.length*45),above=spaceBelow<menuHeight&&rect.top>spaceBelow;
      menu.style.left=`${Math.max(8,rect.left)}px`;menu.style.width=`${Math.min(rect.width,innerWidth-16)}px`;menu.style.top=above?`${Math.max(8,rect.top-menuHeight-5)}px`:`${rect.bottom+5}px`;menu.classList.remove('hidden');
      menu.querySelectorAll('button').forEach(button=>button.onpointerdown=e=>{e.preventDefault();input.value=button.dataset.name;input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus()});
    };
    const decorate=()=>document.querySelectorAll('.player-name-input,.edit-player-row input,.live-player-input').forEach(input=>{
      input.removeAttribute('list');if(input.dataset.seasonSuggest==='1')return;input.dataset.seasonSuggest='1';input.autocomplete='off';
      input.addEventListener('focus',()=>showSuggestions(input));input.addEventListener('input',()=>showSuggestions(input));input.addEventListener('blur',()=>setTimeout(close,120));input.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    });
    new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
  }
  window.PlayNextSeason={recordGoal,undoGoal,openLeaderboard,syncPendingGoals};inject();setupReturningPlayerSuggestions();restore().then(()=>{renderSeasonCard();addLiveButton()});
})();
