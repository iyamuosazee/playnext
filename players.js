(()=>{
  function playerCount(){return Math.max(1,+(E.players?.value||3))}
  function decorateRow(row){
    if(!row||row.querySelector('.team-player-editor'))return;
    const editor=document.createElement('div');editor.className='team-player-editor';row.appendChild(editor);renderPlayerInputs(editor,playerCount());
  }
  function renderPlayerInputs(editor,count){
    const old=[...editor.querySelectorAll('.player-name-input')].map(x=>x.value);
    editor.innerHTML='';
    for(let i=0;i<count;i++){const input=document.createElement('input');input.className='player-name-input';input.maxLength=24;input.placeholder=`Player ${i+1}`;input.value=old[i]||'';editor.appendChild(input)}
  }
  function decorateAll(){document.querySelectorAll('.team-input-row').forEach(decorateRow)}
  const obs=new MutationObserver(decorateAll);obs.observe(E.inputs,{childList:true,subtree:false});decorateAll();
  if(E.players)E.players.addEventListener('change',()=>document.querySelectorAll('.team-player-editor').forEach(x=>renderPlayerInputs(x,playerCount())));
  function setupTeams(){
    return [...document.querySelectorAll('.team-input-row')].map((row,i)=>{
      const name=row.querySelector('.team-input')?.value.trim();
      const players=[...row.querySelectorAll('.player-name-input')].map(x=>x.value.trim()).filter(Boolean);
      return {name,players,i};
    }).filter(x=>x.name)
  }
  E.start.onclick=async()=>{
    const entries=setupTeams();
    if(entries.length<4)return toast('Add at least 4 teams');
    if(new Set(entries.map(x=>x.name.toLowerCase())).size!==entries.length)return toast('Team names must be unique');
    state.teams=entries.map(({name,players,i})=>({id:crypto.randomUUID(),name,color:colors[i%colors.length],players,games:0,wins:0,draws:0,streak:0,bestStreak:0}));
    state.playing=state.teams.slice(0,2);state.queue=state.teams.slice(2);state.duration=+E.duration.value;state.remaining=state.duration;state.history=[];state.snapshots=[];startClock(false);
    let {data,error}=await sb.rpc('create_session',{p_name:'Sunday Football',p_duration_seconds:state.duration,p_players_per_team:+E.players.value,p_state:publicState()});
    if(error)return toast('Could not create room');
    let r=Array.isArray(data)?data[0]:data;roomCode=r.code;hostToken=r.host_token;role='host';localStorage.setItem('playnext-host',JSON.stringify({roomCode,hostToken}));enterGame();await subscribe();setTimeout(openShare,350)
  };
  const baseRender=render;
  render=function(){
    baseRender();
    const [a,b]=state.playing||[];
    [[E.aName,a],[E.bName,b]].forEach(([nameEl,t])=>{
      if(!nameEl)return;let line=nameEl.parentElement.querySelector('.team-players-line');if(!line){line=document.createElement('span');line.className='team-players-line';nameEl.insertAdjacentElement('afterend',line)}
      line.textContent=t?.players?.length?t.players.join(' · '):'';line.style.display=line.textContent?'block':'none';
    });
    document.querySelectorAll('.queue-item').forEach((row,i)=>{const t=state.queue?.[i];const n=row.querySelector('.queue-name');if(!n)return;let p=n.querySelector('.queue-players');if(!p){p=document.createElement('span');p.className='queue-players';n.appendChild(p)}p.textContent=t?.players?.length?t.players.join(' · '):'';p.style.display=p.textContent?'block':'none'});
  };
})();