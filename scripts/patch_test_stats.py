from pathlib import Path

p = Path('recovery-onboarding.js')
s = p.read_text()

start = s.index('function bdlRenderStatisticsPeriod(type){')
end = s.index('\nshowMyStatistics=async function(){', start)
player_renderer = r'''function bdlRenderStatisticsPeriod(type){
  if(!dashboardCache)return;
  const data=dashboardCache;
  const area=document.getElementById("bdlStatsPeriodArea");
  if(!area)return;
  ["week","month","all"].forEach(key=>document.getElementById(`bdlStatsTab-${key}`)?.classList.toggle("active",key===type));
  const stats=bdlStatsBlock(data,type);
  const label=type==="week"?"THIS WEEK":type==="month"?"THIS MONTH":"ALL TIME";
  let titleSection="";
  if(type==="all"){
    const titleRows=bdlTitleRowsForPeriod(data,"all");
    const me=titleRows.find(row=>String(row.player_name).toLowerCase()===String(playerName()).toLowerCase())||{smartest:0,supreme:0,points:0};
    titleSection=`
      <div class="title-summary">
        <h3 class="center">MY TITLES</h3>
        <div class="stat-grid">
          <div class="stat-card"><strong>${me.smartest}</strong>Smartest wins</div>
          <div class="stat-card"><strong>${me.supreme}</strong>Supreme wins</div>
        </div>
        <div class="stat-card" style="margin-top:10px"><strong>${me.points}</strong>Title Points</div>
        <div class="title-points-note"><strong>HOW TITLE POINTS ARE CALCULATED</strong><br><br>Smartest BDL'er of the Week = <strong>1 point per win</strong><br>Supreme BDL'er of the Month = <strong>4 points per win</strong><br><br><strong>Total Title Points = Smartest wins + (Supreme wins × 4)</strong></div>
      </div>
      <h3 class="center" style="margin-top:28px">TITLE TOP 20 — ALL TIME</h3>
      <div class="title-points-note">The Title Top 20 is separate from the general quiz ranking.</div>
      ${bdlRenderTitleTop20(data,"all")}`;
  }
  area.innerHTML=`
    <h3 class="center" style="margin-top:18px">${label}</h3>
    <div class="stat-grid">
      <div class="stat-card"><strong>${stats.played}</strong>Played</div>
      <div class="stat-card"><strong>${stats.correct}</strong>Correct</div>
      <div class="stat-card"><strong>${stats.incorrect}</strong>Incorrect</div>
      <div class="stat-card"><strong>${stats.accuracy}%</strong>Accuracy</div>
    </div>
    <h3 class="center" style="margin-top:28px">QUIZ TOP 20 — ${label}</h3>
    ${bdlRenderGeneralTop20(data,type)}
    ${titleSection}
  `;
}
'''
s = s[:start] + player_renderer + s[end:]

marker = '/* TEST STATISTICS PERIOD VIEW */'
if marker in s:
    s = s[:s.index(marker)].rstrip() + '\n'

test_block = r'''

/* TEST STATISTICS PERIOD VIEW */
function bdlTestGeneralTop20(data,type){
  const block=type==="all"?(data?.top20||{}):(data?.[type]||{});
  const rows=Array.isArray(block.leaderboard)?block.leaderboard.slice(0,20):[];
  if(!rows.length)return `<div class="notice">No ranking data is available yet.</div>`;
  const body=rows.map(row=>`<div class="leader-row"><strong>#${row.rank}</strong><span>${html(row.player_name)}</span><span>${row.correct??0} correct<br><small style="margin:0;text-align:right">${row.played??0} played</small></span></div>`).join("");
  return `<div class="leaderboard">${body}</div>`;
}

function bdlTestStatisticsPeriod(type){
  const data=dashboardCache;
  const area=document.getElementById("bdlTestStatsPeriodArea");
  if(!data||!area)return;
  ["week","month","all"].forEach(key=>document.getElementById(`bdlTestStatsTab-${key}`)?.classList.toggle("active",key===type));
  const stats=bdlStatsBlock(data,type);
  const label=type==="week"?"THIS WEEK":type==="month"?"THIS MONTH":"ALL TIME";
  let titleSection="";
  if(type==="all"){
    titleSection=`
      <h3 class="center" style="margin-top:28px">TITLE TOP 20 — ALL TIME</h3>
      <div class="title-points-note">Test accounts can view this read-only title ranking for verification.</div>
      ${bdlRenderTitleTop20(data,"all")}`;
  }
  area.innerHTML=`
    <h3 class="center" style="margin-top:18px">${label}</h3>
    <div class="stat-grid">
      <div class="stat-card"><strong>${stats.played}</strong>Played</div>
      <div class="stat-card"><strong>${stats.correct}</strong>Correct</div>
      <div class="stat-card"><strong>${stats.incorrect}</strong>Incorrect</div>
      <div class="stat-card"><strong>${stats.accuracy}%</strong>Accuracy</div>
    </div>
    <h3 class="center" style="margin-top:24px">QUIZ TOP 20 — ${label}</h3>
    ${bdlTestGeneralTop20(data,type)}
    ${titleSection}
    <div class="notice"><strong>TEST ACCOUNT</strong><br>This is a read-only admin/test view. Test accounts remain excluded from rankings and winner selection.</div>`;
}

showTestStatistics=async function(){
  if(!testGuard())return;
  const label=typeof bdlTestAccountLabel==="function"?bdlTestAccountLabel():"TEST";
  testShell("STATISTICS",`<div class="loading">Loading ${html(label)} statistics...</div>`);
  try{
    const d=await api(RESULTS_SERVICE,{action:"dashboard",player_id:playerId(),week_start:currentWeekStart(),month_start:currentMonthStart()});
    dashboardCache=d;
    testShell("STATISTICS",`
      <div class="notice"><strong>${html(label)}</strong><br>Read-only test access to statistics and rankings.</div>
      <div class="tabs" style="display:grid;grid-template-columns:1fr 1fr 1fr">
        <button id="bdlTestStatsTab-week" class="active" onclick="bdlTestStatisticsPeriod('week')">THIS WEEK</button>
        <button id="bdlTestStatsTab-month" onclick="bdlTestStatisticsPeriod('month')">THIS MONTH</button>
        <button id="bdlTestStatsTab-all" onclick="bdlTestStatisticsPeriod('all')">ALL TIME</button>
      </div>
      <div id="bdlTestStatsPeriodArea"></div>
      <button class="settings-button" onclick="showTestStatistics()">REFRESH</button>
    `);
    bdlTestStatisticsPeriod("week");
  }catch(e){
    testShell("STATISTICS",`<div class="notice">Statistics could not be loaded.<br>${html(e.message)}</div>`);
  }
};
'''

p.write_text(s.rstrip() + test_block + '\n')
