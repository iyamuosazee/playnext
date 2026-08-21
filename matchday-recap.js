(()=>{
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function buildRecap(){
    const history=Array.isArray(state?.history)?state.history:[];
    const players=Array.isArray(state?.players)?state.players:[];
    const teams=Array.isArray(state?.teams)?state.teams:[];
    const wins=history.filter(h=>h?.type==='win');
    const draws=history.filter(h=>h?.type==='draw');
    const goalCounts={};wins.forEach(h=>{if(h.scorer)goalCounts[h.scorer]=(goalCounts[h.scorer]||0)+1});
    const topGoals=Math.max(0,...Object.values(goalCounts));
    const scorers=Object.entries(goalCounts).filter(([,n])=>n===topGoals&&n>0).map(([name])=>name);
    const topWins=Math.max(0,...teams.map(t=>t.wins||0));
    const winningTeams=teams.filter(t=>(t.wins||0)===topWins&&topWins>0).map(t=>t.name);
    const bestStreak=Math.max(0,...teams.map(t=>t.bestStreak||0));
    const streakTeams=teams.filter(t=>(t.bestStreak||0)===bestStreak&&bestStreak>0).map(t=>t.name);
    const participants=players.filter(p=>(p.games||0)>0||p.currentTeamId).length||new Set(teams.flatMap(t=>t.players||[])).size;
    return {matches:history.length,wins:wins.length,draws:draws.length,participants,topGoals,scorers,topWins,winningTeams,bestStreak,streakTeams};
  }
  function recapText(r){
    const title=state?.seasonName?`${state.seasonName} · MATCH DAY RECAP`:'PLAYNEXT · MATCH DAY RECAP';
    return `${title}\n\n🎮 ${r.matches} matches played\n👟 ${r.participants} players\n⚽ Top scorer — ${r.scorers.length?r.scorers.join(' / ')+' ('+r.topGoals+')':'No goals assigned'}\n🏆 Most wins — ${r.winningTeams.length?r.winningTeams.join(' / ')+' ('+r.topWins+')':'—'}\n🔥 Longest streak — ${r.streakTeams.length?r.streakTeams.join(' / ')+' ('+r.bestStreak+')':'—'}\n🤝 ${r.draws} draws\n\nPLAYNEXT\nNo arguments. Just next.`;
  }
  function showRecap(){
    const r=buildRecap();
    let modal=document.getElementById('matchdayRecapModal');
    if(!modal){document.body.insertAdjacentHTML('beforeend','<div id="matchdayRecapModal" class="modal-backdrop hidden"><div class="modal-card recap-card"><div class="sheet-head"><div><div class="eyebrow">MATCH DAY COMPLETE</div><h3>Match Day Recap</h3></div><button id="closeMatchdayRecap" class="icon-btn">×</button></div><div id="matchdayRecapContent"></div><button id="shareMatchdayRecap" class="primary-btn full-btn">Share recap <span>↗</span></button></div></div>');modal=document.getElementById('matchdayRecapModal');document.getElementById('closeMatchdayRecap').onclick=()=>modal.classList.add('hidden');modal.onclick=e=>{if(e.target===modal)modal.classList.add('hidden')}}
    document.getElementById('matchdayRecapContent').innerHTML=`<div class="recap-hero"><strong>${r.matches}</strong><span>MATCHES PLAYED</span></div><div class="recap-grid"><div><span>⚽ TOP SCORER</span><strong>${esc(r.scorers.join(' / ')||'—')}</strong><small>${r.topGoals?`${r.topGoals} goal${r.topGoals===1?'':'s'}`:'No assigned goals'}</small></div><div><span>🏆 MOST WINS</span><strong>${esc(r.winningTeams.join(' / ')||'—')}</strong><small>${r.topWins?`${r.topWins} win${r.topWins===1?'':'s'}`:'No wins yet'}</small></div><div><span>🔥 LONGEST STREAK</span><strong>${esc(r.streakTeams.join(' / ')||'—')}</strong><small>${r.bestStreak?`${r.bestStreak} straight`:'—'}</small></div><div><span>👟 PLAYERS</span><strong>${r.participants}</strong><small>${r.draws} draw${r.draws===1?'':'s'}</small></div></div>`;
    document.getElementById('shareMatchdayRecap').onclick=async()=>{const text=recapText(r);try{if(navigator.share)await navigator.share({title:'PlayNext Match Day Recap',text});else{await navigator.clipboard.writeText(text);toast('Match Day recap copied')}}catch(e){if(e?.name!=='AbortError')toast('Could not share recap')}};
    modal.classList.remove('hidden');
  }
  window.PlayNextRecap={show:showRecap,build:buildRecap,text:()=>recapText(buildRecap())};
})();