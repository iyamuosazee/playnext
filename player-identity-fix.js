(()=>{
  const norm=v=>String(v||'').trim().toLocaleLowerCase();
  function canonicalize(){
    if(!Array.isArray(state?.players)||!state.players.length)return false;
    const teams=Array.isArray(state.teams)?state.teams:[];
    const teamById=new Map(teams.map(t=>[t.id,t]));
    const groups=new Map();
    state.players.forEach(p=>{const key=norm(p.name);if(!key)return;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)});
    let changed=false;
    const idMap=new Map();
    const merged=[];
    for(const [key,items] of groups){
      let owningTeam=teams.find(t=>(Array.isArray(t.players)?t.players:[]).some(name=>norm(typeof name==='string'?name:name?.name)===key));
      if(!owningTeam){
        const ids=new Set(items.map(p=>p.id));
        owningTeam=teams.find(t=>(t.playerIds||[]).some(id=>ids.has(id)));
      }
      let canonical=items.find(p=>owningTeam&&p.currentTeamId===owningTeam.id)||items.find(p=>p.currentTeamId&&teamById.has(p.currentTeamId))||items.find(p=>p.seasonPlayerId)||items[0];
      if(items.length>1)changed=true;
      const seasonRef=items.find(p=>p.seasonPlayerId)?.seasonPlayerId||canonical.seasonPlayerId||null;
      canonical.seasonPlayerId=seasonRef;
      canonical.currentTeamId=owningTeam?.id||null;
      const goalCount=(state.history||[]).filter(h=>h?.type==='win'&&norm(h.scorer)===key).length;
      canonical.goals=goalCount;
      for(const p of items)idMap.set(p.id,canonical.id);
      merged.push(canonical);
    }
    if(!changed)return false;
    state.players=merged;
    teams.forEach(team=>{
      const mapped=[];
      for(const old of team.playerIds||[]){const id=idMap.get(old)||old;if(id&&!mapped.includes(id))mapped.push(id)}
      for(const entry of Array.isArray(team.players)?team.players:[]){
        const key=norm(typeof entry==='string'?entry:entry?.name);const player=merged.find(p=>norm(p.name)===key);if(player&&!mapped.includes(player.id))mapped.push(player.id)
      }
      team.playerIds=mapped;
      team.players=mapped.map(id=>merged.find(p=>p.id===id)?.name).filter(Boolean);
    });
    (state.history||[]).forEach(h=>{if(!h?.scorer)return;const p=merged.find(x=>norm(x.name)===norm(h.scorer));if(p)h.scorerId=p.id});
    return true;
  }
  const baseRender=render;
  render=function(){canonicalize();baseRender();};
  const repaired=canonicalize();
  if(repaired&&typeof role!=='undefined'&&role==='host'){push();setTimeout(()=>toast('Duplicate player records repaired'),150)}
  window.PlayNextCanonicalizePlayers=canonicalize;
})();
