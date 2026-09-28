/* BDL frontend performance layer — no quiz-rule changes. */
(function(){
  const DASH_TTL=60000;
  let dashAt=0,dashPromise=null;
  const answerCache=new Map();

  function installDashboardCache(){
    if(typeof window.loadDashboard!=="function")return;
    const original=window.loadDashboard;
    window.loadDashboard=async function(force=false){
      const now=Date.now();
      if(!force&&window.dashboardCache&&now-dashAt<DASH_TTL)return window.dashboardCache;
      if(!force&&dashPromise)return dashPromise;
      dashPromise=Promise.resolve(original()).then(data=>{dashAt=Date.now();return data}).finally(()=>{dashPromise=null});
      return dashPromise;
    };
  }

  function installAnswerCache(){
    if(typeof window.historyPlayerAnswer!=="function")return;
    const original=window.historyPlayerAnswer;
    window.historyPlayerAnswer=async function(index){
      if(answerCache.has(index))return answerCache.get(index);
      const value=await original(index);
      answerCache.set(index,value);
      return value;
    };
  }

  function warmDashboard(){
    const warm=()=>{if(typeof window.loadDashboard==="function"&&typeof window.playerId==="function"&&playerId())window.loadDashboard().catch(()=>{})};
    if("requestIdleCallback" in window)requestIdleCallback(warm,{timeout:2500});else setTimeout(warm,1200);
  }

  /* Winner gate: a published winner must be acknowledged before the main menu.
     This capture listener runs before the legacy START handler, so the menu can
     never flash up first. If the winner service is unavailable, normal quiz
     navigation remains available instead of trapping the player. */
  function installWinnerGate(){
    document.addEventListener("click",async function(event){
      const start=event.target.closest&&event.target.closest("#startQuizButton");
      if(!start)return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if(typeof page==="function"){
        page('<div class="loading">Checking winner announcement...</div>');
      }

      try{
        const items=typeof loadWinnerAnnouncements==="function"
          ? await loadWinnerAnnouncements()
          : [];
        window.pendingWinnerAnnouncements=Array.isArray(items)?items:[];
        if(window.pendingWinnerAnnouncements.length&&typeof showNextWinnerAnnouncement==="function"){
          showNextWinnerAnnouncement();
          return;
        }
      }catch(error){
        console.error("Winner announcement gate could not be loaded.",error);
      }

      if(typeof showMainMenu==="function")showMainMenu();
    },true);
  }

  installDashboardCache();
  installAnswerCache();
  installWinnerGate();
  warmDashboard();
})();