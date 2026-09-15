/* BDL Yearly statistics navigation */
(function(){
  const originalTitles=window.showMyTitles;
  const originalPeriod=window.showStatisticsPeriod;

  window.showMyStatistics=function(){
    page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="menu">
      <button onclick="showStatisticsPeriod('week')" style="border-color:var(--stats);font-weight:bold">THIS WEEK</button>
      <button onclick="showStatisticsPeriod('month')" style="border-color:var(--stats);font-weight:bold">THIS MONTH</button>
      <button onclick="showStatisticsPeriod('year')" style="border-color:var(--stats);font-weight:bold">YEARLY</button>
      <button onclick="showStatisticsPeriod('all')" style="border-color:var(--stats);font-weight:bold">TOP 20 ALL TIME</button>
      <button onclick="showMyTitles()" style="border-color:var(--stats);font-weight:bold">MY TITLES</button>
    </div></div>${back('showMainMenu')}`);
  };

  window.showStatisticsPeriod=async function(type){
    if(type!=='year') return originalPeriod(type);
    try{
      page('<div class="loading">Loading your statistics...</div>');
      const data=await loadDashboard();
      const stats=data?.year?.player||data?.lifetime||{};
      const ranking=data?.year||data?.top20;
      const year=data?.grandmaster?.year||new Date().getFullYear();
      const rows=Array.isArray(ranking?.leaderboard)?ranking.leaderboard:[];
      let rankingHtml='';
      if(data?.ranking_access!==true){
        rankingHtml=`<h3 class="center">QUIZ TOP 20 — ${year}</h3><div class="notice">Your results are private. Join the rankings in Personal Settings to view the Top 20.</div>`;
      }else if(!rows.length){
        rankingHtml=`<h3 class="center">QUIZ TOP 20 — ${year}</h3><div class="notice">No ranking data is available yet.</div>`;
      }else{
        let body='<div class="leaderboard">';
        rows.slice(0,20).forEach(row=>{
          const me=String(row.player_name||'').toLowerCase()===String(playerName()||'').toLowerCase();
          body+=`<div class="leader-row ${me?'me':''}"><strong>#${row.rank}</strong><span>${html(row.player_name)}</span><span>${row.correct??0} correct<br><small style="margin:0;text-align:right">${row.played??0} played</small></span></div>`;
        });
        body+='</div>';
        rankingHtml=`<h3 class="center">QUIZ TOP 20 — ${year}</h3>${body}`;
      }
      page(`<div class="section stats"><h2 class="center">YEARLY</h2><div class="stat-grid"><div class="stat-card"><strong>${stats.played??0}</strong>Played</div><div class="stat-card"><strong>${stats.correct??0}</strong>Correct</div><div class="stat-card" style="grid-column:1/-1"><strong>${stats.accuracy??0}%</strong>Accuracy</div></div><div class="notice"><strong>Played</strong> updates immediately after you submit an answer. <strong>Correct and Accuracy</strong> are updated the following quiz day, when the correct answer is revealed.</div><div style="margin-top:24px">${rankingHtml}</div></div>${back('showMyStatistics')}`);
    }catch(e){
      page(`<div class="section stats"><h2 class="center">YEARLY</h2><div class="notice">Your yearly statistics could not be loaded.</div></div>${back('showMyStatistics')}`);
    }
  };

  window.showMyTitles=async function(){
    await originalTitles();
    const section=document.querySelector('.section.stats');
    if(!section) return;
    const holder=document.createElement('div');
    holder.className='menu';
    holder.style.marginTop='18px';
    holder.innerHTML=`<button class="grandmaster" onclick="showGrandmaster('showMyTitles')" style="border-color:var(--grandmaster);color:var(--grandmaster);font-weight:bold">GRANDMASTER</button>`;
    section.appendChild(holder);
  };
})();