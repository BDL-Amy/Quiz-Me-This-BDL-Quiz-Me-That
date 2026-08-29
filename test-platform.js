/* AMY.TEST CONTROL PLATFORM — SAFE / NON-DESTRUCTIVE */

const TEST_PLATFORM_VERSION = "1.0";
let testPreviewIndex = null;
let testPreviewAnswer = null;

function testGuard(){
  if(!isAmyTestIdentity()){
    showMainMenu();
    return false;
  }
  return true;
}

function testShell(title,content,backFn="showTestMode"){
  page(`
    <div class="section settings">
      <h2 class="center">${html(title)}</h2>
      ${content}
    </div>
    ${back(backFn)}
  `);
}

function testQuestionDate(index){
  const d = new Date(2026,7,11);
  d.setDate(d.getDate()+index);
  return d;
}

function testQuestionDateString(index){
  return dateString(testQuestionDate(index));
}

function testQuestionDateLabel(index){
  return testQuestionDate(index).toLocaleDateString("en-GB",{
    weekday:"short",day:"numeric",month:"short",year:"numeric"
  });
}

function testQuestionIssues(q){
  const issues=[];
  if(!q || typeof q !== "object") return ["Missing question object"];
  if(!String(q.question||"").trim()) issues.push("Missing question text");
  if(!Array.isArray(q.answers) || q.answers.length !== 4) issues.push("Must have exactly 4 answers");
  if(Array.isArray(q.answers) && q.answers.some(a=>!String(a||"").trim())) issues.push("Contains an empty answer option");
  if(!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) issues.push("Invalid correct answer index");
  return issues;
}

showTestMode = function(){
  if(!testGuard()) return;

  const invalid = questions.reduce((n,q)=>n+(testQuestionIssues(q).length?1:0),0);

  page(`
    <div class="section settings">
      <h2 class="center">AMY.TEST</h2>
      <div class="notice">
        <strong>TEST PLATFORM</strong><br>
        Version ${TEST_PLATFORM_VERSION}<br><br>
        Safe mode: previews and tests do not submit quiz answers or create winners.
      </div>

      <div class="menu">
        <button class="settings-button" onclick="showTestSystemCheck()">SYSTEM CHECK</button>
        <button class="settings-button" onclick="showTestQuizPreview()">QUIZ PREVIEW</button>
        <button class="settings-button" onclick="showTestQuestionsAudit()">QUESTIONS</button>
        <button class="settings-button" onclick="showTestStatistics()">STATISTICS</button>
        <button class="settings-button" onclick="showTestHistory()">HISTORY</button>
        <button class="settings-button" onclick="showTestWinnerTests()">WINNER TESTS</button>
        <button class="settings-button" onclick="showTestPush()">PUSH NOTIFICATIONS</button>
      </div>

      <div class="notice" style="margin-top:14px">
        ${questions.length} questions loaded · ${invalid} question${invalid===1?"":"s"} need attention
      </div>
    </div>
    ${back("showMainMenu")}
  `);
};

async function showTestSystemCheck(){
  if(!testGuard()) return;
  testShell("SYSTEM CHECK",`<div class="loading">Running checks...</div>`);

  const checks=[];
  const add=(name,ok,detail)=>checks.push({name,ok,detail});

  add("Amy.TEST identity",isAmyTestIdentity(),playerName()+" · "+playerId());
  add("Question data",questions.every(q=>testQuestionIssues(q).length===0),`${questions.length} loaded`);

  const todayIndex=quizDay();
  add("Current quiz mapping",todayIndex>=0 && todayIndex<questions.length,`Index ${todayIndex} · Question ${questionNumber(todayIndex)}`);

  try{
    const health=await accountApi({action:"health"});
    add("Quiz service",health?.success!==false,"Reachable");
  }catch(e){ add("Quiz service",false,e.message); }

  try{
    const d=await api(RESULTS_SERVICE,{action:"dashboard",player_id:playerId(),week_start:currentWeekStart(),month_start:currentMonthStart()});
    add("Results service",!!d?.success,"Dashboard reachable");
  }catch(e){ add("Results service",false,e.message); }

  try{
    const p=await api(PUSH_SERVICE,{action:"public_key"});
    add("Push service",!!p?.public_key,"Public key available");
  }catch(e){ add("Push service",false,e.message); }

  const cards=checks.map(c=>`
    <div class="settings-card" style="margin:10px 0;border-left:6px solid ${c.ok?'#267c78':'#b42318'}">
      <strong>${c.ok?'✓':'✗'} ${html(c.name)}</strong><br>
      <small style="text-align:left;margin:5px 0 0">${html(c.detail)}</small>
    </div>
  `).join("");

  testShell("SYSTEM CHECK",cards);
}

function showTestQuizPreview(index){
  if(!testGuard()) return;
  if(!Number.isInteger(index)) index=Math.max(0,Math.min(questions.length-1,quizDay()));
  testPreviewIndex=index;
  testPreviewAnswer=null;

  const options=questions.map((q,i)=>`<option value="${i}" ${i===index?'selected':''}>Q${questionNumber(i)} · ${testQuestionDateString(i)}</option>`).join("");

  testShell("QUIZ PREVIEW",`
    <div class="settings-card">
      <label><strong>Preview question</strong></label>
      <select id="testQuestionSelect" onchange="showTestQuizPreview(Number(this.value))" style="width:100%;padding:14px;margin:8px 0 14px;border:2px solid #111;border-radius:12px;font-size:16px">${options}</select>
      <div id="testQuestionPreview"></div>
    </div>
  `);
  renderTestQuestionPreview();
}

function renderTestQuestionPreview(){
  const area=document.getElementById("testQuestionPreview");
  const i=testPreviewIndex;
  const q=questions[i];
  if(!area) return;

  const issues=testQuestionIssues(q);
  if(issues.length){
    area.innerHTML=`<div class="notice"><strong>QUESTION DATA ERROR</strong><br>${issues.map(html).join("<br>")}</div>`;
    return;
  }

  const buttons=q.answers.map((a,n)=>`
    <button onclick="testSelectPreviewAnswer(${n})" style="text-align:left;${testPreviewAnswer===n?'border-width:4px':''}">
      <strong>${String.fromCharCode(65+n)}/</strong> ${html(a)}
    </button>
  `).join("");

  area.innerHTML=`
    <small style="margin-bottom:8px">${html(testQuestionDateLabel(i))} · Question ${questionNumber(i)}</small>
    <p><strong>${html(q.question)}</strong></p>
    ${buttons}
    <button class="settings-button" onclick="testEvaluatePreview()" ${testPreviewAnswer===null?'disabled':''}>CHECK TEST ANSWER</button>
    <div id="testPreviewResult"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button onclick="showTestQuizPreview(${Math.max(0,i-1)})" ${i===0?'disabled':''}>PREVIOUS</button>
      <button onclick="showTestQuizPreview(${Math.min(questions.length-1,i+1)})" ${i===questions.length-1?'disabled':''}>NEXT</button>
    </div>
  `;
}

function testSelectPreviewAnswer(n){
  testPreviewAnswer=n;
  renderTestQuestionPreview();
}

function testEvaluatePreview(){
  const q=questions[testPreviewIndex];
  const area=document.getElementById("testPreviewResult");
  if(!q || !area || testPreviewAnswer===null) return;
  const ok=testPreviewAnswer===q.correct;
  area.innerHTML=`<div class="notice"><strong>${ok?'✓ CORRECT':'✗ INCORRECT'}</strong><br>Correct answer: ${String.fromCharCode(65+q.correct)}/ ${html(q.answers[q.correct])}<br><small style="margin:6px 0 0">Test only — nothing was saved.</small></div>`;
}

function showTestQuestionsAudit(){
  if(!testGuard()) return;
  const today=quizDay();
  let invalid=0;
  const rows=questions.map((q,i)=>{
    const issues=testQuestionIssues(q);
    if(issues.length) invalid++;
    const state=i<today?"RELEASED":i===today?"TODAY":"FUTURE";
    return `<div class="settings-card" style="margin:9px 0;text-align:left">
      <strong>Q${questionNumber(i)} · ${html(testQuestionDateString(i))}</strong><br>
      <small style="text-align:left;margin:4px 0">${state} · ${issues.length?'⚠ '+html(issues.join(' · ')):'✓ Data OK'}</small>
      <div>${html(String(q?.question||"(no question text)"))}</div>
      <button onclick="showTestQuizPreview(${i})">PREVIEW</button>
    </div>`;
  }).join("");

  testShell("QUESTIONS",`
    <div class="notice"><strong>${questions.length} TOTAL</strong><br>${invalid} need attention</div>
    ${rows}
  `);
}

async function showTestStatistics(){
  if(!testGuard()) return;
  testShell("STATISTICS",`<div class="loading">Loading Amy.TEST statistics...</div>`);

  try{
    const d=await api(RESULTS_SERVICE,{action:"dashboard",player_id:playerId(),week_start:currentWeekStart(),month_start:currentMonthStart()});
    const s=d.lifetime||{};
    testShell("STATISTICS",`
      <div class="stat-grid">
        <div class="stat-card"><strong>${s.played??0}</strong>Played</div>
        <div class="stat-card"><strong>${s.correct??0}</strong>Correct</div>
        <div class="stat-card"><strong>${s.incorrect??0}</strong>Incorrect</div>
        <div class="stat-card"><strong>${s.accuracy??0}%</strong>Accuracy</div>
      </div>
      <div class="notice"><strong>COMPETITION STATUS</strong><br>Amy.TEST is intentionally excluded from weekly and monthly rankings and winner selection.</div>
      <button class="settings-button" onclick="showTestStatistics()">REFRESH</button>
    `);
  }catch(e){
    testShell("STATISTICS",`<div class="notice">Statistics could not be loaded.<br>${html(e.message)}</div>`);
  }
}

function showTestHistory(){
  if(!testGuard()) return;
  const last=historyReleasedLastIndex();
  const released=Math.max(0,last+1);
  testShell("HISTORY",`
    <div class="notice"><strong>${released}</strong> previous question${released===1?'':'s'} currently released in History.</div>
    <div class="menu">
      <button class="settings-button" onclick="showPreviousQuestions()">OPEN PREVIOUS QUESTIONS</button>
      <button class="settings-button" onclick="showWeeklyWallOfFame()">OPEN WEEKLY WALL OF FAME</button>
      <button class="settings-button" onclick="showSupremeWallOfFame()">OPEN SUPREME WALL OF FAME</button>
    </div>
    <div class="notice">History uses the real read-only player history. Opening one of these views leaves TEST MODE; use Back until you return to the main menu, then reopen TEST MODE.</div>
  `);
}

function weeklyRuleSimulation(candidates){
  let eligible=candidates.filter(c=>!c.cooldown);
  let fallback=false;
  if(!eligible.length){ eligible=candidates.slice(); fallback=true; }
  if(!eligible.length) return {winner:null,lottery:false,fallback};
  const bestCorrect=Math.max(...eligible.map(c=>c.correct));
  eligible=eligible.filter(c=>c.correct===bestCorrect);
  const bestPlayed=Math.max(...eligible.map(c=>c.played));
  eligible=eligible.filter(c=>c.played===bestPlayed);
  return {winner:eligible.length===1?eligible[0]:null,lottery:eligible.length>1,candidates:eligible,fallback};
}

function showTestWinnerTests(){
  if(!testGuard()) return;
  const cases=[
    {name:"Best score wins",in:[{name:"A",correct:7,played:7,cooldown:false},{name:"B",correct:6,played:7,cooldown:false}],expect:"A"},
    {name:"Days played breaks score tie",in:[{name:"A",correct:6,played:6,cooldown:false},{name:"B",correct:6,played:7,cooldown:false}],expect:"B"},
    {name:"Exact tie requires lottery",in:[{name:"A",correct:6,played:7,cooldown:false},{name:"B",correct:6,played:7,cooldown:false}],lottery:true},
    {name:"Cooldown player is skipped",in:[{name:"A",correct:7,played:7,cooldown:true},{name:"B",correct:6,played:7,cooldown:false}],expect:"B"},
    {name:"All in cooldown uses fallback",in:[{name:"A",correct:7,played:7,cooldown:true},{name:"B",correct:6,played:7,cooldown:true}],expect:"A",fallback:true}
  ];
  const rows=cases.map(c=>{
    const r=weeklyRuleSimulation(c.in);
    const pass=(c.lottery? r.lottery : r.winner?.name===c.expect) && (c.fallback===undefined || r.fallback===c.fallback);
    const result=r.lottery?`Lottery: ${r.candidates.map(x=>x.name).join(', ')}`:`Winner: ${r.winner?.name||'none'}`;
    return `<div class="settings-card" style="margin:10px 0;border-left:6px solid ${pass?'#267c78':'#b42318'}"><strong>${pass?'✓ PASS':'✗ FAIL'} · ${html(c.name)}</strong><br><small style="text-align:left;margin:5px 0 0">${html(result)}${r.fallback?' · cooldown fallback':''}</small></div>`;
  }).join("");

  testShell("WINNER TESTS",`
    <div class="notice">Rule simulator only. It does not create or change a real winner.</div>
    ${rows}
    <div class="settings-card" style="margin-top:12px">
      <strong>Monthly rule check</strong>
      <p>Performance wins remain possible even after a previous lottery win. A lottery win only skips the next monthly lottery opportunity.</p>
      <div><strong>✓ SAFE RULE SET</strong></div>
    </div>
  `);
}

async function showTestPush(){
  if(!testGuard()) return;
  let permission=("Notification" in window)?Notification.permission:"unsupported";
  let subscribed=false;
  try{ subscribed=!!(await getCurrentPushSubscription()); }catch(e){}

  testShell("PUSH NOTIFICATIONS",`
    <div class="settings-card">
      <p><strong>Browser permission:</strong> ${html(permission)}</p>
      <p><strong>Quiz subscription:</strong> ${subscribed?'ACTIVE':'NOT ACTIVE'}</p>
    </div>
    <div class="notice">The test below sends a notification only to this device. It never sends a push notification to real players.</div>
    <button class="settings-button" onclick="runLocalPushTest()">TEST THIS DEVICE</button>
  `);
}

async function runLocalPushTest(){
  if(!testGuard()) return;
  try{
    if(!("Notification" in window)) throw new Error("Notifications are not supported on this device/browser.");
    let permission=Notification.permission;
    if(permission!=="granted") permission=await Notification.requestPermission();
    if(permission!=="granted") throw new Error("Notification permission was not granted.");

    if("serviceWorker" in navigator){
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification("Amy.TEST — Push Test",{
        body:"This is a private test notification on this device only.",
        tag:"amy-test-local-push"
      });
    }else{
      new Notification("Amy.TEST — Push Test",{body:"This is a private test notification on this device only."});
    }
    alert("Test notification sent to this device only.");
  }catch(e){
    alert(e.message || "The local push test failed.");
  }
}
