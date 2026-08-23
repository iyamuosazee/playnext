(()=>{
  function bindRemoveButtons(){
    E.inputs?.querySelectorAll('.team-input-row').forEach(row=>{
      const button=row.querySelector('.remove-team');if(!button)return;
      button.onclick=()=>{if(E.inputs.children.length>2)row.remove();else toast('You need at least 2 teams')};
    });
  }

  addTeam=function(name=''){
    if(E.inputs.children.length>=10)return toast('Maximum 10 teams');
    const i=E.inputs.children.length,row=document.createElement('div');row.className='team-input-row';
    row.innerHTML=`<span class="color-chip" style="background:${colors[i%10]}"></span><input class="team-input" value="${name||`Team ${i+1}`}" aria-label="Team ${i+1} name"><button class="remove-team" aria-label="Remove team">×</button>`;
    E.inputs.appendChild(row);bindRemoveButtons();
  };
  bindRemoveButtons();
  new MutationObserver(bindRemoveButtons).observe(E.inputs,{childList:true});

  openConfirm=function(type,index){
    if(role!=='host'||processing)return;if(!state.running&&type==='goal')return toast('Start the match first');
    pending={type,index};pauseClock();
    if(type==='goal'){
      const scorerTeam=state.playing[index];E.confirmTitle.textContent=`${scorerTeam.name} scored?`;
      E.confirmText.textContent=state.queue.length?'The match ends immediately. Winner stays; the next waiting team comes in.':'The match ends immediately. With nobody waiting, the same two teams can play again.';
    }else{
      E.confirmTitle.textContent='Confirm 0–0 draw?';
      if(state.queue.length>=2)E.confirmText.textContent='Both teams rotate out and the next two waiting teams enter.';
      else if(state.queue.length===1)E.confirmText.textContent='The waiting team enters. One of the drawn teams stays so there are still two teams to play.';
      else E.confirmText.textContent='The draw is recorded. With nobody waiting, the same two teams play again.';
    }
    E.modal.classList.remove('hidden');
  };

  goal=function(i){
    snap();const w=state.playing[i],l=state.playing[1-i],n=state.queue.shift(),elapsed=state.duration-currentRemaining();
    w.games++;w.wins++;w.streak=(w.streak||0)+1;w.bestStreak=Math.max(w.bestStreak||0,w.streak);l.games++;l.streak=0;
    state.history.unshift({type:'win',winner:w.name,loser:l.name,time:`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`});
    if(n){
      state.queue.push(l);state.playing=i===0?[w,n]:[n,w];
      showTransition('GOAL',`${w.name} stays on`,`${n.name} comes in next.`);toast(`${w.name} stays on`);
    }else{
      state.playing=i===0?[w,l]:[l,w];
      showTransition('GOAL',`${w.name} wins`, `No team is waiting, so ${w.name} and ${l.name} can go again.`);toast(`${w.name} wins — same teams go again`);
    }
    newMatch();
  };

  draw=function(){
    snap();const [a,b]=state.playing;a.games++;b.games++;a.draws++;b.draws++;a.streak=0;b.streak=0;
    state.history.unshift({type:'draw',a:a.name,b:b.name,time:`${Math.floor(state.duration/60)}:00`});
    const waitingBefore=state.queue.length,next=[];
    while(next.length<2&&state.queue.length)next.push(state.queue.shift());
    state.queue.push(a,b);
    while(next.length<2&&state.queue.length)next.push(state.queue.shift());
    state.playing=next;
    if(waitingBefore>=2){showTransition('FULL TIME',`${next[0].name} vs ${next[1].name}`,`${a.name} and ${b.name} rotate to the back.`);toast('Draw — both teams rotate out')}
    else if(waitingBefore===1){showTransition('FULL TIME',`${next[0].name} vs ${next[1].name}`,`${next[0].name} was waiting; ${state.queue[0]?.name||'one drawn team'} waits next.`);toast('Draw — waiting team comes in')}
    else{showTransition('FULL TIME',`${a.name} vs ${b.name}`,'Nobody is waiting, so the same two teams go again.');toast('Draw — same teams go again')}
    newMatch();
  };
})();
