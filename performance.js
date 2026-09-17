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

  installDashboardCache();
  installAnswerCache();
  warmDashboard();
})();