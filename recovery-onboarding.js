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
  const correctLetter=String.fromCharCode(65+correct);
  const answerSentence=`<div class="answer" style="margin-top:18px"><strong>The correct answer is ${correctLetter} - ${html(q.answers[correct])}.</strong></div>`;

  let playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`;
  let personalResult=`<div class="notice"><strong>Oops, this one slipped by!</strong><br><br>No worries — today's question is waiting for you.</div>`;

  if(selected!==null){
    const yourLetter=String.fromCharCode(65+selected);
    const isCorrect=selected===correct;
    playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>${yourLetter} - ${html(q.answers[selected])}</div>`;
    personalResult=isCorrect
      ? `<div class="notice"><strong>${html(bdlResultWordForIndex(index))}!</strong><br><br>You got it right!</div>`
      : `<div class="notice"><strong>Better luck next time!</strong><br><br>A new day, a new chance — today's question is waiting for you.</div>`;
  }

  page(`<div class="section quiz-section"><h2 class="center">YESTERDAY'S ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${playerAnswer}${answerSentence}${personalResult}</div>${back("showQuizMenu")}`);
};

/* Amy.TEST uses the exact same player-facing result experience and copy as the live quiz. */
if(typeof renderTestPlayResult === "function"){
  renderTestPlayResult = function(type,chosen){
    const index=testPlayIndex;
    const q=questions[index];
    if(!q) return;

    const correct=q.correct;
    const correctLetter=String.fromCharCode(65+correct);
    const answerSentence=`<div class="answer" style="margin-top:18px"><strong>The correct answer is ${correctLetter} - ${html(q.answers[correct])}.</strong></div>`;

    let playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`;
    let personalResult=`<div class="notice"><strong>Oops, this one slipped by!</strong><br><br>No worries — today's question is waiting for you.</div>`;

    if(chosen!==null){
      const yourLetter=String.fromCharCode(65+chosen);
      const isCorrect=chosen===correct;
      playerAnswer=`<div class="answer"><strong>Your answer:</strong><br><br>${yourLetter} - ${html(q.answers[chosen])}</div>`;
      personalResult=isCorrect
        ? `<div class="notice"><strong>${html(bdlResultWordForIndex(index))}!</strong><br><br>You got it right!</div>`
        : `<div class="notice"><strong>Better luck next time!</strong><br><br>A new day, a new chance — today's question is waiting for you.</div>`;
    }

    page(`<div class="section quiz-section"><h2 class="center">YESTERDAY'S ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${playerAnswer}${answerSentence}${personalResult}</div>${back("showTestPlay")}`);
  };
}
