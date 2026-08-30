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