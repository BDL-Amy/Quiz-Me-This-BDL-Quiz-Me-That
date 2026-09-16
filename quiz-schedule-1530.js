/* BDL QUIZ SCHEDULE — effective 17 September 2026
   Daily release 15:30 Europe/Brussels, one-day catch-up, protected answer reveal,
   Saturday-Friday weekly cycle and delayed title publication. */
const BDL_SCHEDULE_EFFECTIVE="2026-09-17";
const QUESTION_SERVICE_V2=BASE+"/quiz-question-service";
let catchupSelectedAnswer=null;

function bdlBrusselsNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
}
function bdlAddDays(date,n){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()+n);return d;}

/* From 17/09/2026 onward the quiz day changes at 15:30 Brussels time. */
effectiveDate=function(){
  const p=bdlBrusselsNow();
  const d=new Date(+p.year,+p.month-1,+p.day);
  const calendar=dateString(d);
  if(calendar<BDL_SCHEDULE_EFFECTIVE){if(+p.hour<8)d.setDate(d.getDate()-1);return d;}
  if((+p.hour*60)+(+p.minute)<930)d.setDate(d.getDate()-1);
  return d;
};

/* Weekly competition is Saturday through Friday. */
currentWeekStart=function(){const d=effectiveDate(),day=d.getDay();d.setDate(d.getDate()-((day+1)%7));return dateString(d)};
previousWeekStart=function(){const d=new Date(currentWeekStart()+"T12:00:00");d.setDate(d.getDate()-7);return dateString(d)};

function bdlClosedAnswerIndex(){return quizDay()-2;}
function bdlCatchupIndex(){return quizDay()-1;}

/* Only fully closed questions belong in Previous Questions/History. */
if(typeof historyReleasedLastIndex==="function") historyReleasedLastIndex=function(){return Math.min(questions.length-1,bdlClosedAnswerIndex())};

/* Quiz menu: catch-up is separate; Previous Answer replaces Yesterday's Answer. */
showQuizMenu=function(){
  page(`<div class="section quiz-section"><h2 class="center">QUIZ</h2><div class="menu quiz-menu">
    <button onclick="showTodayQuestion()">TODAY'S QUESTION</button>
    <button onclick="showCatchupQuestion()">CATCH UP MISSED QUESTION</button>
    <button onclick="showPreviousAnswer()">PREVIOUS ANSWER</button>
    <button class="weekly" onclick="showCurrentWeeklyHolder()">SMARTEST BDL'ER OF THE WEEK</button>
    <button class="supreme" onclick="showSupremeBDLer()">THE SUPREME BDL'ER</button>
    <button class="grandmaster" onclick="showGrandmaster('showQuizMenu')">THE BDL GRANDMASTER</button>
  </div></div>${back("showMainMenu")}`);
};

async function showCatchupQuestion(){
  page(`<div class="loading">Checking missed question...</div>`);
  try{
    const data=await api(QUESTION_SERVICE_V2,{action:"get_catchup_question",player_id:playerId()});
    const q=data?.question;
    if(!q){page(`<div class="section quiz-section"><h2 class="center">CATCH UP</h2><div class="notice">You have no missed question available to catch up.</div></div>${back("showQuizMenu")}`);return;}
    const idx=Number(q.question_num)-FIRST_QUESTION_NUMBER;
    catchupSelectedAnswer=null;
    page(`<div class="section quiz-section"><h2 class="center">CATCH UP</h2><div class="notice"><strong>ONE-DAY CATCH-UP</strong><br>You missed this question. You can still answer it before the next 15:30 release.</div><p><strong>Question ${q.question_num}</strong></p><h3>${html(q.question)}</h3><div id="catchupButtons">${q.answers.map((a,i)=>`<button id="catchup-${i}" onclick="selectCatchupAnswer(${i})">${html(a)}</button>`).join("")}</div><button id="catchupSubmit" style="background:var(--quiz);border-color:var(--quiz);font-weight:bold" onclick="submitCatchupAnswer(${idx},${q.question_num},'${q.quiz_date}')" disabled>SUBMIT CATCH-UP ANSWER</button><p class="center"><small>The correct answer remains hidden until the catch-up period closes.</small></p></div>${back("showQuizMenu")}`);
  }catch(e){page(`<div class="section quiz-section"><h2 class="center">CATCH UP</h2><div class="notice">The catch-up question could not be loaded.</div></div>${back("showQuizMenu")}`)}
}
function selectCatchupAnswer(i){catchupSelectedAnswer=i;document.querySelectorAll("#catchupButtons button").forEach(b=>b.classList.remove("selected"));document.getElementById("catchup-"+i)?.classList.add("selected");const b=document.getElementById("catchupSubmit");if(b)b.disabled=false}
async function submitCatchupAnswer(index,questionNum,quizDate){
  if(catchupSelectedAnswer===null)return;const b=document.getElementById("catchupSubmit");if(b){b.disabled=true;b.textContent="SUBMITTING..."}
  try{await api(QUESTION_SERVICE_V2,{action:"submit_answer",player_id:playerId(),player_name:playerName(),quiz_date:quizDate,question_num:questionNum,answer:String.fromCharCode(65+catchupSelectedAnswer)});storeAnswer(index,catchupSelectedAnswer);dashboardCache=null;page(`<div class="section quiz-section center"><h2>CATCH-UP ANSWER SUBMITTED</h2><p>Your answer has been recorded for Question ${questionNum} and counts for its original quiz date.</p><p>The correct answer will be available after the catch-up period closes.</p></div>${back("showQuizMenu")}`)}catch(e){if(b){b.disabled=false;b.textContent="SUBMIT CATCH-UP ANSWER"}alert(e.message||"Your catch-up answer could not be submitted.")}
}

/* A correct answer is revealed only after its 24-hour catch-up window has closed. */
async function showPreviousAnswer(){
  const index=bdlClosedAnswerIndex(),q=questions[index];
  if(index<0||!q||!q.question||!Array.isArray(q.answers)||!Number.isInteger(q.correct)){page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><div class="notice">No closed previous answer is available yet.</div></div>${back("showQuizMenu")}`);return;}
  let selected=savedAnswer(index);try{const d=await accountApi({action:"get_answer",player_id:playerId(),question_num:questionNumber(index)});if(d.answered&&d.answer){const x=["A","B","C","D"].indexOf(String(d.answer.answer||"").trim().toUpperCase());if(x>=0)selected=x}}catch(e){}
  const player=selected===null?`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`:`<div class="answer"><strong>Your answer:</strong><br><br>${html(q.answers[selected])}</div>`;
  const feedback=selected===null?`<div class="notice">This question was not answered.</div>`:(selected===q.correct?`<div class="notice"><strong>${html(typeof bdlResultWordForIndex==="function"?bdlResultWordForIndex(index):"Correct")}!</strong><br><br>You got it right!</div>`:`<div class="notice"><strong>Better luck next time!</strong></div>`);
  page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${player}<div class="answer" style="margin-top:18px"><strong>The correct answer is ${html(q.answers[q.correct])}.</strong></div>${feedback}</div>${back("showQuizMenu")}`);
}
showYesterdayPage=showPreviousAnswer;

/* Policy update for the new schedule. */
if(typeof QUIZ_POLICY_SECTIONS!=="undefined"){
  QUIZ_POLICY_SECTIONS.play={title:"HOW TO PLAY",body:`<p>From <strong>17 September 2026</strong>, a new Daily Quiz question becomes available every day at <strong>15:30 Europe/Brussels time</strong>.</p><p>If a player misses a question, that question remains available as a <strong>catch-up question for one additional quiz day</strong>. A question can only be answered once. A catch-up answer is recorded against the question's original quiz date.</p><p>The correct answer is not published while a question can still be answered or caught up. After the catch-up window closes, the answer becomes available under <strong>Previous Answer</strong> and in Previous Questions/History.</p>`};
  QUIZ_POLICY_SECTIONS.weekly={title:"WEEKLY WINNER",body:`<p>The weekly competition runs from <strong>Saturday through Friday</strong>. The Friday question runs from Friday 15:30 until Saturday 15:30 and may still be caught up until Sunday 15:30 if it was missed.</p><p>The previous weekly result is therefore finalised on <strong>Sunday at 15:30</strong>. The quiz admins may know the result from that point, but the winner is publicly announced on <strong>Monday at 15:30</strong>.</p><p>Catch-up answers count for the original question date and therefore for the original competition week.</p><p>The existing performance, tie/draw and cooldown rules continue to apply.</p>`};
  QUIZ_POLICY_SECTIONS.monthly={title:"MONTHLY WINNER",body:`<p>The Monthly Supreme competition follows the calendar month. For title calculation, the <strong>last scoring question is released two calendar days before the end of the month</strong>. The following day is the catch-up day for that final scoring question. On the final calendar day, the result is finalised and known to the quiz admins.</p><p>The previous month's Supreme winner is publicly announced on the <strong>1st of the new month at 15:30</strong>. The new calendar month itself starts on the 1st. Catch-up answers always remain assigned to their original question date.</p><p>The existing performance and tie/draw rules continue to apply.</p>`};
  QUIZ_POLICY_SECTIONS.grandmaster={title:"THE BDL GRANDMASTER",body:`<p>The BDL Grandmaster is the annual title and follows the calendar year. The <strong>last scoring question is released on 29 December</strong>, 30 December is the catch-up day for that final scoring question, and the annual result is finalised on <strong>31 December at 15:30</strong>.</p><p>The Grandmaster winner or tied co-winners are publicly announced on <strong>1 January at 15:30</strong>. The new competition year starts on 1 January. The existing Grandmaster scoring weights and shared-title rule for an exact first-place tie remain unchanged.</p>`};
  QUIZ_POLICY_SECTIONS.results={title:"RESULTS & PUBLICATION",body:`<p>Correct answers remain protected until the one-day catch-up window has closed. History does not reveal a correct answer while that question is still eligible for catch-up.</p><p>Weekly results are finalised Sunday at 15:30 and published Monday at 15:30. Monthly results are finalised on the final calendar day and published on the 1st of the next month at 15:30. Annual Grandmaster results are finalised on 31 December and published on 1 January at 15:30.</p><p>Winner records may be retained for title history and the Wall of Fame. Test and administrative accounts remain excluded from ordinary competition results.</p>`};
  QUIZ_POLICY_SECTIONS.changes={title:"POLICY CHANGES",body:`<p>This policy may be updated when quiz features, rules or data processing change. The latest version shown in the quiz applies from its stated update date.</p><p><strong>Last updated: 16 September 2026 — schedule effective 17 September 2026.</strong></p>`};
}

/* One-time policy-change notice. */
setTimeout(()=>{
  const key="bdlPolicySchedule1530Seen";
  if(playerName()&&localStorage.getItem(key)!=="yes"){
    page(`<div class="section settings"><h2 class="center">QUIZ POLICY UPDATED</h2><div class="settings-card"><p>From <strong>17 September 2026</strong>, the Daily Quiz changes at <strong>15:30 Europe/Brussels time</strong>.</p><p>A missed question can be caught up during the following quiz day. Correct answers remain hidden until that catch-up period closes.</p><p>The weekly, monthly and annual title schedules and publication moments have also been updated.</p><button class="settings-button" onclick="localStorage.setItem('${key}','yes');showQuizPolicy()">READ UPDATED POLICY</button><button class="settings-button" onclick="localStorage.setItem('${key}','yes');showStartScreen()">CONTINUE</button></div></div>`);
  }
},400);
