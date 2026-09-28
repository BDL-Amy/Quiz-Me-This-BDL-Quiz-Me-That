/* BDL frontend performance layer — winner gate + caches. */
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

  function actualBrusselsDate(){
    const b=typeof brussels==="function"?brussels():null;
    return b?new Date(+b.year,+b.month-1,+b.day):new Date();
  }

  function ceremonySeenKey(type,period){
    const pid=typeof playerId==="function"?playerId():"player";
    return ["bdlTitleCeremonyV2",pid,type,period].join("_");
  }

  function markCeremonySeen(type,period){
    try{localStorage.setItem(ceremonySeenKey(type,period),"yes")}catch(_e){}
  }

  function ceremonyUnseen(type,period){
    try{return localStorage.getItem(ceremonySeenKey(type,period))!=="yes"}catch(_e){return true}
  }

  async function scheduledAnnouncements(){
    const date=actualBrusselsDate();
    const monday=date.getDay()===1;
    const firstOfMonth=date.getDate()===1;
    const items=[];

    /* Monday is authoritative for the public Smartest ceremony. Fetch the
       published winner directly so an older local seen-key or the legacy
       after-START loader cannot suppress this Monday's ceremony. */
    if(monday&&typeof api==="function"&&typeof RESULTS_SERVICE!=="undefined"){
      try{
        const data=await api(RESULTS_SERVICE,{action:"latest_weekly_winner"});
        const winner=data&&data.winner&&data.winner.player_name?data.winner:null;
        const period=winner&&winner.week_start;
        if(winner&&period&&ceremonyUnseen("weekly",period))items.push({type:"weekly",period,winner});
      }catch(error){console.error("Monday Smartest ceremony could not be loaded.",error)}
    }

    /* Supreme remains strictly the 1st. Reuse the existing monthly loader,
       but never allow weekly/admin items from it into the public gate. */
    if(firstOfMonth&&typeof loadWinnerAnnouncements==="function"){
      try{
        const legacy=await loadWinnerAnnouncements();
        for(const item of Array.isArray(legacy)?legacy:[]){
          if(item&&item.type==="monthly"&&item.period&&ceremonyUnseen("monthly",item.period))items.push(item);
        }
      }catch(error){console.error("Supreme ceremony could not be loaded.",error)}
    }
    return items;
  }

  function showCeremonyQueue(items){
    const queue=Array.isArray(items)?items.slice():[];
    const next=()=>{
      const a=queue.shift();
      if(!a){if(typeof showMainMenu==="function")showMainMenu();return}
      const monthly=a.type==="monthly";
      if(typeof page!=="function"){next();return}
      page(`<div class="winner-announcement ${monthly?"monthly-announcement":"weekly-announcement"}"><div class="ceremony-mark">${monthly?"✦":"♛"}</div><div class="announcement-label">${monthly?"WE HONOR":"CONGRATULATIONS"}</div><h1>${monthly?"THE SUPREME BDL’ER OF THE MONTH":"THE SMARTEST BDL’ER OF THE WEEK"}</h1><div class="winner-name">${typeof html==="function"?html(a.winner.player_name):a.winner.player_name}</div><p>${monthly?"Welcome to The Supreme Order of BDL.":"You are the smartest kid in town — at least till next Monday!"}</p><button id="bdlCeremonyContinue">CONTINUE</button></div>`);
      const btn=document.getElementById("bdlCeremonyContinue");
      if(btn)btn.onclick=()=>{markCeremonySeen(a.type,a.period);next()};
    };
    next();
  }

  function installWinnerGate(){
    document.addEventListener("click",async function(event){
      const start=event.target.closest&&event.target.closest("#startQuizButton");
      if(!start)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof page==="function")page('<div class="loading">Checking title announcement...</div>');
      try{
        const items=await scheduledAnnouncements();
        if(items.length){showCeremonyQueue(items);return}
      }catch(error){console.error("Title announcement gate could not be loaded.",error)}
      if(typeof showMainMenu==="function")showMainMenu();
    },true);
  }

  installDashboardCache();
  installAnswerCache();
  installWinnerGate();
  warmDashboard();
})();