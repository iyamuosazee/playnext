(()=>{
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const playerById=id=>(state.players||[]).find(p=>p.id===id);
  const teamPlayers=team=>(team?.playerIds||[]).map(playerById).filter(Boolean);
  let scoringIndex=null,leaguePlayers=[];

  function seasonAccess(){try{return JSON.parse(localStorage.getItem('playnext-season')||'null')}catch{return null}}
  async function getLeaguePlayers(){
    const saved=seasonAccess();
    if(!saved?.id||!saved?.token)return [];
    const {data,error}=await sb.rpc('get_season_players',{p_season_id:saved.id,p_access_token:saved.token});
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }
  function ensureSessionPlayer(row){
    const name=String(row.player_name||row.name||'').trim();
    if(!name)return null;
    state.players=Array.isArray(state.players)?state.players:[];
    let player=state.players.find(p=>String(p.name).toLocaleLowerCase()===name.toLocaleLowerCase());
    if(!player){player={id:`league-${row.player_id||crypto.randomUUID()}`,name,games:0,goals:Number(row.goals)||0,wins:0,draws:0,losses:0,currentTeamId:null,seasonPlayerId:row.player_id||null};state.players.push(player)}
    return player;
  }
  function finishGoal(player){
    if(scoringIndex===null||processing)return;
    const index=scoringIndex;scoringIndex=null;$('scorerModal')?.classList.add('hidden');processing=true;setControlsDisabled(true);
    try{
      goal(index);
      if(player){
        player.goals=(player.goals||0)+1;
        const eventId=crypto.randomUUID(),entry=state.history?.[0];
        if(entry?.type==='win'){entry.scorerId=player.id;entry.scorer=player.name;entry.seasonEventId=eventId;entry.substituteScorer=!state.playing?.some(t=>t?.playerIds?.includes(player.id))}
        window.PlayNextSeason?.recordGoal?.(player.name,eventId);
        render();push();
      }
    }finally{setTimeout(()=>{processing=false;setControlsDisabled(false);render()},1200)}
  }
  function renderMainPicker(index){
    if(role!=='host'||processing)return;if(!state.running)return toast('Start the match first');
    scoringIndex=index;const team=state.playing[index],list=$('scorerList');if(!team||!list)return;
    $('scorerTitle').textContent=`Who scored for ${team.name}?`;
    list.innerHTML=teamPlayers(team).map(p=>`<button class="scorer-option" data-local="${p.id}"><span>${esc(p.name)}</span><small>${p.goals||0} goals</small></button>`).join('')+
      '<button class="scorer-option scorer-substitute" id="otherScorer"><span>Other / Substitute Player</span><small>Pick from the full league roster</small></button>'+
      '<button class="scorer-option" id="unassignedScorer"><span>Unassigned Goal</span><small>Team result only</small></button>';
    list.querySelectorAll('[data-local]').forEach(b=>b.onclick=()=>finishGoal(playerById(b.dataset.local)));
    $('otherScorer').onclick=openLeaguePicker;
    $('unassignedScorer').onclick=()=>finishGoal(null);
    pauseClock();$('scorerModal').classList.remove('hidden');
  }
  async function openLeaguePicker(){
    const list=$('scorerList');if(!list)return;
    $('scorerTitle').textContent='Choose substitute scorer';
    list.innerHTML='<div class="sub-scorer-loading">Loading league players…</div>';
    try{leaguePlayers=await getLeaguePlayers()}catch{leaguePlayers=[]}
    if(!leaguePlayers.length){
      const fallback=(state.players||[]).map(p=>({player_id:p.id,player_name:p.name,is_active:true,goals:p.goals||0}));leaguePlayers=fallback;
    }
    const render=q=>{
      const query=String(q||'').trim().toLocaleLowerCase();
      const rows=[...leaguePlayers].filter(p=>String(p.player_name||'').toLocaleLowerCase().includes(query)).sort((a,b)=>(a.is_active===false)-(b.is_active===false)||String(a.player_name).localeCompare(String(b.player_name)));
      list.innerHTML=`<div class="sub-scorer-search"><button id="backToTeamScorers" class="mini-btn">← Back</button><input id="subScorerSearch" placeholder="Search league players" value="${esc(q||'')}"></div><div class="sub-scorer-list">${rows.length?rows.map(p=>`<button class="scorer-option" data-league="${esc(p.player_id)}"><span>${esc(p.player_name)}</span><small>${p.is_active===false?'Inactive player · ':''}${p.goals||0} season goals</small></button>`).join(''):'<div class="empty-state">No players found.</div>'}</div><button id="leagueUnassigned" class="scorer-option"><span>Unassigned Goal</span><small>Team result only</small></button>`;
      $('backToTeamScorers').onclick=()=>renderMainPicker(scoringIndex);
      $('leagueUnassigned').onclick=()=>finishGoal(null);
      $('subScorerSearch').oninput=e=>render(e.target.value);
      list.querySelectorAll('[data-league]').forEach(b=>b.onclick=()=>{const row=leaguePlayers.find(p=>String(p.player_id)===String(b.dataset.league));finishGoal(ensureSessionPlayer(row||{}))});
      setTimeout(()=>$('subScorerSearch')?.focus(),20);
    };
    render('');
  }
  function install(){
    if(!$('scorerModal')||!E?.aGoal||!E?.bGoal)return false;
    E.aGoal.onclick=()=>renderMainPicker(0);E.bGoal.onclick=()=>renderMainPicker(1);
    const cancel=$('cancelScorer');if(cancel)cancel.onclick=()=>{const had=scoringIndex!==null;scoringIndex=null;$('scorerModal').classList.add('hidden');if(had&&state.remaining>0&&!state.running)startClock()};
    return true;
  }
  if(!install())window.addEventListener('playnext:competition-ready',install,{once:true});
})();
