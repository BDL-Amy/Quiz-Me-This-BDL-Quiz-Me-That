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
    const allRows=buildTitleRanking(data);
    const rows=allRows.slice(0,20);
    const totalPlayers=allRows.length;
    let body='';
    if(!rows.length){
      body='<div class="notice">No title winners are available yet.</div>';
    }else{
      body='<div class="title-leaderboard">';
      rows.forEach(row=>{
        const me=String(row.player_name||'').toLowerCase()===String(playerName()||'').toLowerCase();
        body+=`<div class="title-leader-card ${me?'me':''}">
          <div class="title-leader-head">
            <strong class="title-leader-rank">#${row.rank}</strong>
            <span class="title-leader-name">${html(row.player_name)}</span>
          </div>
          <div class="title-leader-stats">
            <div class="title-leader-stat"><span>Smartest wins</span><strong>${row.smartest}</strong></div>
            <div class="title-leader-stat"><span>Supreme wins</span><strong>${row.supreme}</strong></div>
            <div class="title-leader-stat"><span>Title Points</span><strong>${row.points}</strong></div>
          </div>
        </div>`;
      });
      body+='</div>';
    }
    return `<div class="section stats" style="margin-top:18px">
      <h2 class="center">TITLE TOP 20 — ALL TIME</h2>
      <div class="notice" style="border:1px solid var(--stats-light)">The Title Top 20 is separate from the general quiz ranking.</div>
      <div class="notice" style="border:1px solid var(--stats-light);font-weight:bold">TOTAL: ${totalPlayers} ${totalPlayers===1?'PLAYER':'PLAYERS'}</div>
      ${body}
    </div>`;
  }

  const grandmasterNumber=value=>{
    const number=Number(value);
    return Number.isFinite(number)?number:0;
  };

  const grandmasterScore=(value,maximum)=>`${grandmasterNumber(value).toFixed(2)} / ${maximum}`;

  function grandmasterLeaderboard(data){
    const grandmaster=data?.grandmaster||{};
    const rows=Array.isArray(grandmaster.leaderboard)?grandmaster.leaderboard:[];
    if(data?.ranking_access!==true){
      return `<div class="notice">Your results are private. Join the rankings in Personal Settings to view the Grandmaster Top 20.</div>`;
    }
    if(!rows.length){
      return `<div class="notice">No Grandmaster ranking data is available yet.</div>`;
    }
    let body='<div class="title-leaderboard">';
    rows.forEach(row=>{
      const me=String(row.player_name||'').toLowerCase()===String(playerName()||'').toLowerCase();
      body+=`<div class="title-leader-card ${me?'me':''}">
        <div class="title-leader-head">
          <strong class="title-leader-rank">#${row.rank}</strong>
          <span class="title-leader-name">${html(row.player_name)}</span>
          <strong style="margin-left:auto;color:var(--stats);font-size:20px">${grandmasterNumber(row.grandmaster_score).toFixed(2)}</strong>
        </div>
        <div class="title-leader-stats">
          <div class="title-leader-stat"><span>Correct</span><strong>${grandmasterNumber(row.correct_score).toFixed(2)}</strong></div>
          <div class="title-leader-stat"><span>Participation</span><strong>${grandmasterNumber(row.participation_score).toFixed(2)}</strong></div>
          <div class="title-leader-stat"><span>Accuracy</span><strong>${grandmasterNumber(row.accuracy_score).toFixed(2)}</strong></div>
        </div>
        <div class="title-leader-stats" style="border-top:1px solid #eee">
          <div class="title-leader-stat"><span>Title Points</span><strong>${grandmasterNumber(row.title_points_score).toFixed(2)}</strong></div>
          <div class="title-leader-stat"><span>Supreme</span><strong>${grandmasterNumber(row.supreme_score).toFixed(2)}</strong></div>
          <div class="title-leader-stat"><span>Weekly</span><strong>${grandmasterNumber(row.weekly_score).toFixed(2)}</strong></div>
        </div>
      </div>`;
    });
    body+='</div>';
    return body;
  }

  function grandmasterPersonal(data){
    const grandmaster=data?.grandmaster||{};
    const player=grandmaster.player;
    const year=grandmaster.year||new Date().getFullYear();
    if(!player){
      return `<div class="notice">You do not have a Grandmaster score for ${year} yet.</div>`;
    }
    return `<div class="title-summary">
      <h2 class="center">THE BDL GRANDMASTER ${year}</h2>
      <div class="stat-card" style="margin:12px 0 16px"><strong>${grandmasterNumber(player.grandmaster_score).toFixed(2)}</strong>Your Grandmaster Score / 100</div>
      <div class="stat-grid">
        <div class="stat-card"><strong>${grandmasterScore(player.correct_score,45)}</strong>Correct answers</div>
        <div class="stat-card"><strong>${grandmasterScore(player.participation_score,25)}</strong>Participation</div>
        <div class="stat-card"><strong>${grandmasterScore(player.accuracy_score,15)}</strong>Accuracy</div>
        <div class="stat-card"><strong>${grandmasterScore(player.title_points_score,10)}</strong>Total Title Points</div>
        <div class="stat-card"><strong>${grandmasterScore(player.supreme_score,4)}</strong>Supreme Title Points</div>
        <div class="stat-card"><strong>${grandmasterScore(player.weekly_score,1)}</strong>Weekly Title Points</div>
      </div>
      <div class="title-points-note" style="text-align:left">
        <strong>YOUR YEAR SO FAR</strong><br><br>
        ${player.correct} correct answers from ${player.available_questions} available questions ·
        ${player.played} participations · ${grandmasterNumber(player.accuracy).toFixed(2)}% accuracy<br><br>
        ${player.title_points} of ${player.possible_title_points} total Title Points ·
        ${player.supreme_wins} Supreme win${player.supreme_wins===1?'':'s'} ·
        ${player.smartest_wins} Weekly win${player.smartest_wins===1?'':'s'}
      </div>
      <div class="title-points-note title-points-calculation">
        <h3>GRANDMASTER FORMULA</h3>
        <div class="title-point-rule"><span>Correct answers</span><strong>45%</strong></div>
        <div class="title-point-rule"><span>Participation</span><strong>25%</strong></div>
        <div class="title-point-rule"><span>Accuracy</span><strong>15%</strong></div>
        <div class="title-point-rule"><span>Total Title Points</span><strong>10%</strong></div>
        <div class="title-point-rule"><span>Supreme Title Points</span><strong>4%</strong></div>
        <div class="title-point-rule"><span>Weekly Title Points</span><strong>1%</strong></div>
        <div class="title-point-total"><span>TOTAL</span><strong>100%</strong></div>
      </div>
    </div>`;
  }

  function grandmasterWinners(data){
    const rows=Array.isArray(data?.grandmaster?.official_winners)?data.grandmaster.official_winners:[];
    if(!rows.length)return '';
    const cards=rows.map((row,index)=>`<div class="wall-card month">
      <strong>${index===0?'REIGNING BDL GRANDMASTER':'BDL GRANDMASTER'} ${row.competition_year}</strong>
      <h3>${html(row.player_name)}</h3>
      <div>${grandmasterNumber(row.grandmaster_score).toFixed(2)} / 100</div>
    </div>`).join('');
    return `<div class="section stats grandmaster-theme" style="margin-top:18px"><h2 class="center">GRANDMASTER TITLE HOLDERS</h2>${cards}</div>`;
  }

  async function getStatsDashboard(){
    page('<div class="loading">Loading your statistics...</div>');
    return await loadDashboard();
  }

  window.showMyStatistics=function(){
    page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="menu">
      <button onclick="showStatisticsPeriod('week')" style="border-color:var(--stats);font-weight:bold">THIS WEEK</button>
      <button onclick="showStatisticsPeriod('month')" style="border-color:var(--stats);font-weight:bold">THIS MONTH</button>
      <button onclick="showStatisticsPeriod('all')" style="border-color:var(--stats);font-weight:bold">TOP 20 ALL TIME</button>
      <button onclick="showMyTitles()" style="border-color:var(--stats);font-weight:bold">MY TITLES</button>
      <button onclick="showGrandmaster()" style="border-color:var(--grandmaster);color:var(--grandmaster);font-weight:bold">GRANDMASTER</button>
    </div></div>${back('showMainMenu')}`);
  };

  window.showStatisticsPeriod=async function(type){
    try{
      const data=await getStatsDashboard();
      let title='THIS WEEK',stats=data?.week?.player||{},ranking=data?.week,topTitle='QUIZ TOP 20 — THIS WEEK';
      if(type==='month'){
        title='THIS MONTH';stats=data?.month?.player||{};ranking=data?.month;topTitle='QUIZ TOP 20 — THIS MONTH';
      }else if(type==='all'){
        title='ALL TIME';stats=data?.lifetime||{};ranking=data?.top20;topTitle='QUIZ TOP 20 — ALL TIME';
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

  window.showGrandmaster=async function(backTarget){
    const returnTo=backTarget==='showQuizMenu'?'showQuizMenu':'showMyStatistics';
    try{
      const data=await getStatsDashboard();
      const year=data?.grandmaster?.year||new Date().getFullYear();
      const personal=grandmasterPersonal(data);
      const ranking=grandmasterLeaderboard(data);
      const total=data?.ranking_access===true?`<div class="notice" style="font-weight:bold">TOTAL: ${grandmasterNumber(data?.grandmaster?.total_players)} ${grandmasterNumber(data?.grandmaster?.total_players)===1?'PLAYER':'PLAYERS'}</div>`:'';
      page(`<div class="section stats grandmaster-theme" style="background:var(--stats-bg);border:2px solid var(--stats-light);border-top:7px solid var(--stats)">
        ${personal}
      </div>
      <div class="section stats grandmaster-theme" style="margin-top:18px">
        <h2 class="center">GRANDMASTER ${year} — LIVE TOP 20</h2>
        <div class="notice">The live score is recalculated per category. The official annual title is awarded after the year has ended.</div>
        ${total}
        ${ranking}
      </div>${grandmasterWinners(data)}${back(returnTo)}`);
    }catch(e){
      page(`<div class="section stats grandmaster-theme"><h2 class="center">GRANDMASTER</h2><div class="notice">The Grandmaster ranking could not be loaded.</div></div>${back(returnTo)}`);
    }
  };
})();
