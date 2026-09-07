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

  function titleTop20(data){
    const rows=buildTitleRanking(data).slice(0,20);
    let body='';
    if(!rows.length){
      body='<div class="notice">No title winners are available yet.</div>';
    }else{
      body=`<div style="background:#fff;border:1px solid var(--stats-light);border-radius:14px;overflow:hidden;min-width:500px">
        <div style="display:grid;grid-template-columns:34px minmax(105px,1fr) 64px 64px 54px 58px;align-items:center;gap:4px;padding:10px 8px;background:var(--stats);color:#fff;font-size:10px;font-weight:bold;text-align:center">
          <span>#</span><span style="text-align:left">PLAYER</span><span>SMARTEST</span><span>SUPREME</span><span>TOTAL</span><span>POINTS</span>
        </div>`;
      rows.forEach(row=>{
        const me=String(row.player_name||'').toLowerCase()===String(playerName()||'').toLowerCase();
        const total=(row.smartest??0)+(row.supreme??0);
        body+=`<div style="display:grid;grid-template-columns:34px minmax(105px,1fr) 64px 64px 54px 58px;align-items:center;gap:4px;padding:12px 8px;border-top:1px solid #eee;${me?'background:var(--stats-light);':''}text-align:center">
          <strong style="color:var(--stats)">#${row.rank}</strong>
          <strong style="text-align:left;overflow-wrap:anywhere">${html(row.player_name)}</strong>
          <span>${row.smartest}</span>
          <span>${row.supreme}</span>
          <strong>${total}</strong>
          <strong style="color:var(--stats);font-size:18px">${row.points}</strong>
        </div>`;
      });
      body+='</div>';
    }
    return `<div class="section stats" style="margin-top:18px">
      <h2 class="center">TITLE TOP 20 — ALL TIME</h2>
      <div class="notice" style="border:1px solid var(--stats-light)">The Title Top 20 is separate from the general quiz ranking.</div>
      <div style="overflow-x:auto">${body}</div>
    </div>`;
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
      const ranking=data?.ranking_access===true?titleTop20(data):`<div class="section stats" style="margin-top:18px"><h2 class="center">TITLE TOP 20 — ALL TIME</h2><div class="notice">Your results are private. Join the rankings in Personal Settings to view the Title Top 20.</div></div>`;
      page(`<div class="section stats" style="background:var(--stats-bg);border:2px solid var(--stats-light);border-top:7px solid var(--stats)">${personal}</div>${ranking}${back('showMyStatistics')}`);
    }catch(e){
      page(`<div class="section stats"><h2 class="center">MY TITLES</h2><div class="notice">Your title statistics could not be loaded.</div></div>${back('showMyStatistics')}`);
    }
  };
})();
