/* TEST PLATFORM LOADER */

const QUESTION_SERVICE = BASE + "/quiz-question-service";

(function applyBDLAwardColours(){
  const style=document.createElement("style");
  style.textContent=`:root{--weekly:#123A78;--weekly-dark:#061A3D;--weekly-light:#D9E3F3;--weekly-bg:#F3F6FB;--supreme:#173F2C;--supreme-dark:#0A2118;--supreme-light:#D8E5DD;--supreme-bg:#F3F7F4;}#submitButton{background:var(--quiz);border-color:var(--quiz);color:#111;font-weight:bold;}#submitButton:disabled{background:var(--quiz);border-color:var(--quiz);color:#111;opacity:.65;}`;
  document.head.appendChild(style);
})();

if(typeof api==="function"){
  const originalQuizApi=api;
  api=async function(url,body){
    if(url===QUIZ_SERVICE&&body&&body.action==="submit_answer"){
      const safeBody={...body}; delete safeBody.is_correct;
      return originalQuizApi(QUESTION_SERVICE,safeBody);
    }
    return originalQuizApi(url,body);
  };
}

function hidePlayerAnswerLetters(){
  document.querySelectorAll('button[id^="answer-"]').forEach(button=>{
    const text=String(button.textContent||"").trim();
    const cleaned=text.replace(/^[A-D]\s*\/\s*/i,"");
    if(cleaned!==text)button.textContent=cleaned;
  });
}
if(typeof MutationObserver!=="undefined"){
  const answerLabelObserver=new MutationObserver(hidePlayerAnswerLetters);
  answerLabelObserver.observe(document.documentElement,{childList:true,subtree:true});
}
document.addEventListener("DOMContentLoaded",hidePlayerAnswerLetters);

const SECURE_CURRENT_INDEX=typeof quizDay==="function"?Math.max(0,quizDay()):0;
const TEST_ACCOUNT_HAS_FULL_ACCESS=typeof isTestIdentity==="function"&&isTestIdentity();

/* Regular players only keep historical questions locally. Test accounts keep the
   complete local question bank so TEST PLAY can inspect future scheduled questions. */
if(!TEST_ACCOUNT_HAS_FULL_ACCESS&&typeof questions!=="undefined"&&Array.isArray(questions)){
  const historicalOnly=questions.slice(0,SECURE_CURRENT_INDEX);
  questions.splice(0,questions.length,...historicalOnly);
  if(typeof showStartScreen==="function")showStartScreen();
}

(async function loadSecureQuizQuestions(){
  /* Amy.test and DrBDL.test are deliberately unrestricted in TEST PLAY. The
     questions-51-60.js bank currently contains Q51-Q65 including correct indexes,
     so do not replace today's test copy with the public version that omits the key. */
  if(TEST_ACCOUNT_HAS_FULL_ACCESS){
    if(typeof showStartScreen==="function")showStartScreen();
    return;
  }

  try{
    const currentIndex=SECURE_CURRENT_INDEX;
    const merged=typeof questions!=="undefined"&&Array.isArray(questions)?questions.slice(0,currentIndex):[];
    try{
      const archiveData=await api(QUESTION_SERVICE,{action:"get_public_archive"});
      if(archiveData&&Array.isArray(archiveData.archive))archiveData.archive.forEach(q=>{
        const i=Number(q.question_num)-FIRST_QUESTION_NUMBER;
        if(i>=0&&i<currentIndex)merged[i]={question:q.question,answers:q.answers,correct:Number(q.correct)};
      });
    }catch(error){console.error("Could not load expired private questions:",error);}
    try{
      const archiveUrl="https://raw.githubusercontent.com/BDL-Amy/Quiz-Me-This-BDL-Quiz-Me-That/quiz-questions/questions.json?ts="+Date.now();
      const response=await fetch(archiveUrl,{cache:"no-store"});
      if(response.ok){
        const publicArchive=await response.json();
        if(Array.isArray(publicArchive))publicArchive.forEach((q,i)=>{
          if(i<currentIndex&&q&&q.question&&Array.isArray(q.answers))merged[i]=q;
        });
      }
    }catch(error){console.error("Could not load public question archive:",error);}
    const currentData=await api(QUESTION_SERVICE,{action:"get_current_question"});
    if(currentData&&currentData.question){
      const q=currentData.question,i=Number(q.question_num)-FIRST_QUESTION_NUMBER;
      if(i===currentIndex)merged[i]={question:q.question,answers:q.answers};
      else console.error("Secure question number/date mismatch; refusing to display stale question.",q.question_num,currentIndex+FIRST_QUESTION_NUMBER);
    }
    if(typeof questions!=="undefined"&&Array.isArray(questions)){
      questions.splice(0,questions.length,...merged);
      if(typeof showStartScreen==="function")showStartScreen();
    }
  }catch(error){
    console.error("Could not load secure quiz questions:",error);
    if(typeof questions!=="undefined"&&Array.isArray(questions))questions.splice(SECURE_CURRENT_INDEX);
  }
})();

document.write('<script src="test-platform-core.js?v=20260916-test-access"><\/script>');
document.write('<script src="test-results.js?v=20260916-test-access"><\/script>');

/* test-platform-core.js originally guarded Amy.test only. Expand that guard to
   the shared test-account identity check after the core has loaded. */
setTimeout(()=>{
  if(typeof testGuard==="function"&&typeof isTestIdentity==="function"){
    testGuard=function(){
      if(!isTestIdentity()){
        showMainMenu();
        return false;
      }
      return true;
    };
  }
},0);
