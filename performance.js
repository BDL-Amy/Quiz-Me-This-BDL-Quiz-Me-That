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

  /* Extend the existing announcement loader so published Supreme winners are
     offered on the player's next START, not only on the first calendar day of
     a month. The existing loader remains authoritative for Smartest and admin
     previews. Every announcement keeps its own per-player/per-period seen key. */
  function installAllWinnerAnnouncements(){
    if(typeof window.loadWinnerAnnouncements!=="function")return;
    const original=window.loadWinnerAnnouncements;

    window.loadWinnerAnnouncements=async function(){
      const items=await original();
      const announcements=Array.isArray(items)?items.slice():[];

      try{
        if(typeof MONTHLY_WINNER_SERVICE!=="undefined"){
          const response=await fetch(MONTHLY_WINNER_SERVICE,{cache:"no-store"});
          const data=await response.json().catch(()=>({}));
          const winner=data?.winner?.player_name?data.winner:null;
          if(response.ok&&winner){
            const period=winner.month_start||winner.period||winner.period_start||null;
            if(period&&typeof shouldOfferWinnerAnnouncement==="function"&&shouldOfferWinnerAnnouncement("monthly",period)){
              const alreadyQueued=announcements.some(item=>item&&item.type==="monthly"&&item.period===period);
              if(!alreadyQueued)announcements.push({type:"monthly",period,winner});
            }
          }
        }
      }catch(error){
        console.error("Supreme winner announcement could not be loaded.",error);
      }

      return announcements;
    };
  }

  /* Mandatory winner gate. All currently published title announcements are
     loaded before navigation. If several are unseen, showNextWinnerAnnouncement
     presents them one after another; only after the last CONTINUE is the main
     menu opened. This applies to every player, including Amy/BDL test accounts. */
  function installWinnerGate(){
    document.addEventListener("click",async function(event){
      const start=event.target.closest&&event.target.closest("#startQuizButton");
      if(!start)return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if(typeof page==="function"){
        page('<div class="loading">Checking title announcements...</div>');
      }

      try{
        const items=typeof loadWinnerAnnouncements==="function"
          ? await loadWinnerAnnouncements()
          : [];
        pendingWinnerAnnouncements=Array.isArray(items)?items:[];
        if(pendingWinnerAnnouncements.length&&typeof showNextWinnerAnnouncement==="function"){
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
  installAllWinnerAnnouncements();
  installWinnerGate();
  warmDashboard();
})();