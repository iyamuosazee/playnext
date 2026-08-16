(()=>{
  const KEY='playnext-season';
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let season=null,players=[],archiveRows=[],leaderboardRows=[],launchSeasonSetup=null,attendanceIds=new Set(),attendanceInitialized=false;
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
    const oldHost=E.host.onclick;launchSeasonSetup=oldHost;
    E.host.onclick=async()=>{if(!season)return show('createSeasonModal');await openAttendanceSelection()};
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
    body.innerHTML=season?`<div class="season-summary"><div><strong>${esc(season.name)}</strong><small>Player goals carry over every Sunday</small></div><div class="season-card-actions"><button id="homeSeasonBoard" class="secondary-btn">View table</button><button id="homePlayers" class="secondary-btn">Players</button><button id="homeMatchdays" class="secondary-btn">Match Days</button><button id="newRecoveryCode" class="secondary-btn">Replace recovery code</button></div></div>`:'<p class="season-empty">Create a season to keep player goal totals from week to week.</p><div class="season-card-actions"><button id="homeCreateSeason" class="secondary-btn">Create a season</button><button id="homeRestoreSeason" class="secondary-btn">Restore season</button></div>';
    document.getElementById('homeSeasonBoard')?.addEventListener('click',openLeaderboard);document.getElementById('homePlayers')?.addEventListener('click',openPlayerManager);document.getElementById('homeMatchdays')?.addEventListener('click',openArchive);document.getElementById('homeCreateSeason')?.addEventListener('click',()=>show('createSeasonModal'));document.getElementById('homeRestoreSeason')?.addEventListener('click',()=>show('restoreSeasonModal'));document.getElementById('newRecoveryCode')?.addEventListener('click',()=>{if(confirm('Replace the current recovery code? The previous code will stop working.'))generateRecoveryCode()});
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
    try{players=await rpc('get_season_players',{p_season_id:season.id,p_access_token:season.token})||[];const list=document.getElementById('seasonPlayerOptions');if(list)list.innerHTML=players.filter(p=>p.is_active!==false).map(p=>`<option value="${esc(p.player_name)}"></option>`).join('');decoratePlayerInputs()}catch{}
  }
  function decoratePlayerInputs(){document.querySelectorAll('.player-name-input,.edit-player-row input,.live-player-input').forEach(input=>input.setAttribute('list','seasonPlayerOptions'))}
  async function openLeaderboard(){
    const id=state.seasonId||season?.id;if(!id)return show('createSeasonModal');
    const target=document.getElementById('seasonBoardContent');target.innerHTML='<div class="empty-state">Loading…</div>';show('seasonBoardModal');
    try{await syncPendingGoals();const rows=await rpc('get_season_leaderboard',{p_season_id:id})||[];leaderboardRows=rows;document.getElementById('seasonBoardTitle').textContent=state.seasonName||season?.name||'Season goals';target.innerHTML=rows.length?`<button id="shareSeasonTable" class="secondary-btn share-results-btn">Share season table <span>↗</span></button><table class="leader-table season-leader-table"><thead><tr><th>#</th><th>Player</th><th>Match Days</th><th>Goals</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="rank">${rows.findIndex(x=>x.goals===p.goals)+1}</td><td><strong>${esc(p.player_name)}</strong></td><td>${p.match_days||0}</td><td><strong>${p.goals}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No season goals recorded yet.</div>';document.getElementById('shareSeasonTable')?.addEventListener('click',shareSeasonTable)}catch{target.innerHTML='<div class="empty-state">Could not load the season table.</div>'}
  }
  function setupPlayerManager(){
    if(document.getElementById('playerManagerModal'))return;
    document.body.insertAdjacentHTML('beforeend','<div id="playerManagerModal" class="modal-backdrop hidden"><div class="modal-card competition-card player-manager-card"><div class="sheet-head"><div><div class="eyebrow">SEASON ROSTER</div><h3>Players</h3></div><button id="closePlayerManager" class="icon-btn">×</button></div><p class="player-manager-intro">Manage the permanent player records used across every Match Day.</p><div class="player-add-row"><input id="newSeasonPlayer" maxlength="24" autocomplete="off" placeholder="Add a new player"><button id="addSeasonPlayer" class="primary-btn compact">Add</button></div><div id="playerManagerList"></div></div></div>');
    const style=document.createElement('style');style.textContent='.player-manager-card{width:min(100%,460px)}.player-manager-intro{margin:-4px 0 16px;color:var(--muted);font-size:11px;line-height:1.5}.player-add-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:18px}.player-add-row input{min-width:0;background:#101c17;border:1px solid var(--line);border-radius:10px;color:var(--text);padding:12px;font:inherit}.player-manager-section-title{margin:17px 0 8px;color:var(--muted);font-size:9px;font-weight:900;letter-spacing:.12em}.player-manager-list{display:grid;gap:7px}.player-manager-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:12px}.player-manager-row.inactive{opacity:.66}.player-manager-row strong,.player-manager-row small{display:block}.player-manager-row strong{font-size:12px}.player-manager-row small{margin-top:3px;color:var(--muted);font-size:9px}.player-manager-actions{display:flex;gap:5px}.player-manager-actions button{padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);font-size:9px;font-weight:800}.player-manager-actions .restore-player{color:var(--accent)}.share-results-btn{width:100%;margin:0 0 14px}.archive-detail-head+.eyebrow+h3+.share-results-btn{margin-top:12px}';document.head.appendChild(style);
    document.getElementById('closePlayerManager').onclick=()=>hide('playerManagerModal');document.getElementById('playerManagerModal').onclick=e=>{if(e.target.id==='playerManagerModal')hide('playerManagerModal')};document.getElementById('addSeasonPlayer').onclick=addManagedPlayer;document.getElementById('newSeasonPlayer').onkeydown=e=>{if(e.key==='Enter')addManagedPlayer()};
  }
  function setupAttendanceSelection(){
    if(document.getElementById('attendanceModal'))return;
    document.body.insertAdjacentHTML('beforeend','<div id="attendanceModal" class="modal-backdrop hidden"><div class="modal-card competition-card attendance-card"><div class="sheet-head"><div><div class="eyebrow">SUNDAY ATTENDANCE</div><h3>Who’s playing today?</h3></div><button id="closeAttendance" class="icon-btn">×</button></div><p class="attendance-intro">Select today’s players. We’ll place them into team slots for you to arrange.</p><div class="attendance-tools"><button id="selectAllAttendance" class="mini-btn">Select all</button><button id="clearAttendance" class="mini-btn">Clear</button><strong id="attendanceCount">0 selected</strong></div><div id="attendanceList" class="attendance-list"></div><div class="attendance-add"><input id="attendanceNewPlayer" maxlength="24" autocomplete="off" placeholder="New player name"><button id="attendanceAddPlayer" class="secondary-btn">Add player</button></div><button id="continueAttendance" class="primary-btn full-btn">Continue to teams <span>→</span></button></div></div>');
    const style=document.createElement('style');style.textContent='.attendance-card{width:min(100%,460px)}.attendance-intro{margin:-4px 0 14px;color:var(--muted);font-size:11px;line-height:1.5}.attendance-tools{display:flex;align-items:center;gap:7px;margin-bottom:10px}.attendance-tools strong{margin-left:auto;color:var(--accent);font-size:10px}.attendance-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:310px;overflow:auto}.attendance-player{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025);color:var(--text);font-size:11px;font-weight:750;cursor:pointer}.attendance-player.selected{border-color:rgba(184,255,79,.55);background:rgba(184,255,79,.08)}.attendance-player input{accent-color:var(--accent)}.attendance-add{display:grid;grid-template-columns:1fr auto;gap:7px;margin:14px 0 9px}.attendance-add input{min-width:0;background:#101c17;border:1px solid var(--line);border-radius:10px;color:var(--text);padding:11px;font:inherit}.attendance-add button{padding:10px}.attendance-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:11px 12px;border:1px solid rgba(184,255,79,.28);border-radius:12px;background:rgba(184,255,79,.06)}.attendance-summary strong,.attendance-summary small{display:block}.attendance-summary strong{font-size:11px}.attendance-summary small{margin-top:2px;color:var(--muted);font-size:9px}.attendance-summary button{white-space:nowrap}@media(max-width:390px){.attendance-list{grid-template-columns:1fr}}';document.head.appendChild(style);
    document.getElementById('closeAttendance').onclick=()=>hide('attendanceModal');document.getElementById('attendanceModal').onclick=e=>{if(e.target.id==='attendanceModal')hide('attendanceModal')};document.getElementById('selectAllAttendance').onclick=()=>{attendanceIds=new Set(players.filter(p=>p.is_active!==false).map(p=>p.player_id));renderAttendanceSelection()};document.getElementById('clearAttendance').onclick=()=>{attendanceIds.clear();renderAttendanceSelection()};document.getElementById('continueAttendance').onclick=continueFromAttendance;document.getElementById('attendanceAddPlayer').onclick=addAttendancePlayer;document.getElementById('attendanceNewPlayer').onkeydown=e=>{if(e.key==='Enter')addAttendancePlayer()};E.players?.addEventListener('change',()=>setTimeout(applyAttendanceToSetup,0));
  }
  async function openAttendanceSelection(){
    await loadPlayers();const active=players.filter(p=>p.is_active!==false);if(!attendanceInitialized){attendanceIds=new Set(active.map(p=>p.player_id));attendanceInitialized=true}else attendanceIds=new Set([...attendanceIds].filter(id=>active.some(p=>p.player_id===id)));renderAttendanceSelection();show('attendanceModal')
  }
  function renderAttendanceSelection(){
    const target=document.getElementById('attendanceList');if(!target)return;const active=players.filter(p=>p.is_active!==false);target.innerHTML=active.length?active.map(p=>`<label class="attendance-player ${attendanceIds.has(p.player_id)?'selected':''}"><input type="checkbox" value="${p.player_id}" ${attendanceIds.has(p.player_id)?'checked':''}><span>${esc(p.player_name)}</span></label>`).join(''):'<div class="empty-state">No active players yet.</div>';document.getElementById('attendanceCount').textContent=`${attendanceIds.size} selected`;target.querySelectorAll('input').forEach(input=>input.onchange=()=>{input.checked?attendanceIds.add(input.value):attendanceIds.delete(input.value);renderAttendanceSelection()})
  }
  async function addAttendancePlayer(){
    const input=document.getElementById('attendanceNewPlayer'),name=input.value.trim();if(!name)return toast('Enter a player name');const button=document.getElementById('attendanceAddPlayer');button.disabled=true;try{await rpc('manage_season_player',{p_season_id:season.id,p_access_token:season.token,p_action:'add',p_player_id:null,p_player_name:name});await loadPlayers();const added=players.find(p=>p.player_name.toLocaleLowerCase()===name.toLocaleLowerCase());if(added)attendanceIds.add(added.player_id);input.value='';renderAttendanceSelection();toast('Player added and selected')}catch{toast('Could not add player')}finally{button.disabled=false}
  }
  function continueFromAttendance(){if(!attendanceIds.size)return toast('Select at least one player');hide('attendanceModal');launchSeasonSetup?.();setTimeout(applyAttendanceToSetup,0)}
  function attendancePlayers(){return players.filter(p=>attendanceIds.has(p.player_id))}
  function applyAttendanceToSetup(){
    if(!attendanceInitialized||!E.setup.classList.contains('active'))return;const selected=attendancePlayers(),perTeam=Math.max(1,+E.players.value||3),needed=Math.min(10,Math.max(4,Math.ceil(selected.length/perTeam)));while(E.inputs.children.length<needed)addTeam();
    setTimeout(()=>{const selectedNames=new Set(selected.map(p=>p.player_name.toLocaleLowerCase())),rosterNames=new Set(players.map(p=>p.player_name.toLocaleLowerCase())),inputs=[...document.querySelectorAll('.player-name-input')];inputs.forEach(input=>{const key=input.value.trim().toLocaleLowerCase();if(key&&rosterNames.has(key)&&!selectedNames.has(key))input.value='' });const assigned=new Set(inputs.map(input=>input.value.trim().toLocaleLowerCase()).filter(Boolean));selected.forEach(p=>{const key=p.player_name.toLocaleLowerCase();if(assigned.has(key))return;const empty=inputs.find(input=>!input.value.trim());if(empty){empty.value=p.player_name;assigned.add(key)}});renderAttendanceSummary()},0)
  }
  function renderAttendanceSummary(){
    let banner=document.getElementById('attendanceSummary');if(!banner){banner=document.createElement('div');banner.id='attendanceSummary';banner.className='attendance-summary';E.inputs.parentElement.insertBefore(banner,E.inputs)}const count=attendancePlayers().length;banner.innerHTML=`<div><strong>${count} player${count===1?'':'s'} attending</strong><small>Prefilled below — rearrange teammates as needed</small></div><button id="changeAttendance" class="mini-btn">Change</button>`;document.getElementById('changeAttendance').onclick=openAttendanceSelection
  }
  async function openPlayerManager(){if(!season)return show('createSeasonModal');show('playerManagerModal');document.getElementById('playerManagerList').innerHTML='<div class="empty-state">Loading players…</div>';await loadPlayers();renderPlayerManager()}
  function renderPlayerManager(){
    const target=document.getElementById('playerManagerList');if(!target)return;
    const section=(title,rows)=>rows.length?`<div class="player-manager-section-title">${title}</div><div class="player-manager-list">${rows.map(p=>`<div class="player-manager-row ${p.is_active===false?'inactive':''}"><div><strong>${esc(p.player_name)}</strong><small>${p.goals||0} goals · ${p.match_days||0} Match Days</small></div><div class="player-manager-actions"><button data-action="rename" data-id="${p.player_id}" data-name="${esc(p.player_name)}">Rename</button><button class="${p.is_active===false?'restore-player':''}" data-action="${p.is_active===false?'restore':'deactivate'}" data-id="${p.player_id}">${p.is_active===false?'Restore':'Inactive'}</button></div></div>`).join('')}</div>`:'';
    const active=players.filter(p=>p.is_active!==false),inactive=players.filter(p=>p.is_active===false);target.innerHTML=section(`ACTIVE · ${active.length}`,active)+section(`INACTIVE · ${inactive.length}`,inactive)||'<div class="empty-state">No players added yet.</div>';
    target.querySelectorAll('button[data-action]').forEach(button=>button.onclick=()=>handleManagedPlayer(button));
  }
  async function runPlayerAction(action,id,name){
    try{await rpc('manage_season_player',{p_season_id:season.id,p_access_token:season.token,p_action:action,p_player_id:id||null,p_player_name:name||null});await loadPlayers();renderPlayerManager();toast(action==='deactivate'?'Player marked inactive':action==='restore'?'Player restored':action==='rename'?'Player renamed':'Player added');return true}catch(error){toast(String(error?.message||'Could not update player').includes('duplicate')?'That player already exists':'Could not update player');return false}
  }
  async function addManagedPlayer(){const input=document.getElementById('newSeasonPlayer'),name=input.value.trim();if(!name)return toast('Enter a player name');const button=document.getElementById('addSeasonPlayer');button.disabled=true;if(await runPlayerAction('add',null,name))input.value='';button.disabled=false}
  async function handleManagedPlayer(button){
    const action=button.dataset.action,id=button.dataset.id,current=button.dataset.name;
    if(action==='rename'){const name=prompt('Enter the player’s new name',current);if(name===null||!name.trim()||name.trim()===current)return;button.disabled=true;await runPlayerAction('rename',id,name.trim());button.disabled=false;return}
    if(action==='deactivate'&&!confirm('Mark this player inactive? Their statistics and Match Day history will remain saved.'))return;
    button.disabled=true;await runPlayerAction(action,id,null);button.disabled=false;
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
    target.innerHTML=`<div class="archive-detail-head"><button id="backArchive" class="mini-btn">← Match Days</button><button id="closeArchive" class="icon-btn">×</button></div><div class="eyebrow">${row.matchday_status==='active'?'IN PROGRESS':'COMPLETED'}</div><h3>${matchdayDate(row.played_on)}</h3><button id="shareMatchDay" class="secondary-btn share-results-btn">Share Match Day <span>↗</span></button><div class="archive-stats"><div><span>PLAYERS</span><strong>${players.length}</strong></div><div><span>MATCHES</span><strong>${history.length}</strong></div><div><span>TOP SCORER</span><strong>${esc(top.label)}</strong><small>${top.goals||0} goals</small></div></div><div class="archive-section"><h4>Players</h4><div class="archive-players">${players.map(p=>`<span>${esc(p.name)}</span>`).join('')||'<small>No roster saved</small>'}</div></div><div class="archive-section"><h4>Team standings</h4>${teams.length?`<table class="leader-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td class="rank">${i+1}</td><td><strong>${esc(t.name)}</strong><small class="archive-team-players">${(t.players||[]).map(esc).join(' · ')}</small></td><td>${t.games||0}</td><td>${t.wins||0}</td><td>${t.draws||0}</td><td>${t.losses||0}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No team data saved.</div>'}</div><div class="archive-section"><h4>Results</h4><div class="archive-results">${history.map((h,i)=>h.type==='win'?`<div><span>${i+1}</span><p><strong>${esc(h.winner)} beat ${esc(h.loser)}</strong><small>${h.scorer?`${esc(h.scorer)} scored`: 'Unassigned goal'} · ${esc(h.time)}</small></p></div>`:`<div><span>${i+1}</span><p><strong>${esc(h.a)} vs ${esc(h.b)} · Draw</strong><small>0–0 after ${esc(h.time)}</small></p></div>`).join('')||'<div class="empty-state">No completed matches.</div>'}</div></div>`;
    document.getElementById('backArchive').onclick=renderArchive;document.getElementById('closeArchive').onclick=()=>hide('matchdayArchiveModal');document.getElementById('shareMatchDay').onclick=()=>shareMatchDay(row);
  }
  const fitText=(ctx,text,max)=>{text=String(text??'');if(ctx.measureText(text).width<=max)return text;while(text.length&&ctx.measureText(`${text}…`).width>max)text=text.slice(0,-1);return `${text}…`};
  function shareCardBase(height,kicker,title){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#07120d';ctx.fillRect(0,0,1080,height);
    const glow=ctx.createRadialGradient(920,140,0,920,140,520);glow.addColorStop(0,'rgba(184,255,79,.16)');glow.addColorStop(1,'rgba(184,255,79,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,620);
    ctx.fillStyle='#b8ff4f';ctx.beginPath();ctx.roundRect(64,64,92,92,25);ctx.fill();ctx.fillStyle='#07120d';ctx.font='900 58px Arial';ctx.fillText('P',91,130);ctx.fillStyle='#ffffff';ctx.font='900 37px Arial';ctx.fillText('PLAYNEXT',184,112);ctx.fillStyle='#8d9a94';ctx.font='24px Arial';ctx.fillText('No arguments. Just next.',184,145);
    ctx.fillStyle='#b8ff4f';ctx.font='900 22px Arial';ctx.fillText(kicker.toUpperCase(),64,240);ctx.fillStyle='#ffffff';ctx.font='900 58px Arial';ctx.fillText(fitText(ctx,title,950),64,312);return {canvas,ctx};
  }
  function finishShareCard(ctx,height){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(64,height-105);ctx.lineTo(1016,height-105);ctx.stroke();ctx.fillStyle='#8d9a94';ctx.font='22px Arial';ctx.fillText('myplaynext.vercel.app',64,height-55);ctx.fillStyle='#b8ff4f';ctx.font='900 20px Arial';ctx.textAlign='right';ctx.fillText('PLAYNEXT',1016,height-55);ctx.textAlign='left'}
  const canvasToBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create image')),'image/png'));
  async function shareImage(canvas,fileName,title,text){
    try{const blob=await canvasToBlob(canvas),file=new File([blob],fileName,{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title,text,files:[file]});return}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Result card downloaded')}catch(error){if(error?.name!=='AbortError')toast('Could not share result card')}
  }
  async function shareSeasonTable(){
    if(!leaderboardRows.length)return toast('No season results to share');const rows=leaderboardRows.slice(0,25),height=Math.max(1350,600+rows.length*72),title=state.seasonName||season?.name||'Season goals',{canvas,ctx}=shareCardBase(height,'Season leaderboard',title);let y=395;
    ctx.fillStyle='#8d9a94';ctx.font='900 20px Arial';ctx.fillText('#',72,y);ctx.fillText('PLAYER',135,y);ctx.textAlign='center';ctx.fillText('MATCH DAYS',790,y);ctx.fillText('GOALS',962,y);ctx.textAlign='left';y+=34;
    rows.forEach((p,i)=>{const rank=rows.findIndex(x=>x.goals===p.goals)+1;ctx.strokeStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.moveTo(64,y+42);ctx.lineTo(1016,y+42);ctx.stroke();ctx.fillStyle='#b8ff4f';ctx.font='900 26px Arial';ctx.fillText(String(rank).padStart(2,'0'),68,y+5);ctx.fillStyle='#ffffff';ctx.font='700 29px Arial';ctx.fillText(fitText(ctx,p.player_name,520),135,y+5);ctx.textAlign='center';ctx.fillStyle='#c3ccc7';ctx.font='27px Arial';ctx.fillText(String(p.match_days||0),790,y+5);ctx.fillStyle='#b8ff4f';ctx.font='900 31px Arial';ctx.fillText(String(p.goals||0),962,y+5);ctx.textAlign='left';y+=72});finishShareCard(ctx,height);shareImage(canvas,'playnext-season-table.png',title,'PlayNext season leaderboard')
  }
  async function shareMatchDay(row){
    const s=row.snapshot||{},teams=[...(s.teams||[])].sort((a,b)=>(b.wins||0)-(a.wins||0)||(b.draws||0)-(a.draws||0)),history=s.history||[],top=scorerSummary(history),height=Math.max(1350,900+teams.length*70),title=matchdayDate(row.played_on),{canvas,ctx}=shareCardBase(height,'Match Day recap',title);
    ctx.fillStyle='#8d9a94';ctx.font='900 20px Arial';ctx.fillText('PLAYERS',64,390);ctx.fillText('MATCHES',330,390);ctx.fillText('TOP SCORER',596,390);ctx.fillStyle='#ffffff';ctx.font='900 52px Arial';ctx.fillText(String((s.players||[]).length),64,455);ctx.fillText(String(history.length),330,455);ctx.fillStyle='#b8ff4f';ctx.font='900 34px Arial';ctx.fillText(fitText(ctx,top.label,410),596,445);ctx.fillStyle='#8d9a94';ctx.font='22px Arial';ctx.fillText(`${top.goals||0} goal${top.goals===1?'':'s'}`,596,478);
    let y=585;ctx.fillStyle='#b8ff4f';ctx.font='900 22px Arial';ctx.fillText('TEAM STANDINGS',64,y);y+=65;ctx.fillStyle='#8d9a94';ctx.font='900 19px Arial';ctx.fillText('#',72,y);ctx.fillText('TEAM',135,y);ctx.textAlign='center';['GP','W','D','L'].forEach((h,i)=>ctx.fillText(h,765+i*78,y));ctx.textAlign='left';y+=32;
    teams.forEach((t,i)=>{ctx.strokeStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.moveTo(64,y+39);ctx.lineTo(1016,y+39);ctx.stroke();ctx.fillStyle='#b8ff4f';ctx.font='900 25px Arial';ctx.fillText(String(i+1).padStart(2,'0'),68,y+3);ctx.fillStyle='#ffffff';ctx.font='700 28px Arial';ctx.fillText(fitText(ctx,t.name,500),135,y+3);ctx.textAlign='center';ctx.fillStyle='#c3ccc7';ctx.font='25px Arial';[t.games||0,t.wins||0,t.draws||0,t.losses||0].forEach((v,j)=>ctx.fillText(String(v),765+j*78,y+3));ctx.textAlign='left';y+=70});finishShareCard(ctx,height);shareImage(canvas,'playnext-match-day.png',`PlayNext · ${title}`,'PlayNext Match Day recap')
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
      const matches=players.filter(p=>{const name=String(p.player_name||'');return p.is_active!==false&&(!attendanceInitialized||attendanceIds.has(p.player_id))&&name.toLocaleLowerCase().includes(query)&&!used.has(name.toLocaleLowerCase())}).slice(0,7);
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
  window.PlayNextSeason={recordGoal,undoGoal,openLeaderboard,syncPendingGoals};inject();setupPlayerManager();setupAttendanceSelection();setupReturningPlayerSuggestions();restore().then(()=>{renderSeasonCard();addLiveButton()});
})();
