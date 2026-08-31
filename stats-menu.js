/* BDL STATISTICS SUBMENU */
(function(){
  const statsTimingNote=()=>`<div class="notice"><strong>Played</strong> updates immediately after you submit an answer. <strong>Correct and Accuracy</strong> are updated the following quiz day, when the correct answer is revealed.</div>`;

  function statsCards(stats){
    const s=stats||{};
    return `<div class="stat-grid">
      <div class="stat-card"><strong>${s.played??0}</strong>Played</div>
      <div class="stat-card"><strong>${s.correct??0}</strong>Correct</div>
      <div class="stat-card" style="grid-column:1/-1"><strong>${s.accuracy??0}%</strong>Accuracy</div>
    </div>`;
  }

  function statsLeaderboard(block,title){
    const rows=Array.isArray(block?.leaderboard)?block.leaderboard:[];
    let body='';
    if(!rows.length){
      body='<div class="notice">No ranking data is available yet.</div>';
    }else{
      body='<div class="leaderboard">';
      rows.slice(0,20).forEach(row=>{
        const me=String(row.player_name||'').toLowerCase()===String(playerName()||'').toLowerCase();
        body+=`<div class="leader-row ${me?'me':''}"><strong>#${row.rank}</strong><span>${html(row.player_name)}</span><span>${row.correct??0} correct<br><small style="margin:0;text-align:right">${row.played??0} played</small></span></div>`;
      });
      body+='</div>';
    }
    return `<h3 class="center">${title}</h3>${body}`;
  }

  async function getStatsDashboard(){
    page('<div class="loading">Loading your statistics...</div>');
    return await loadDashboard();
  }

  window.showMyStatistics=function(){
    page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="menu">
      <button onclick="showStatisticsPeriod('week')" style="border-color:var(--stats);font-weight:bold">THIS WEEK</button>
      <button onclick="showStatisticsPeriod('month')" style="border-color:var(--stats);font-weight:bold">THIS MONTH</button>
      <button onclick="showStatisticsPeriod('all')" style="border-color:var(--stats);font-weight:bold">ALL TIME</button>
      <button onclick="showMyTitles()" style="border-color:var(--stats);font-weight:bold">MY TITLES</button>
    </div></div>${back('showMainMenu')}`);
  };

  window.showStatisticsPeriod=async function(type){
    try{
      const data=await getStatsDashboard();
      let title='THIS WEEK',stats=data?.week?.player||{},ranking=data?.week,topTitle='TOP 20 — THIS WEEK';
      if(type==='month'){
        title='THIS MONTH';stats=data?.month?.player||{};ranking=data?.month;topTitle='TOP 20 — THIS MONTH';
      }else if(type==='all'){
        title='ALL TIME';stats=data?.lifetime||{};ranking=data?.top20;topTitle='TOP 20 — ALL TIME';
      }
      const rankingHtml=data?.ranking_access===true?statsLeaderboard(ranking,topTitle):`<h3 class="center">${topTitle}</h3><div class="notice">Your results are private. Join the rankings in Personal Settings to view the Top 20.</div>`;
      page(`<div class="section stats"><h2 class="center">${title}</h2>${statsCards(stats)}${statsTimingNote()}<div style="margin-top:24px">${rankingHtml}</div></div>${back('showMyStatistics')}`);
    }catch(e){
      page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="notice">Your statistics could not be loaded.</div></div>${back('showMyStatistics')}`);
    }
  };

  window.showMyTitles=async function(){
    try{
      const data=await getStatsDashboard();
      const personal=renderPersonalTitleStats(data);
      const ranking=data?.ranking_access===true?renderTitleRanking(data):'<div class="notice">Your results are private. Join the rankings in Personal Settings to view the Title Top 20.</div>';
      page(`<div class="section stats"><h2 class="center">MY TITLES</h2>${personal}${ranking}</div>${back('showMyStatistics')}`);
    }catch(e){
      page(`<div class="section stats"><h2 class="center">MY TITLES</h2><div class="notice">Your title statistics could not be loaded.</div></div>${back('showMyStatistics')}`);
    }
  };
})();
