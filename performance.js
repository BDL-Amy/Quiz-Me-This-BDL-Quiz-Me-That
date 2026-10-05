/* BDL frontend performance layer — authoritative title ceremony gate. */
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

  function actualBrusselsDate(){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||"";
    return new Date(Number(get("year")),Number(get("month"))-1,Number(get("day")));
  }

  function key(type,period){
    const pid=typeof playerId==="function"?playerId():"player";
    return ["bdlTitleCeremonyV3",pid,type,period].join("_");
  }
  function unseen(type,period){try{return localStorage.getItem(key(type,period))!=="yes"}catch(_e){return true}}
  function mark(type,period){try{localStorage.setItem(key(type,period),"yes")}catch(_e){}}

  async function getScheduledTitles(){
    const d=actualBrusselsDate();
    const items=[];
    if(d.getDay()===1){
      try{
        const data=await api(RESULTS_SERVICE,{action:"latest_weekly_winner"});
        const winner=data?.winner?.player_name?data.winner:null;
        if(winner?.week_start&&unseen("weekly",winner.week_start))items.push({type:"weekly",period:winner.week_start,winner});
      }catch(error){console.error("Smartest ceremony load failed",error)}
    }
    if(d.getDate()===1){
      try{
        const response=await fetch(MONTHLY_WINNER_SERVICE,{cache:"no-store"});
        const data=await response.json().catch(()=>({}));
        const winner=response.ok&&data?.winner?.player_name?data.winner:null;
        const period=typeof previousMonthStart==="function"?previousMonthStart():"previous-month";
        if(winner&&unseen("monthly",period))items.push({type:"monthly",period,winner});
      }catch(error){console.error("Supreme ceremony load failed",error)}
    }
    return items;
  }

  function renderQueue(items,finish){
    const queue=items.slice();
    const next=()=>{
      const a=queue.shift();
      if(!a){finish();return}
      const monthly=a.type==="monthly";
      page(`<div class="winner-announcement ${monthly?"monthly-announcement":"weekly-announcement"}">
        <div class="ceremony-mark">${monthly?"✦":"♛"}</div>
        <div class="announcement-label">${monthly?"WE HONOR":"CONGRATULATIONS"}</div>
        <h1>${monthly?"THE SUPREME BDL’ER OF THE MONTH":"THE SMARTEST BDL’ER OF THE WEEK"}</h1>
        <div class="winner-name">${html(a.winner.player_name)}</div>
        <p>${monthly?"Welcome to The Supreme Order of BDL.":"You are the smartest kid in town — at least till next Monday!"}</p>
        <button id="bdlTitleContinue">CONTINUE</button>
      </div>`);
      const btn=document.getElementById("bdlTitleContinue");
      if(btn)btn.onclick=()=>{mark(a.type,a.period);next()};
    };
    next();
  }

  function installAuthoritativeMenuGate(){
    if(typeof window.showMainMenu!=="function")return;
    const realMainMenu=window.showMainMenu;
    let checking=false;
    let bypass=false;
    window.showMainMenu=function(){
      if(bypass)return realMainMenu.apply(this,arguments);
      const d=actualBrusselsDate();
      if(d.getDay()!==1&&d.getDate()!==1)return realMainMenu.apply(this,arguments);
      if(checking)return;
      checking=true;
      page('<div class="loading">Checking title announcement...</div>');
      const finishGate=()=>{bypass=true;try{realMainMenu()}finally{bypass=false;checking=false}};
      let settled=false;
      const timeout=setTimeout(()=>{
        if(settled)return;
        settled=true;
        console.warn("Title ceremony check timed out; continuing to main menu.");
        finishGate();
      },3500);
      getScheduledTitles().then(items=>{
        if(settled)return;
        settled=true;
        clearTimeout(timeout);
        if(items.length){
          renderQueue(items,finishGate);
        }else{
          finishGate();
        }
      }).catch(error=>{
        if(settled)return;
        settled=true;
        clearTimeout(timeout);
        console.error("Title ceremony gate failed",error);
        finishGate();
      });
    };
  }

  /* Stop the legacy START listener before it can navigate. The only navigation
     path is the wrapped showMainMenu above. */
  document.addEventListener("click",function(event){
    const start=event.target.closest&&event.target.closest("#startQuizButton");
    if(!start)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.showMainMenu();
  },true);

  installDashboardCache();
  installAnswerCache();
  installAuthoritativeMenuGate();
})();