(()=>{
  const maxLiveTeams=20;
  let selectedColor=null;
  function cleanPriority(){
    if(!Array.isArray(state.newTeamPriority))state.newTeamPriority=[];
    const queued=new Set((state.queue||[]).map(t=>t.id));
    state.newTeamPriority=state.newTeamPriority.filter(id=>queued.has(id));
  }
  function livePlayerCount(){return Math.max(1,+(E.players?.value||3))}
  function buildLivePlayerFields(){
    const box=document.getElementById('liveTeamPlayers');if(!box)return;box.innerHTML='';
    for(let i=0;i<livePlayerCount();i++){const input=document.createElement('input');input.className='player-name-input live-player-input';input.maxLength=24;input.placeholder=`Player ${i+1}`;box.appendChild(input)}
  }
  function injectUI(){
    if(document.getElementById('liveAddTeamBtn'))return;
    const queuePanel=document.querySelector('.queue-panel');if(!queuePanel)return;
    const wrap=document.createElement('div');wrap.className='live-team-add';wrap.innerHTML='<button id="liveAddTeamBtn" class="secondary-btn">+ Add new team to play next</button>';queuePanel.appendChild(wrap);
    document.body.insertAdjacentHTML('beforeend',`<div id="liveTeamModal" class="modal-backdrop hidden"><div class="modal-card add-team-card"><div class="eyebrow">LIVE SESSION</div><h3>Add a new team</h3><p>The team will be placed ahead of the regular waiting queue. Existing newly added teams keep their order.</p><label class="live-team-field"><span>TEAM NAME</span><input id="liveTeamName" class="live-team-input" maxlength="32" placeholder="e.g. Team Black"></label><div class="live-team-field"><span>PLAYERS</span><div id="liveTeamPlayers" class="live-player-grid"></div></div><div class="live-team-field"><span>TEAM COLOUR</span><div id="liveTeamColors" class="live-colors"></div></div><p class="live-team-note">The current match and timer will not be interrupted.</p><div class="modal-actions"><button id="cancelLiveTeam" class="secondary-btn">Cancel</button><button id="confirmLiveTeam" class="primary-btn compact">Add next</button></div></div></div>`);
    const palette=document.getElementById('liveTeamColors');
    colors.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='live-color-btn'+(i===0?' selected':'');b.style.background=c;b.dataset.color=c;b.onclick=()=>{selectedColor=c;palette.querySelectorAll('.live-color-btn').forEach(x=>x.classList.toggle('selected',x===b))};palette.appendChild(b)});
    selectedColor=colors[0];buildLivePlayerFields();
    document.getElementById('liveAddTeamBtn').onclick=openModal;document.getElementById('cancelLiveTeam').onclick=closeModal;document.getElementById('confirmLiveTeam').onclick=addLiveTeam;
    document.getElementById('liveTeamName').onkeydown=e=>{if(e.key==='Enter')addLiveTeam()};
  }
  function openModal(){
    if(role!=='host')return;if((state.teams||[]).length>=maxLiveTeams)return toast(`Maximum ${maxLiveTeams} teams in a session`);
    const input=document.getElementById('liveTeamName');input.value='';buildLivePlayerFields();
    const used=new Set((state.teams||[]).map(t=>t.color));selectedColor=colors.find(c=>!used.has(c))||colors[(state.teams||[]).length%colors.length];
    document.querySelectorAll('.live-color-btn').forEach(b=>b.classList.toggle('selected',b.dataset.color===selectedColor));document.getElementById('liveTeamModal').classList.remove('hidden');setTimeout(()=>input.focus(),50);
  }
  function closeModal(){document.getElementById('liveTeamModal')?.classList.add('hidden')}
  async function addLiveTeam(){
    if(role!=='host')return;const input=document.getElementById('liveTeamName');const name=input.value.trim();if(!name)return toast('Enter a team name');
    if((state.teams||[]).some(t=>String(t.name).toLowerCase()===name.toLowerCase()))return toast('That team name already exists');
    if((state.teams||[]).length>=maxLiveTeams)return toast(`Maximum ${maxLiveTeams} teams in a session`);
    const players=[...document.querySelectorAll('#liveTeamPlayers .live-player-input')].map(x=>x.value.trim()).filter(Boolean);
    cleanPriority();const prioritySet=new Set(state.newTeamPriority);let insertAt=0;while(insertAt<state.queue.length&&prioritySet.has(state.queue[insertAt].id))insertAt++;
    const team={id:crypto.randomUUID(),name,color:selectedColor||colors[state.teams.length%colors.length],players,games:0,wins:0,draws:0,streak:0,bestStreak:0,joinedLive:true};
    state.teams.push(team);state.queue.splice(insertAt,0,team);state.newTeamPriority.push(team.id);closeModal();render();await push();toast(`${name} added — playing next`);
  }
  const originalRender=render;
  render=function(){
    originalRender();cleanPriority();
    document.querySelectorAll('.queue-item').forEach((row,i)=>{const team=state.queue[i];if(team&&state.newTeamPriority?.includes(team.id)){const nameEl=row.querySelector('.queue-name');if(nameEl&&!nameEl.querySelector('.new-team-badge'))nameEl.insertAdjacentHTML('beforeend',' <span class="new-team-badge">NEW</span>')}});
  };
  injectUI();
})();