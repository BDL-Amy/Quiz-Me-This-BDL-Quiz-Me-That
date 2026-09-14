/* TEST PLATFORM LOADER */

const QUESTION_SERVICE =
  BASE + "/quiz-question-service";

/* Award colours: deep royal navy and dark ceremonial green,
   matched to the Weekly and Supreme BDL artwork. */
(function applyBDLAwardColours(){
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --weekly:#123A78;
      --weekly-dark:#061A3D;
      --weekly-light:#D9E3F3;
      --weekly-bg:#F3F6FB;
      --supreme:#173F2C;
      --supreme-dark:#0A2118;
      --supreme-light:#D8E5DD;
      --supreme-bg:#F3F7F4;
    }
  `;
  document.head.appendChild(style);
})();

/* Route answer submissions through the secure question service.
   The browser no longer decides whether an answer is correct. */
if(typeof api === "function"){
  const originalQuizApi = api;

  api = async function(url,body){
    if(
      url === QUIZ_SERVICE
      &&
      body
      &&
      body.action === "submit_answer"
    ){
      const safeBody = {...body};
      delete safeBody.is_correct;
      return originalQuizApi(QUESTION_SERVICE,safeBody);
    }

    return originalQuizApi(url,body);
  };
}

/* Player-facing answer buttons show only the answer text.
   A/B/C/D remain internal so submissions and scoring still work normally.
   TEST PLAY uses different button ids and keeps its labels for testing. */
function hidePlayerAnswerLetters(){
  document.querySelectorAll('button[id^="answer-"]').forEach(button=>{
    const text = String(button.textContent || "").trim();
    const cleaned = text.replace(/^[A-D]\s*\/\s*/i,"");
    if(cleaned !== text){
      button.textContent = cleaned;
    }
  });
}

if(typeof MutationObserver !== "undefined"){
  const answerLabelObserver = new MutationObserver(()=>{
    hidePlayerAnswerLetters();
  });

  answerLabelObserver.observe(document.documentElement,{
    childList:true,
    subtree:true
  });
}

document.addEventListener("DOMContentLoaded",hidePlayerAnswerLetters);

/* SECURITY / MIGRATION GUARD
   The old inline question list may still exist in index.html for historical
   compatibility, but it is no longer allowed to supply today's or any future
   player-facing question. Remove current/future local entries immediately,
   before the secure request completes. This prevents a stale cached question
   from briefly appearing or being answered. */
const SECURE_CURRENT_INDEX =
  typeof quizDay === "function"
    ? Math.max(0,quizDay())
    : 0;

if(typeof questions !== "undefined" && Array.isArray(questions)){
  const historicalOnly = questions.slice(0,SECURE_CURRENT_INDEX);
  questions.splice(0,questions.length,...historicalOnly);

  /* If an old local question was already rendered, replace that screen now.
     Until Supabase returns today's question, unavailable is safer than wrong. */
  if(typeof showStartScreen === "function"){
    showStartScreen();
  }
}

(async function loadSecureQuizQuestions(){
  try{
    const currentIndex = SECURE_CURRENT_INDEX;

    /* Historical local data is only a temporary fallback while the public
       archive is fetched. Current and future local questions were removed
       synchronously above and can never become authoritative. */
    const merged =
      typeof questions !== "undefined" && Array.isArray(questions)
        ? questions.slice(0,currentIndex)
        : [];

    /* Merge expired questions that still remain in the private bank. */
    try{
      const archiveData = await api(
        QUESTION_SERVICE,
        {action:"get_public_archive"}
      );

      if(archiveData && Array.isArray(archiveData.archive)){
        archiveData.archive.forEach(q=>{
          const i = Number(q.question_num) - FIRST_QUESTION_NUMBER;
          if(i >= 0 && i < currentIndex){
            merged[i] = {
              question:q.question,
              answers:q.answers,
              correct:Number(q.correct)
            };
          }
        });
      }
    }catch(error){
      console.error("Could not load expired private questions:",error);
    }

    /* The GitHub archive is authoritative for completed questions. */
    try{
      const archiveUrl =
        "https://raw.githubusercontent.com/BDL-Amy/Quiz-Me-This-BDL-Quiz-Me-That/quiz-questions/questions.json?ts="
        + Date.now();

      const response = await fetch(archiveUrl,{cache:"no-store"});
      if(response.ok){
        const publicArchive = await response.json();
        if(Array.isArray(publicArchive)){
          publicArchive.forEach((q,i)=>{
            if(i < currentIndex && q && q.question && Array.isArray(q.answers)){
              merged[i] = q;
            }
          });
        }
      }
    }catch(error){
      console.error("Could not load public question archive:",error);
    }

    /* Today's question comes only from Supabase and never contains correct_index. */
    const currentData = await api(
      QUESTION_SERVICE,
      {action:"get_current_question"}
    );

    if(currentData && currentData.question){
      const q = currentData.question;
      const i = Number(q.question_num) - FIRST_QUESTION_NUMBER;

      if(i === currentIndex){
        merged[i] = {
          question:q.question,
          answers:q.answers
        };
      }else{
        console.error(
          "Secure question number/date mismatch; refusing to display stale question.",
          q.question_num,
          currentIndex + FIRST_QUESTION_NUMBER
        );
      }
    }

    if(typeof questions !== "undefined" && Array.isArray(questions)){
      questions.splice(0,questions.length,...merged);

      if(typeof showStartScreen === "function"){
        showStartScreen();
      }
    }
  }catch(error){
    console.error("Could not load secure quiz questions:",error);

    /* Never restore an inline current/future question when secure loading fails. */
    if(typeof questions !== "undefined" && Array.isArray(questions)){
      questions.splice(SECURE_CURRENT_INDEX);
    }
  }
})();

document.write('<script src="test-platform-core.js?v=20260914-secure2"><\/script>');
document.write('<script src="test-results.js?v=20260914-secure2"><\/script>');
