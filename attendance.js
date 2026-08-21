(()=>{
  const setup=document.getElementById('setupScreen');
  const teamsPanel=E.inputs?.closest('.panel');
  if(!setup||!teamsPanel)return;

  const storeKey='playnext-player-pool';
  let pool=[];
  try{pool=JSON.parse(localStorage.getItem(storeKey)||'[]').filter(x=>x&&x.id&&x.name)}catch{pool=[]}

  const panel=document.createElement('div');
  panel.className='panel attendance-panel';
  panel.innerHTML=`
    <div class="section-head"><div><span class="step">01</span><h2>Match day attendance</h2></div><span id="attendanceCount" class="queue-count">0 selected</span></div>
    <p class="attendance-intro">Pick everyone playing today. PlayNext will shuffle them before creating the teams.</p>
    <div id="attendancePlayers" class="attendance-players"></div>
    <div class="attendance-add-row"><input id="attendanceNewName" class="team-input" maxlength="24" placeholder="Add player name"><button id="attendanceAddBtn" class="secondary-btn">Add</button></div>
    <div class="attendance-actions"><button id="generateTeamsBtn" class="primary-btn">Randomise teams <span>↻</span></button><button id="shuffleTeamsBtn" class="secondary-btn hidden">Shuffle again</button></div>
    <p id="attendanceHint" class="microcopy attendance-hint"></p>`;
  teamsPanel.parentNode.insertBefore(panel,teamsPanel);
  const originalHead=teamsPanel.querySelector('.section-head');
  if(originalHead){const step=originalHead.querySelector('.step'); if(step)step.textContent='02'; const h=originalHead.querySelector('h2'); if(h)h.textContent='Generated teams'}
  const settingsPanel=E.duration?.closest('.panel');
  if(settingsPanel){const s=settingsPanel.querySelector('.step');if(s)s.textContent='03'}
  teamsPanel.classList.add('generated-teams-panel');

  const list=document.getElementById('attendancePlayers');
  const countEl=document.getElementById('attendanceCount');
  const newName=document.getElementById('attendanceNewName');
  const addBtn=document.getElementById('attendanceAddBtn');
  const genBtn=document.getElementById('generateTeamsBtn');
  const shuffleBtn=document.getElementById('shuffleTeamsBtn');
  const hint=document.getElementById('attendanceHint');

  function save(){localStorage.setItem(storeKey,JSON.stringify(pool))}
  function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function selected(){return pool.filter(p=>p.present)}
  function updateCount(){const n=selected().length;countEl.textContent=`${n} selected`;const size=Math.max(1,+(E.players?.value||3));hint.textContent=n?`${n} players selected · ${Math.floor(n/size)} complete team${Math.floor(n/size)===1?'':'s'}`:'Select the players who are present today.'}
  function renderPool(){
    list.innerHTML=pool.length?pool.map(p=>`<label class="attendance-player ${p.present?'selected':''}"><input type="checkbox" data-id="${p.id}" ${p.present?'checked':''}><span>${esc(p.name)}</span><button type="button" class="attendance-remove" data-remove="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></label>`).join(''):'<div class="empty-state attendance-empty">Add your players once. They will be remembered on this device for future match days.</div>';
    list.querySelectorAll('input[type=checkbox]').forEach(x=>x.onchange=()=>{const p=pool.find(y=>y.id===x.dataset.id);if(p){p.present=x.checked;save();renderPool()}});
    list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=e=>{e.preventDefault();pool=pool.filter(p=>p.id!==b.dataset.remove);save();renderPool()});
    updateCount();
  }
  function addPlayer(){const name=newName.value.trim();if(!name)return;if(pool.some(p=>p.name.toLowerCase()===name.toLowerCase()))return toast('That player is already in the list');pool.push({id:crypto.randomUUID(),name,present:true});newName.value='';save();renderPool();newName.focus()}
  addBtn.onclick=addPlayer;newName.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addPlayer()}};

  function shuffle(arr){const out=[...arr];for(let i=out.length-1;i>0;i--){const a=new Uint32Array(1);crypto.getRandomValues(a);const j=a[0]%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
  function ensureTeamRows(teamCount){while(E.inputs.children.length<teamCount)addTeam();while(E.inputs.children.length>teamCount&&E.inputs.children.length>4)E.inputs.lastElementChild?.remove();if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('resize'))}
  function fillTeams(){
    const players=selected();
    const per=Math.max(1,+(E.players?.value||3));
    if(players.length<per*4)return toast(`Select at least ${per*4} players for 4 teams`);
    if(players.length%per!==0)return toast(`Select a multiple of ${per} players so every team is complete`);
    const mixed=shuffle(players);
    const teamCount=mixed.length/per;
    if(teamCount>10)return toast('This version supports up to 10 teams per session');
    ensureTeamRows(teamCount);
    const rows=[...E.inputs.querySelectorAll('.team-input-row')].slice(0,teamCount);
    rows.forEach((row,i)=>{
      const teamInput=row.querySelector('.team-input');if(teamInput)teamInput.value=`Team ${i+1}`;
      const names=mixed.slice(i*per,(i+1)*per).map(p=>p.name);
      let inputs=[...row.querySelectorAll('.player-name-input')];
      if(inputs.length!==per){const editor=row.querySelector('.team-player-editor');if(editor){editor.innerHTML='';for(let k=0;k<per;k++){const inp=document.createElement('input');inp.className='player-name-input';inp.maxLength=24;inp.placeholder=`Player ${k+1}`;editor.appendChild(inp)}inputs=[...editor.querySelectorAll('.player-name-input')]}}
      inputs.forEach((inp,k)=>inp.value=names[k]||'');
    });
    teamsPanel.classList.add('teams-generated');
    shuffleBtn.classList.remove('hidden');
    genBtn.innerHTML='Teams generated <span>✓</span>';
    toast(`${teamCount} random teams created`);
    teamsPanel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  genBtn.onclick=fillTeams;shuffleBtn.onclick=fillTeams;
  E.players?.addEventListener('change',()=>{shuffleBtn.classList.add('hidden');genBtn.innerHTML='Randomise teams <span>↻</span>';updateCount()});

  const existingStart=E.start.onclick;
  E.start.onclick=async e=>{
    const rows=[...E.inputs.querySelectorAll('.team-input-row')];
    const filled=rows.some(r=>[...r.querySelectorAll('.player-name-input')].some(i=>i.value.trim()));
    if(selected().length&&!filled)return toast('Randomise the selected players into teams first');
    return existingStart?.call(E.start,e);
  };

  renderPool();
})();