/* One-time recovery-code onboarding for existing BDL players. */

const RECOVERY_ONBOARDING_KEY = "bdlRecoveryOnboardingSavedV1";
let recoveryOnboardingChecked = false;

async function checkExistingPlayerRecoveryOnboarding(){
  if(recoveryOnboardingChecked) return false;
  recoveryOnboardingChecked = true;

  const id = localStorage.getItem("bdlPlayerId");
  const name = localStorage.getItem("bdlPlayerName");

  if(!id || !name) return false;
  if(localStorage.getItem(RECOVERY_ONBOARDING_KEY) === "yes") return false;

  try{
    const status = await accountApi({action:"recovery_status",player_id:id,player_name:name});
    if(status.recovery_enabled){localStorage.setItem(RECOVERY_ONBOARDING_KEY,"yes");return false;}
    const data = await accountApi({action:"register_player",player_id:id,player_name:name});
    if(!data.recovery_code) return false;
    showExistingPlayerRecoveryNotice(data.recovery_code);
    return true;
  }catch(error){
    console.log("Recovery onboarding will be tried again later.");
    recoveryOnboardingChecked = false;
    return false;
  }
}

function showExistingPlayerRecoveryNotice(code){
  document.getElementById("mainHeader").style.display = "none";
  page(`
    <div class="section settings">
      <h2 class="center">IMPORTANT — SAVE YOUR RECOVERY CODE</h2>
      <div class="settings-card center">
        <p>Your player account now has a recovery code. You will need this code if you change or lose your device.</p>
        <p><strong>Keep it somewhere safe.</strong></p>
        <div class="notice" style="font-size:22px;font-weight:bold;letter-spacing:1px;word-break:break-word">${html(code)}</div>
        <p>This code is shown only now. You can generate a new code later in Personal Settings.</p>
        <button class="settings-button" onclick="confirmExistingRecoverySaved()">I HAVE SAVED MY CODE</button>
      </div>
    </div>`);
}

function confirmExistingRecoverySaved(){localStorage.setItem(RECOVERY_ONBOARDING_KEY,"yes");showStartScreen();}

/* Question 49 repair: remove the accidental empty slot directly before the Bubu money question. */
if(typeof questions !== "undefined"){
  const q49Index = 49 - FIRST_QUESTION_NUMBER;
  const slot = questions[q49Index];
  const next = questions[q49Index + 1];
  if(slot && !slot.question && next && next.question === "Bubu found a big bag with a lot of money once. What did she do with it?") questions.splice(q49Index,1);
}

setTimeout(()=>{checkExistingPlayerRecoveryOnboarding();},0);

const BDL_RESULT_WORDS = {
  Bubu:"Bubulicious",Dudu:"Dudusational",Alec:"Aleccredible",Masha:"Mashazing",
  Nick:"Nicktacular",Max:"Maxitastic",Tofi:"Tofeerific",Amy:"Amydorable",
  Babs:"Babsolutely",Linda:"Lindazzling",Dip:"Diphenomenal",Mona:"Monarvel",
  Cassandra:"Cassaglamorous",Moly:"Molyficent",Raka:"Rakabulous",Muzo:"Muzovely",Dora:"Doravishing"
};
const BDL_RESULT_OTHERS = ["Amy","Babs","Linda","Dip","Mona","Cassandra","Moly","Raka","Muzo","Dora"];

function bdlQuestionDate(index){const d=new Date(2026,7,11);d.setDate(d.getDate()+index);return d;}
function bdlMondayForDate(date){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d;}
function bdlDayNumber(date){return Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);}
function bdlSeededRandom(seed){let x=(seed>>>0)||1;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}

function bdlWeeklyResultCharacters(monday){
  const weekSerial=Math.floor(bdlDayNumber(monday)/7);
  const adult=weekSerial%2===0?"Alec":"Masha";
  const kids=["Nick","Max","Tofi"];
  const kid=kids[((weekSerial%kids.length)+kids.length)%kids.length];
  const otherStart=(((weekSerial*3)%BDL_RESULT_OTHERS.length)+BDL_RESULT_OTHERS.length)%BDL_RESULT_OTHERS.length;
  const others=[];
  for(let i=0;i<3;i++) others.push(BDL_RESULT_OTHERS[(otherStart+i)%BDL_RESULT_OTHERS.length]);
  const week=["Bubu","Dudu",adult,kid,...others];
  const random=bdlSeededRandom(bdlDayNumber(monday)^0x42444c);
  for(let i=week.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[week[i],week[j]]=[week[j],week[i]];}
  return week;
}

function bdlResultCharacterForIndex(index){const date=bdlQuestionDate(index);const schedule=bdlWeeklyResultCharacters(bdlMondayForDate(date));const day=date.getDay()||7;return schedule[day-1];}
function bdlResultWordForIndex(index){return BDL_RESULT_WORDS[bdlResultCharacterForIndex(index)]||"Correct";}

/* Yesterday's answer: show the player's answer first, then the correct answer and feedback. */
showYesterdayPage = async function(){
  const index=quizDay()-1;
  const q=questions[index];
  if(index<0||!q||!q.question||!Array.isArray(q.answers)){
    page(`<div class="section quiz-section"><h2 class="center">YESTERDAY'S ANSWER</h2><div class="notice">Yesterday's answer is not available.</div></div>${back("showQuizMenu")}`);
    return;
  }

  let selected=savedAnswer(index);
  try{
    const data=await api(QUIZ_SERVICE,{action:"get_answer",player_id:playerId(),question_num:questionNumber(index)});
    if(data.answered&&data.answer){
      const letter=String(data.answer.answer||"").trim().toUpperCase();
      const answerIndex=["A","B","C","D"].indexOf(letter);
      if(answerIndex>=0) selected=answerIndex;
    }
  }catch(error){console.log("Using local answer.");}

  const correct=q.correct;
  const answerSentence=`<div class="answer" style="margin-top:18px"><strong>The correct answer is ${html(q.answers[correct])}.</strong></div>`;

  let playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`;
  let personalResult=`<div class="notice"><strong>Oops, this one slipped by!</strong><br><br>No worries — today's question is waiting for you.</div>`;

  if(selected!==null){
    const isCorrect=selected===correct;
    playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>${html(q.answers[selected])}</div>`;
    personalResult=isCorrect
      ? `<div class="notice"><strong>${html(bdlResultWordForIndex(index))}!</strong><br><br>You got it right!</div>`
      : `<div class="notice"><strong>Better luck next time!</strong><br><br>A new day, a new chance — today's question is waiting for you.</div>`;
  }

  page(`<div class="section quiz-section"><h2 class="center">YESTERDAY'S ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${playerAnswer}${answerSentence}${personalResult}</div>${back("showQuizMenu")}`);
};

/* Both dedicated test accounts use the same safe, non-submitting test platform. */
if(typeof testGuard === "function"){
  testGuard = function(){
    if(!isTestIdentity()){
      showMainMenu();
      return false;
    }
    return true;
  };
}

function bdlTestAccountLabel(){
  return isDrBDLTestIdentity()?"DrBDL.test":"Amy.test";
}

if(typeof showTestMode === "function"){
  showTestMode = function(){
    if(!testGuard()) return;
    const label=bdlTestAccountLabel();
    page(`
      <div class="section settings">
        <h2 class="center">${html(label)}</h2>
        <div class="notice"><strong>CHOOSE MODE</strong><br><br>This test account has three separate ways to use the quiz.</div>
        <div class="menu">
          <button class="settings-button" onclick="showMainMenu()">NORMAL MODE</button>
          <button class="settings-button" onclick="showTestControlPlatform()">TEST MODE</button>
          <button class="settings-button" onclick="showTestPlay()">TEST PLAY</button>
        </div>
        <div class="settings-card" style="margin-top:14px;text-align:left">
          <p><strong>NORMAL MODE</strong><br>Use the quiz like a regular player.</p>
          <p><strong>TEST MODE</strong><br>Inspect questions, systems, statistics, history, winner rules and notifications.</p>
          <p><strong>TEST PLAY</strong><br>Play any question as often as you want. Nothing is submitted and nothing counts towards statistics, rankings or winner selection.</p>
        </div>
      </div>
      ${back("showMainMenu")}
    `);
  };
}

/* Player-facing daily question: keep A/B/C/D internally, but never display them. */
showTodayQuestion = function(){
  const index=quizDay();
  const q=questions[index];
  if(!q||!q.question||!Array.isArray(q.answers)){
    page(`<div class="section quiz-section"><h2 class="center">TODAY'S QUESTION</h2><div class="notice">Today's question is not available yet.</div></div>${back("showQuizMenu")}`);
    return;
  }
  const existing=savedAnswer(index);
  selectedAnswer=existing;
  let answersHtml="";
  q.answers.forEach((answer,i)=>{
    const selected=existing===i?"selected":"";
    const click=existing===null?`onclick="selectAnswer(${i})"`:"";
    answersHtml+=`<button id="answer-${i}" class="${selected}" ${click}>${html(answer)}</button>`;
  });
  if(existing!==null){
    page(`<div class="section quiz-section"><h2 class="center">QUESTION ${questionNumber(index)}</h2><div class="notice">You already answered today's question.</div><h3>${html(q.question)}</h3>${answersHtml}<div class="answer"><strong>Your answer:</strong><br><br>${html(q.answers[existing])}</div><p class="center">The correct answer will be revealed tomorrow.</p></div>${back("showQuizMenu")}`);
    return;
  }
  page(`<div class="section quiz-section"><h2 class="center">QUESTION ${questionNumber(index)}</h2><h3>${html(q.question)}</h3><div id="answerButtons">${answersHtml}</div><button id="submitButton" class="center" onclick="submitAnswer()" disabled>SUBMIT ANSWER</button></div>${back("showQuizMenu")}`);
};

showThankYouPage = function(){
  const index=quizDay();
  const q=questions[index];
  const chosen=savedAnswer(index);
  if(!q||chosen===null){showQuizMenu();return;}
  page(`<div class="section quiz-section center"><h2>${html(playerName())}, thanks for playing today!</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>The question was:</p><p><strong>${html(q.question)}</strong></p><p>You answered:</p><div class="answer">${html(q.answers[chosen])}</div><p>Stay tuned! The correct answer will be revealed tomorrow together with a new Daily Quiz.</p></div>${back("showQuizMenu")}`);
};

/* Test play remains unlimited and mirrors the player-facing answer display without letters. */
if(typeof renderTestPlay === "function"){
  renderTestPlay = function(){
    if(!testGuard()) return;
    const i=testPlayIndex;
    const q=questions[i];
    const options=questions.map((item,n)=>`<option value="${n}" ${n===i?'selected':''}>Q${questionNumber(n)} · ${testQuestionDateString(n)}</option>`).join("");
    const issues=testQuestionIssues(q);
    page(`
      <div class="section quiz-section">
        <h2 class="center">${html(bdlTestAccountLabel())} — TEST PLAY</h2>
        <div class="notice"><strong>UNRESTRICTED PLAY</strong><br>Replay and test any question as often as you want.<br>Nothing is submitted or counted.</div>
        <label><strong>Choose any question</strong></label>
        <select onchange="showTestPlay(Number(this.value))" style="width:100%;padding:14px;margin:8px 0 14px;border:2px solid #111;border-radius:12px;font-size:16px">${options}</select>
        ${issues.length?`<div class="notice"><strong>QUESTION DATA ERROR</strong><br>${issues.map(html).join("<br>")}</div>`:`
          <small style="margin-bottom:8px">${html(testQuestionDateLabel(i))} · Question ${questionNumber(i)}</small>
          <h3>${html(q.question)}</h3>
          <div id="testPlayAnswerButtons">${q.answers.map((a,n)=>`<button id="test-play-answer-${n}" onclick="selectTestPlayAnswer(${n})">${html(a)}</button>`).join("")}</div>
          <button id="testPlaySubmit" class="center" onclick="submitTestPlayAnswer()" disabled>SUBMIT TEST ANSWER</button>
          <div class="notice" style="margin-top:14px"><strong>QUICK SCENARIOS</strong><br>Jump directly to a result without answering first.</div>
          <div class="menu"><button onclick="showTestPlayScenario('correct')">SHOW CORRECT RESULT</button><button onclick="showTestPlayScenario('incorrect')">SHOW INCORRECT RESULT</button><button onclick="showTestPlayScenario('none')">SHOW NOT ANSWERED</button></div>
          <div id="testPlayResult"></div>`}
      </div>
      ${back("showTestMode")}
    `);
  };
}

if(typeof renderTestPlayResult === "function"){
  renderTestPlayResult = function(type,chosen){
    const index=testPlayIndex;
    const q=questions[index];
    if(!q) return;
    const correct=q.correct;
    const answerSentence=`<div class="answer" style="margin-top:18px"><strong>The correct answer is ${html(q.answers[correct])}.</strong></div>`;
    let playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`;
    let personalResult=`<div class="notice"><strong>Oops, this one slipped by!</strong><br><br>No worries — today's question is waiting for you.</div>`;
    if(chosen!==null){
      const isCorrect=chosen===correct;
      playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>${html(q.answers[chosen])}</div>`;
      personalResult=isCorrect?`<div class="notice"><strong>${html(bdlResultWordForIndex(index))}!</strong><br><br>You got it right!</div>`:`<div class="notice"><strong>Better luck next time!</strong><br><br>A new day, a new chance — today's question is waiting for you.</div>`;
    }
    page(`<div class="section quiz-section"><h2 class="center">YESTERDAY'S ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${playerAnswer}${answerSentence}${personalResult}<div class="notice"><strong>TEST PLAY ONLY</strong><br>Nothing was saved or submitted.</div><button class="settings-button" onclick="showTestPlay(${index})">PLAY THIS QUESTION AGAIN</button></div>${back("showTestPlay")}`);
  };
}

if(typeof renderTestOutcome === "function"){
  renderTestOutcome = function(index,type){
    const q=questions[index];
    const area=document.getElementById("testOutcomeArea");
    if(!q||!area) return;
    const correct=q.correct;
    let personal="";
    if(type==="none") personal=`<div class="notice">You did not answer yesterday's question.</div>`;
    else{
      let chosen=correct;
      if(type==="incorrect") chosen=[0,1,2,3].find(n=>n!==correct);
      personal=`<div class="answer" style="margin-top:12px"><strong>Your answer:</strong><br><br>${html(q.answers[chosen])}<br><br><strong>${type==="correct"?'✓ Correct!':'✗ Incorrect.'}</strong></div>`;
    }
    area.innerHTML=`<div class="section quiz-section" style="margin-top:14px"><h2 class="center">YESTERDAY'S ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${personal}<div class="answer" style="margin-top:12px"><strong>The correct answer is ${html(q.answers[correct])}</strong></div><div class="notice">TEST PREVIEW — nothing was saved.</div></div>`;
  };
}

if(typeof renderTestQuestionPreview === "function"){
  renderTestQuestionPreview = function(){
    const area=document.getElementById("testQuestionPreview");
    const i=testPreviewIndex;
    const q=questions[i];
    if(!area) return;
    const issues=testQuestionIssues(q);
    if(issues.length){area.innerHTML=`<div class="notice"><strong>QUESTION DATA ERROR</strong><br>${issues.map(html).join("<br>")}</div>`;return;}
    const buttons=q.answers.map((a,n)=>`<button onclick="testSelectPreviewAnswer(${n})" style="text-align:left;${testPreviewAnswer===n?'border-width:4px':''}">${html(a)}</button>`).join("");
    area.innerHTML=`<small style="margin-bottom:8px">${html(testQuestionDateLabel(i))} · Question ${questionNumber(i)}</small><p><strong>${html(q.question)}</strong></p>${buttons}<button class="settings-button" onclick="testEvaluatePreview()" ${testPreviewAnswer===null?'disabled':''}>CHECK TEST ANSWER</button><div id="testPreviewResult"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button onclick="showTestQuizPreview(${Math.max(0,i-1)})" ${i===0?'disabled':''}>PREVIOUS</button><button onclick="showTestQuizPreview(${Math.min(questions.length-1,i+1)})" ${i===questions.length-1?'disabled':''}>NEXT</button></div>`;
  };
}

if(typeof testEvaluatePreview === "function"){
  testEvaluatePreview = function(){
    const q=questions[testPreviewIndex];
    const area=document.getElementById("testPreviewResult");
    if(!q||!area||testPreviewAnswer===null) return;
    const ok=testPreviewAnswer===q.correct;
    area.innerHTML=`<div class="notice"><strong>${ok?'✓ CORRECT':'✗ INCORRECT'}</strong><br>Correct answer: ${html(q.answers[q.correct])}<br><small style="margin:6px 0 0">Test only — nothing was saved.</small></div>`;
  };
}

/* Wall of Fame privacy: titles stay public, ranking performance is visible only to viewers who participate in rankings. */
showWeeklyWallOfFame = async function(){
  page(`<div class="loading">Loading Wall of Fame...</div>`);
  try{
    const pref=await accountApi({action:"ranking_preference",player_id:playerId()});
    const data=await loadDashboard();
    const canSee=pref.share_ranking===true && data?.ranking_access===true;
    const rows=Array.isArray(data?.history?.weekly)?data.history.weekly:[];
    const cards=rows.length?rows.map(row=>`<div class="wall-card week"><strong>SMARTEST BDL'ER OF THE WEEK</strong><h3>${html(row.player_name)}</h3>${canSee?`<div>${row.correct_answers??0} correct · ${row.days_played??0} days played</div>`:""}<small>${html(row.week_start)} — ${html(row.week_end)}</small></div>`).join(""):`<div class="notice">No weekly winners yet.</div>`;
    page(`<div class="section history"><h2 class="center">SMARTEST BDL'ER OF THE WEEK</h2>${cards}</div>${back("showWallOfFameMenu")}`);
  }catch(e){
    page(`<div class="section history"><h2 class="center">SMARTEST BDL'ER OF THE WEEK</h2><div class="notice">The weekly Wall of Fame could not be loaded.</div></div>${back("showWallOfFameMenu")}`);
  }
};

showSupremeWallOfFame = async function(){
  page(`<div class="loading">Loading Wall of Fame...</div>`);
  try{
    const pref=await accountApi({action:"ranking_preference",player_id:playerId()});
    const data=await loadDashboard();
    const canSee=pref.share_ranking===true && data?.ranking_access===true;
    const rows=Array.isArray(data?.history?.monthly)?data.history.monthly:[];
    const cards=rows.length?rows.map(row=>`<div class="wall-card month"><strong>THE SUPREME BDL'ER</strong><h3>${html(row.player_name)}</h3>${canSee?`<div>${row.correct_answers??0} correct · ${row.days_played??0} days played</div>`:""}<small>${html(row.month_start)} — ${html(row.month_end)}</small></div>`).join(""):`<div class="notice">No Supreme BDL'er winners yet.</div>`;
    page(`<div class="section history"><h2 class="center">SUPREME BDL'ER</h2>${cards}</div>${back("showWallOfFameMenu")}`);
  }catch(e){
    page(`<div class="section history"><h2 class="center">SUPREME BDL'ER</h2><div class="notice">The Supreme Wall of Fame could not be loaded.</div></div>${back("showWallOfFameMenu")}`);
  }
};

/* Statistics are grouped consistently by week, month and all time. */
function bdlTitleRowsForPeriod(data,type){
  const history=data?.history||{};
  const weekly=Array.isArray(history.weekly)?history.weekly:[];
  const monthly=Array.isArray(history.monthly)?history.monthly:[];
  let selectedWeekly=weekly;
  let selectedMonthly=monthly;
  if(type==="week"){
    const start=currentWeekStart();
    selectedWeekly=weekly.filter(row=>row.week_start===start);
    selectedMonthly=[];
  }else if(type==="month"){
    const start=currentMonthStart();
    selectedWeekly=weekly.filter(row=>String(row.week_start||"").slice(0,7)===start.slice(0,7));
    selectedMonthly=monthly.filter(row=>row.month_start===start);
  }
  const players=new Map();
  const add=(name,title)=>{
    const clean=String(name||"").trim();
    if(!clean)return;
    const key=clean.toLowerCase();
    if(!players.has(key))players.set(key,{player_name:clean,smartest:0,supreme:0,points:0});
    const row=players.get(key);
    if(title==="smartest")row.smartest++;
    if(title==="supreme")row.supreme++;
    row.points=row.smartest+(row.supreme*4);
  };
  selectedWeekly.forEach(row=>add(row.player_name,"smartest"));
  selectedMonthly.forEach(row=>add(row.player_name,"supreme"));
  const rows=[...players.values()].sort((a,b)=>b.points-a.points||b.supreme-a.supreme||b.smartest-a.smartest||a.player_name.localeCompare(b.player_name));
  let rank=0,last=null;
  rows.forEach((row,index)=>{
    const key=`${row.points}|${row.supreme}|${row.smartest}`;
    if(key!==last)rank=index+1;
    row.rank=rank;
    last=key;
  });
  return rows;
}

function bdlStatsBlock(data,type){
  if(type==="all"){
    const life=data?.lifetime||{};
    return {played:life.played??0,correct:life.correct??0,incorrect:life.incorrect??Math.max(0,(life.played??0)-(life.correct??0)),accuracy:life.accuracy??0};
  }
  const period=data?.[type]||{};
  const player=period.player||{};
  const played=player.played??0;
  const correct=player.correct??0;
  return {played,correct,incorrect:player.incorrect??Math.max(0,played-correct),accuracy:player.accuracy??(played?Math.round((correct/played)*100):0)};
}

function bdlGeneralRows(data,type){
  const block=type==="all"?(data?.top20||{}):(data?.[type]||{});
  return Array.isArray(block.leaderboard)?block.leaderboard:[];
}

function bdlRenderGeneralTop20(data,type){
  if(data?.ranking_access!==true){
    return `<div class="notice">Your ranking information is private. Join the rankings in Personal Settings to see the Top 20.</div>`;
  }
  const rows=bdlGeneralRows(data,type).slice(0,20);
  if(!rows.length)return `<div class="notice">No ranking data is available yet.</div>`;
  const body=rows.map(row=>`<div class="leader-row ${String(row.player_name||"").toLowerCase()===String(playerName()).toLowerCase()?"me":""}"><strong>#${row.rank}</strong><span>${html(row.player_name)}</span><span>${row.correct??0} correct<br><small style="margin:0;text-align:right">${row.played??0} played</small></span></div>`).join("");
  return `<div class="leaderboard">${body}</div>`;
}

function bdlRenderTitleTop20(data,type){
  const rows=bdlTitleRowsForPeriod(data,type).slice(0,20);
  if(!rows.length)return `<div class="notice">No title winners are available for this period yet.</div>`;
  const header=`<div class="title-leader-row header"><span>#</span><span>Player</span><span>Smartest</span><span>Supreme</span><span>Points</span></div>`;
  const body=rows.map(row=>`<div class="title-leader-row ${String(row.player_name).toLowerCase()===String(playerName()).toLowerCase()?"me":""}"><strong>#${row.rank}</strong><span>${html(row.player_name)}</span><span>${row.smartest}</span><span>${row.supreme}</span><strong>${row.points}</strong></div>`).join("");
  return `<div class="leaderboard">${header}${body}</div>`;
}

function bdlRenderStatisticsPeriod(type){
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

showMyStatistics=async function(){
  page(`<div class="loading">Loading your statistics...</div>`);
  try{
    const data=await loadDashboard();
    dashboardCache=data;
    page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="tabs" style="display:grid;grid-template-columns:1fr 1fr 1fr"><button id="bdlStatsTab-week" class="active" onclick="bdlRenderStatisticsPeriod('week')">THIS WEEK</button><button id="bdlStatsTab-month" onclick="bdlRenderStatisticsPeriod('month')">THIS MONTH</button><button id="bdlStatsTab-all" onclick="bdlRenderStatisticsPeriod('all')">ALL TIME</button></div><div id="bdlStatsPeriodArea"></div></div>${back("showMainMenu")}`);
    bdlRenderStatisticsPeriod("week");
  }catch(error){
    page(`<div class="section stats"><h2 class="center">MY STATISTICS</h2><div class="notice">Your statistics could not be loaded.</div></div>${back("showMainMenu")}`);
  }
};

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

