(()=>{
  function reconcileTeamStats(){
    if(!Array.isArray(state?.teams)||!Array.isArray(state?.history))return;
    const byName=new Map();
    state.teams.forEach(team=>{
      team.games=0;team.wins=0;team.draws=0;team.losses=0;team.goalsFor=0;team.goalsAgainst=0;team.streak=0;team.bestStreak=0;
      byName.set(String(team.name||'').trim().toLocaleLowerCase(),team);
    });
    const chronological=[...state.history].reverse();
    chronological.forEach(match=>{
      if(match?.type==='win'){
        const winner=byName.get(String(match.winner||'').trim().toLocaleLowerCase());
        const loser=byName.get(String(match.loser||'').trim().toLocaleLowerCase());
        if(winner){winner.games++;winner.wins++;winner.goalsFor++;winner.streak=(winner.streak||0)+1;winner.bestStreak=Math.max(winner.bestStreak||0,winner.streak)}
        if(loser){loser.games++;loser.losses++;loser.goalsAgainst++;loser.streak=0}
      }else if(match?.type==='draw'){
        const a=byName.get(String(match.a||'').trim().toLocaleLowerCase());
        const b=byName.get(String(match.b||'').trim().toLocaleLowerCase());
        if(a){a.games++;a.draws++;a.streak=0}
        if(b){b.games++;b.draws++;b.streak=0}
      }
    });
  }

  window.PlayNextTeamStats={reconcile:reconcileTeamStats};

  if(typeof render==='function'){
    const baseRender=render;
    render=function(){reconcileTeamStats();return baseRender()};
  }
  if(typeof push==='function'){
    const basePush=push;
    push=async function(){reconcileTeamStats();return basePush()};
  }

  try{reconcileTeamStats()}catch{}
})();