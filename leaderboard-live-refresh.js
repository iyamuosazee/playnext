(()=>{
  if(typeof render!=='function')return;
  const baseRender=render;
  render=function(){
    baseRender();
    const modal=document.getElementById('leaderboardModal');
    if(!modal||modal.classList.contains('hidden'))return;
    const active=document.querySelector('.leader-tab.active');
    if(active&&typeof active.click==='function')setTimeout(()=>active.click(),0);
  };
})();