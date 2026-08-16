(()=>{
  let selectedScorerId=null,scoringTeamIndex=null,editingTeamId=null;
  const uid=()=>crypto.randomUUID();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const byId=id=>(state.teams||[]).find(t=>t.id===id);
  const playerById=id=>(state.players||[]).find(p=>p.id===id);
  const teamPlayers=team=>(team?.playerIds||[]).map(playerById).filter(Boolean);
  const points=t=>(t.wins||0)*3+(t.draws||0);
  const goalDiff=t=>(t.goalsFor||0)-(t.goalsAgainst||0);

  function ensureState(){
    if(!Array.isArray(state.players))state.players=[];
    (state.teams||[]).forEach(team=>{
      if(typeof team.active!=='boolean')team.active=true;
      if(typeof team.losses!=='number')team.losses=0;
      if(typeof team.goalsFor!=='number')team.goalsFor=team.wins||0;
      if(typeof team.goalsAgainst!=='number')team.goalsAgainst=team.losses||0;
      if(!Array.isArray(team.playerIds))team.playerIds=[];
      (Array.isArray(team.players)?team.players:[]).forEach(entry=>{
        const name=typeof entry==='string'?entry:entry?.name;if(!name)return;
        let player=entry?.id?playerById(entry.id):null;
        if(!player)player=state.players.find(p=>p.currentTeamId===team.id&&p.name.toLowerCase()===name.toLowerCase());
        if(!player){player={id:uid(),name,games:0,goals:0,wins:0,draws:0,losses:0,currentTeamId:team.id};state.players.push(player)}
        player.currentTeamId=team.id;if(!team.playerIds.includes(player.id))team.playerIds.push(player.id);
      });
      team.players=teamPlayers(team).map(p=>p.name);
    });
  }

  function injectUI(){
    if($('leaderboardBtn'))return;
    document.querySelector('.action-row')?.insertAdjacentHTML('afterend','<div class="competition-actions"><button id="leaderboardBtn" class="secondary-btn">Leaderboard</button><button id="manageTeamsBtn" class="secondary-btn">Manage teams & players</button></div>');
    document.body.insertAdjacentHTML('beforeend',`
      <div id="scorerModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="eyebrow">GOAL SCORED</div><h3 id="scorerTitle">Who scored?</h3><p>Select the goalscorer, or leave the goal unassigned.</p><div id="scorerList" class="scorer-list"></div><button id="cancelScorer" class="secondary-btn full-btn">Cancel</button></div></div>
      <div id="leaderboardModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="sheet-head"><div><div class="eyebrow">LIVE STANDINGS</div><h3>Leaderboard</h3></div><button id="closeLeaderboard" class="icon-btn">×</button></div><div class="leader-tabs"><button class="leader-tab active" data-board="teams">Teams</button><button class="leader-tab" data-board="players">Players</button></div><div id="leaderboardContent"></div></div></div>
      <div id="manageTeamsModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="sheet-head"><div><div class="eyebrow">HOST CONTROLS</div><h3>Teams & players</h3></div><button id="closeManageTeams" class="icon-btn">×</button></div><p>Remove teams from rotation without deleting their results, or edit their players.</p><div id="manageTeamList" class="manage-team-list"></div></div></div>
      <div id="editPlayersModal" class="modal-backdrop hidden"><div class="modal-card competition-card"><div class="eyebrow">LIVE ROSTER</div><h3 id="editPlayersTitle">Edit players</h3><p>Changes apply to future matches. Existing player statistics stay logged.</p><div id="editPlayerList" class="player-editor-list"></div><button id="addPlayerField" class="secondary-btn full-btn">+ Add player</button><p class="editor-note">Player names must be unique in this session.</p><div class="modal-actions"><button id="cancelEditPlayers" class="secondary-btn">Cancel</button><button id="savePlayers" class="primary-btn compact">Save players</button></div></div></div>`);
    $('leaderboardBtn').onclick=()=>openLeaderboard('teams');$('manageTeamsBtn').onclick=openManageTeams;
    $('closeLeaderboard').onclick=()=>$('leaderboardModal').classList.add('hidden');$('closeManageTeams').onclick=()=>$('manageTeamsModal').classList.add('hidden');
    $('cancelScorer').onclick=()=>{scoringTeamIndex=null;$('scorerModal').classList.add('hidden');if(state.remaining>0&&!state.running)startClock()};
    $('cancelEditPlayers').onclick=()=>$('editPlayersModal').classList.add('hidden');$('addPlayerField').onclick=()=>addPlayerField('');$('savePlayers').onclick=savePlayers;
    document.querySelectorAll('.leader-tab').forEach(b=>b.onclick=()=>openLeaderboard(b.dataset.board));
  }

  function openScorer(index){
    if(role!=='host'||processing)return;if(!state.running)return toast('Start the match first');ensureState();
    scoringTeamIndex=index;const team=state.playing[index];$('scorerTitle').textContent=`Who scored for ${team.name}?`;
    $('scorerList').innerHTML=teamPlayers(team).map(p=>`<button class="scorer-option" data-player="${p.id}"><span>${esc(p.name)}</span><small>${p.goals||0} goals</small></button>`).join('')+'<button class="scorer-option" data-player=""><span>Unassigned goal</span><small>Team result only</small></button>';
    $('scorerList').querySelectorAll('button').forEach(b=>b.onclick=()=>chooseScorer(b.dataset.player||null));pauseClock();$('scorerModal').classList.remove('hidden');
  }
  function chooseScorer(id){
    if(processing||scoringTeamIndex===null)return;
    selectedScorerId=id;$('scorerModal').classList.add('hidden');const index=scoringTeamIndex;scoringTeamIndex=null;
    processing=true;setControlsDisabled(true);
    try{goal(index)}finally{setTimeout(()=>{processing=false;setControlsDisabled(false);render()},1200)}
  }

  function openLeaderboard(board){
    ensureState();document.querySelectorAll('.leader-tab').forEach(x=>x.classList.toggle('active',x.dataset.board===board));const target=$('leaderboardContent');
    if(board==='players'){
      const rows=[...state.players].sort((a,b)=>(b.goals||0)-(a.goals||0)||a.name.localeCompare(b.name));
      target.innerHTML=rows.length?`<table class="leader-table"><thead><tr><th>#</th><th>Player</th><th>Goals</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="rank">${rows.findIndex(x=>(x.goals||0)===(p.goals||0))+1}</td><td class="team-cell"><strong>${esc(p.name)}</strong><small>${esc(byId(p.currentTeamId)?.name||'Not currently assigned')}</small></td><td><strong>${p.goals||0}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">No player records yet.</div>';
    }else{
      const rows=[...state.teams].sort((a,b)=>points(b)-points(a)||(b.wins||0)-(a.wins||0)||goalDiff(b)-goalDiff(a)||a.name.localeCompare(b.name));
      target.innerHTML=`<table class="leader-table"><thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>PTS</th></tr></thead><tbody>${rows.map((t,i)=>`<tr><td class="rank">${i+1}</td><td class="team-cell"><strong>${esc(t.name)}${t.active?'':' <span class="inactive-badge">OUT</span>'}</strong><small>Goal diff ${goalDiff(t)>=0?'+':''}${goalDiff(t)}</small></td><td>${t.games||0}</td><td>${t.wins||0}</td><td>${t.draws||0}</td><td>${t.losses||0}</td><td><strong>${points(t)}</strong></td></tr>`).join('')}</tbody></table>`;
    }
    $('leaderboardModal').classList.remove('hidden');
  }

  function openManageTeams(){
    if(role!=='host')return;ensureState();
    $('manageTeamList').innerHTML=state.teams.map(t=>`<div class="manage-team-row ${t.active?'':'inactive-team'}"><div><strong>${esc(t.name)}${t.active?'':' <span class="inactive-badge">OUT OF ROTATION</span>'}</strong><small>${teamPlayers(t).map(p=>esc(p.name)).join(' · ')||'No players listed'} · ${t.wins||0}W ${t.draws||0}D ${t.losses||0}L</small></div><div class="manage-team-buttons"><button class="mini-btn edit-roster" data-team="${t.id}">Edit players</button><button class="mini-btn ${t.active?'danger':'restore'} toggle-team" data-team="${t.id}">${t.active?'Remove':'Restore'}</button></div></div>`).join('');
    $('manageTeamList').querySelectorAll('.edit-roster').forEach(b=>b.onclick=()=>openPlayerEditor(b.dataset.team));$('manageTeamList').querySelectorAll('.toggle-team').forEach(b=>b.onclick=()=>toggleTeam(b.dataset.team));$('manageTeamsModal').classList.remove('hidden');
  }
  async function toggleTeam(id){
    const team=byId(id);if(!team)return;
    if(team.active){
      const i=state.playing.findIndex(t=>t.id===id);
      if(i>=0){if(!state.queue.length)return toast('No waiting team can replace them');pauseClock(false);state.playing[i]=state.queue.shift();state.remaining=state.duration;state.running=false;state.endsAt=null}else state.queue=state.queue.filter(t=>t.id!==id);
      team.active=false;state.newTeamPriority=(state.newTeamPriority||[]).filter(x=>x!==id);toast(`${team.name} removed from rotation`);
    }else{team.active=true;if(!state.playing.some(t=>t.id===id)&&!state.queue.some(t=>t.id===id))state.queue.push(team);toast(`${team.name} restored to the queue`)}
    render();await push();openManageTeams();
  }

  function openPlayerEditor(id){
    const team=byId(id);if(!team)return;editingTeamId=id;$('editPlayersTitle').textContent=`Edit ${team.name} players`;$('editPlayerList').innerHTML='';teamPlayers(team).forEach(p=>addPlayerField(p.name,p.id));if(!team.playerIds.length)addPlayerField('');$('manageTeamsModal').classList.add('hidden');$('editPlayersModal').classList.remove('hidden');
  }
  function addPlayerField(name,id=''){
    const row=document.createElement('div');row.className='edit-player-row';row.dataset.playerId=id;row.innerHTML=`<input maxlength="24" value="${esc(name)}" placeholder="Player name"><button class="remove-player-btn" aria-label="Remove player">×</button>`;row.querySelector('button').onclick=()=>row.remove();$('editPlayerList').appendChild(row);
  }
  async function savePlayers(){
    const team=byId(editingTeamId);if(!team)return;const entries=[...document.querySelectorAll('#editPlayerList .edit-player-row')].map(r=>({id:r.dataset.playerId,name:r.querySelector('input').value.trim()})).filter(x=>x.name);
    if(new Set(entries.map(x=>x.name.toLowerCase())).size!==entries.length)return toast('Player names must be unique');
    const otherNames=new Set(state.players.filter(p=>p.currentTeamId&&p.currentTeamId!==team.id).map(p=>p.name.toLowerCase()));if(entries.some(x=>otherNames.has(x.name.toLowerCase())))return toast('That player is already on another team');
    const oldIds=[...team.playerIds],next=[];entries.forEach(entry=>{let p=entry.id?playerById(entry.id):null;if(!p)p=state.players.find(x=>!x.currentTeamId&&x.name.toLowerCase()===entry.name.toLowerCase());if(!p){p={id:uid(),name:entry.name,games:0,goals:0,wins:0,draws:0,losses:0,currentTeamId:team.id};state.players.push(p)}p.name=entry.name;p.currentTeamId=team.id;next.push(p.id)});oldIds.filter(id=>!next.includes(id)).forEach(id=>{const p=playerById(id);if(p)p.currentTeamId=null});team.playerIds=next;team.players=teamPlayers(team).map(p=>p.name);$('editPlayersModal').classList.add('hidden');render();await push();toast(`${team.name} players updated`);
  }

  snap=function(){ensureState();state.snapshots.push(JSON.stringify({teams:state.teams,queue:state.queue,playing:state.playing,history:state.history,players:state.players,newTeamPriority:state.newTeamPriority||[]}));if(state.snapshots.length>20)state.snapshots.shift()};
  const oldGoal=goal;goal=function(index){
    ensureState();const winner=state.playing[index],loser=state.playing[1-index],scorer=selectedScorerId?playerById(selectedScorerId):null,eventId=scorer?uid():null;oldGoal(index);loser.losses=(loser.losses||0)+1;winner.goalsFor=(winner.goalsFor||0)+1;loser.goalsAgainst=(loser.goalsAgainst||0)+1;if(scorer)scorer.goals++;if(state.history[0]?.type==='win'){state.history[0].scorerId=scorer?.id||null;state.history[0].scorer=scorer?.name||null;state.history[0].seasonEventId=eventId}if(scorer&&eventId)window.PlayNextSeason?.recordGoal(scorer.name,eventId);selectedScorerId=null;render();push();
  };
  const oldRender=render;render=function(){ensureState();oldRender()};
  const oldHistoryClick=E.history.onclick;E.history.onclick=()=>{oldHistoryClick();E.historyList.querySelectorAll('.history-item').forEach((row,i)=>{const h=state.history[i];if(h?.type==='win'&&h.scorer){const detail=row.querySelector('span');detail.textContent=`${h.scorer} scored at ${h.time}`}})};
  const oldUndoClick=E.undo.onclick;E.undo.onclick=()=>{const eventId=state.history?.[0]?.seasonEventId;oldUndoClick();if(eventId)window.PlayNextSeason?.undoGoal(eventId)};

  injectUI();ensureState();E.aGoal.onclick=()=>openScorer(0);E.bGoal.onclick=()=>openScorer(1);window.dispatchEvent(new Event('playnext:competition-ready'));
})();
