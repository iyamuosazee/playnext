(()=>{
  const maxLiveTeams=20;
  let selectedColor=null,activePlayerInput=null,leaguePlayers=[];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function cleanPriority(){if(!Array.isArray(state.newTeamPriority))state.newTeamPriority=[];const queued=new Set((state.queue||[]).map(t=>t.id));state.newTeamPriority=state.newTeamPriority.filter(id=>queued.has(id))}
  function livePlayerCount(){return Math.max(1,+(E.players?.value||3))}
  function seasonAccess(){try{return JSON.parse(localStorage.getItem('playnext-season')||'null')}catch{return null}}
  async function fetchPlayers(){
    const saved=seasonAccess();
    if(saved?.id&&saved?.token){try{const {data,error}=await sb.rpc('get_season_players',{p_season_id:saved.id,p_access_token:saved.token});if(!error&&Array.isArray(data))return data.filter(p=>p.is_active!==false)}catch{}}
    return (state.players||[]).map(p=>({player_id:p.seasonPlayerId||p.id,player_name:p.name,is_active:true}));
  }
  function buildLivePlayerFields(){
    const box=document.getElementById('liveTeamPlayers');if(!box)return;box.innerHTML='';
    for(let i=0;i<livePlayerCount();i++){
      const wrap=document.createElement('div');wrap.className='live-player-picker-field';wrap.innerHTML=`<input class="player-name-input live-player-input" maxlength="24" placeholder="Player ${i+1}" readonly><button type="button" class="live-player-pick-btn" aria-label="Choose Player ${i+1}">⌄</button>`;
      const input=wrap.querySelector('input');wrap.onclick=()=>openPlayerPicker(input);box.appendChild(wrap);
    }
  }
  function injectUI(){
    if(document.getElementById('liveAddTeamBtn'))return;
    const queuePanel=document.querySelector('.queue-panel');if(!queuePanel)return;
    const wrap=document.createElement('div');wrap.className='live-team-add';wrap.innerHTML='<button id="liveAddTeamBtn" class="secondary-btn">+ Add new team to play next</button>';queuePanel.appendChild(wrap);
    document.body.insertAdjacentHTML('beforeend',`<div id="liveTeamModal" class="modal-backdrop hidden"><div class="modal-card add-team-card"><div class="eyebrow">LIVE SESSION</div><h3>Add a new team</h3><p>The team will be placed ahead of the regular waiting queue. Existing newly added teams keep their order.</p><label class="live-team-field"><span>TEAM NAME</span><input id="liveTeamName" class="live-team-input" maxlength="32" placeholder="e.g. Team Black"></label><div class="live-team-field"><span>PLAYERS</span><div id="liveTeamPlayers" class="live-player-grid"></div></div><div class="live-team-field"><span>TEAM COLOUR</span><div id="liveTeamColors" class="live-colors"></div></div><p class="live-team-note">The current match and timer will not be interrupted.</p><div class="modal-actions"><button id="cancelLiveTeam" class="secondary-btn">Cancel</button><button id="confirmLiveTeam" class="primary-btn compact">Add next</button></div></div></div><div id="livePlayerPickerModal" class="modal-backdrop hidden"><div class="modal-card live-player-picker-card"><div class="sheet-head"><div><div class="eyebrow">PLAYERS</div><h3>Choose a player</h3></div><button id="closeLivePlayerPicker" class="icon-btn">×</button></div><input id="livePlayerSearch" class="live-team-input" placeholder="Search existing players"><div id="livePlayerPickerList" class="live-player-picker-list"></div><button id="addNewLivePlayer" class="secondary-btn full-btn">+ Add new player</button></div></div>`);
    const palette=document.getElementById('liveTeamColors');colors.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='live-color-btn'+(i===0?' selected':'');b.style.background=c;b.dataset.color=c;b.onclick=()=>{selectedColor=c;palette.querySelectorAll('.live-color-btn').forEach(x=>x.classList.toggle('selected',x===b))};palette.appendChild(b)});
    selectedColor=colors[0];buildLivePlayerFields();
    document.getElementById('liveAddTeamBtn').onclick=openModal;document.getElementById('cancelLiveTeam').onclick=closeModal;document.getElementById('confirmLiveTeam').onclick=addLiveTeam;document.getElementById('liveTeamName').onkeydown=e=>{if(e.key==='Enter')addLiveTeam()};
    document.getElementById('closeLivePlayerPicker').onclick=closePlayerPicker;document.getElementById('livePlayerSearch').oninput=e=>renderPlayerPicker(e.target.value);document.getElementById('addNewLivePlayer').onclick=addNewPlayer;
  }
  async function openPlayerPicker(input){
    activePlayerInput=input;document.getElementById('livePlayerSearch').value='';document.getElementById('livePlayerPickerList').innerHTML='<div class="empty-state">Loading players…</div>';document.getElementById('livePlayerPickerModal').classList.remove('hidden');leaguePlayers=await fetchPlayers();renderPlayerPicker('');setTimeout(()=>document.getElementById('livePlayerSearch')?.focus(),30);
  }
  function closePlayerPicker(){document.getElementById('livePlayerPickerModal')?.classList.add('hidden');activePlayerInput=null}
  function assignedNames(){return new Set([...document.querySelectorAll('#liveTeamPlayers .live-player-input')].filter(x=>x!==activePlayerInput).map(x=>x.value.trim().toLocaleLowerCase()).filter(Boolean))}
  function currentTeamFor(name){const n=String(name).toLocaleLowerCase();return (state.teams||[]).find(t=>(t.players||[]).some(p=>String(typeof p==='string'?p:p?.name||'').toLocaleLowerCase()===n))}
  function renderPlayerPicker(q){
    const query=String(q||'').trim().toLocaleLowerCase(),used=assignedNames();const rows=leaguePlayers.filter(p=>String(p.player_name||p.name||'').toLocaleLowerCase().includes(query)).sort((a,b)=>String(a.player_name||a.name).localeCompare(String(b.player_name||b.name)));
    const list=document.getElementById('livePlayerPickerList');list.innerHTML=rows.length?rows.map(p=>{const name=String(p.player_name||p.name||'').trim(),sameTeam=used.has(name.toLocaleLowerCase()),team=currentTeamFor(name);return `<button class="scorer-option live-player-option" data-player-name="${esc(name)}" ${sameTeam?'disabled':''}><span>${esc(name)}</span><small>${sameTeam?'Already selected for this team':team?`Currently on ${esc(team.name)} · tap to use as substitute`:'Available player'}</small></button>`}).join(''):'<div class="empty-state">No players found.</div>';
    list.querySelectorAll('[data-player-name]').forEach(b=>b.onclick=()=>selectPlayer(b.dataset.playerName));
  }
  function selectPlayer(name){if(!activePlayerInput)return;activePlayerInput.value=name;document.getElementById('livePlayerPickerModal').classList.add('hidden');activePlayerInput=null}
  async function addNewPlayer(){
    const input=document.getElementById('livePlayerSearch'),name=input.value.trim();if(!name)return toast('Type the new player’s name first');if(leaguePlayers.some(p=>String(p.player_name||p.name||'').toLocaleLowerCase()===name.toLocaleLowerCase()))return toast('That player already exists — select them above');
    const saved=seasonAccess();
    if(saved?.id&&saved?.token){try{const {error}=await sb.rpc('manage_season_player',{p_season_id:saved.id,p_access_token:saved.token,p_action:'add',p_player_name:name,p_player_id:null});if(error)throw error}catch(error){console.error('Could not add season player',error);return toast('Could not add player to Players data')}}
    state.players=Array.isArray(state.players)?state.players:[];let local=state.players.find(p=>String(p.name).toLocaleLowerCase()===name.toLocaleLowerCase());if(!local){local={id:crypto.randomUUID(),name,games:0,goals:0,wins:0,draws:0,losses:0,currentTeamId:null};state.players.push(local)}
    leaguePlayers.push({player_id:local.id,player_name:name,is_active:true});selectPlayer(name);toast(`${name} added to Players`);
  }
  function openModal(){if(role!=='host')return;if((state.teams||[]).length>=maxLiveTeams)return toast(`Maximum ${maxLiveTeams} teams in a session`);const input=document.getElementById('liveTeamName');input.value='';buildLivePlayerFields();const used=new Set((state.teams||[]).map(t=>t.color));selectedColor=colors.find(c=>!used.has(c))||colors[(state.teams||[]).length%colors.length];document.querySelectorAll('.live-color-btn').forEach(b=>b.classList.toggle('selected',b.dataset.color===selectedColor));document.getElementById('liveTeamModal').classList.remove('hidden');setTimeout(()=>input.focus(),50)}
  function closeModal(){document.getElementById('liveTeamModal')?.classList.add('hidden')}
  async function addLiveTeam(){
    if(role!=='host')return;const input=document.getElementById('liveTeamName'),name=input.value.trim();if(!name)return toast('Enter a team name');if((state.teams||[]).some(t=>String(t.name).toLowerCase()===name.toLowerCase()))return toast('That team name already exists');if((state.teams||[]).length>=maxLiveTeams)return toast(`Maximum ${maxLiveTeams} teams in a session`);
    const players=[...document.querySelectorAll('#liveTeamPlayers .live-player-input')].map(x=>x.value.trim()).filter(Boolean);if(new Set(players.map(x=>x.toLocaleLowerCase())).size!==players.length)return toast('Choose each player only once');
    cleanPriority();const prioritySet=new Set(state.newTeamPriority),teamId=crypto.randomUUID();let insertAt=0;while(insertAt<state.queue.length&&prioritySet.has(state.queue[insertAt].id))insertAt++;
    const team={id:teamId,name,color:selectedColor||colors[state.teams.length%colors.length],players,games:0,wins:0,draws:0,streak:0,bestStreak:0,joinedLive:true};
    state.players=Array.isArray(state.players)?state.players:[];team.playerIds=[];players.forEach(playerName=>{let p=state.players.find(x=>String(x.name).toLocaleLowerCase()===playerName.toLocaleLowerCase());if(!p){p={id:crypto.randomUUID(),name:playerName,games:0,goals:0,wins:0,draws:0,losses:0,currentTeamId:teamId};state.players.push(p)}if(!p.currentTeamId)p.currentTeamId=teamId;team.playerIds.push(p.id)});
    state.teams.push(team);state.queue.splice(insertAt,0,team);state.newTeamPriority.push(team.id);closeModal();render();await push();toast(`${name} added — playing next`);
  }
  const originalRender=render;render=function(){originalRender();cleanPriority();document.querySelectorAll('.queue-item').forEach((row,i)=>{const team=state.queue[i];if(team&&state.newTeamPriority?.includes(team.id)){const nameEl=row.querySelector('.queue-name');if(nameEl&&!nameEl.querySelector('.new-team-badge'))nameEl.insertAdjacentHTML('beforeend',' <span class="new-team-badge">NEW</span>')}})};
  injectUI();
})();