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

  function announcementSchedule(items){
    const list=Array.isArray(items)?items:[];
    const b=typeof brussels==="function"?brussels():null;
    const date=b?new Date(+b.year,+b.month-1,+b.day):new Date();
    const monday=date.getDay()===1;
    const firstOfMonth=date.getDate()===1;

    return list.filter(item=>{
      const type=String(item?.type||"");
      /* Keep confidential Sunday admin/test previews unchanged. */
      if(type.startsWith("admin-"))return true;
      /* Public title ceremony schedule is strict. */
      if(type==="weekly")return monday;
      if(type==="monthly")return firstOfMonth;
      return false;
    });
  }

  /* Winner gate: title announcements are shown before the main menu.
     Smartest is public on Monday only. Supreme is public on the 1st only.
     If Monday is also the 1st, both are shown in sequence. */
  function installWinnerGate(){
    document.addEventListener("click",async function(event){
      const start=event.target.closest&&event.target.closest("#startQuizButton");
      if(!start)return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if(typeof page==="function"){
        page('<div class="loading">Checking title announcement...</div>');
      }

      try{
        const items=typeof loadWinnerAnnouncements==="function"
          ? await loadWinnerAnnouncements()
          : [];
        pendingWinnerAnnouncements=announcementSchedule(items);
        if(pendingWinnerAnnouncements.length&&typeof showNextWinnerAnnouncement==="function"){
          showNextWinnerAnnouncement();
          return;
        }
      }catch(error){
        console.error("Title announcement gate could not be loaded.",error);
      }

      if(typeof showMainMenu==="function")showMainMenu();
    },true);
  }

  installDashboardCache();
  installAnswerCache();
  installWinnerGate();
  warmDashboard();
})();