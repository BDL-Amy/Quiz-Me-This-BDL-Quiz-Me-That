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

(async function loadSecureQuizQuestions(){
  try{
    const currentIndex =
      typeof quizDay === "function"
        ? Math.max(0,quizDay())
        : 0;

    /* Keep only questions that are already over from the old local list.
       This makes the historical quiz keep working during the migration. */
    const merged =
      typeof questions !== "undefined" && Array.isArray(questions)
        ? questions.slice(0,currentIndex)
        : [];

    /* Merge anything that has already expired in the private question bank. */
    try{
      const archiveData = await api(
        QUESTION_SERVICE,
        {action:"get_public_archive"}
      );

      if(archiveData && Array.isArray(archiveData.archive)){
        archiveData.archive.forEach(q=>{
          const i = Number(q.question_num) - FIRST_QUESTION_NUMBER;
          if(i >= 0){
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

    /* A public GitHub archive can override historical entries when present. */
    try{
      const archiveUrl =
        "https://raw.githubusercontent.com/BDL-Amy/Quiz-Me-This-BDL-Quiz-Me-That/quiz-questions/questions.json?ts="
        + Date.now();

      const response = await fetch(archiveUrl,{cache:"no-store"});
      if(response.ok){
        const publicArchive = await response.json();
        if(Array.isArray(publicArchive)){
          publicArchive.forEach((q,i)=>{
            if(q && q.question){
              merged[i] = q;
            }
          });
        }
      }
    }catch(error){
      console.error("Could not load public question archive:",error);
    }

    /* Load today's question without the correct answer. */
    const currentData = await api(
      QUESTION_SERVICE,
      {action:"get_current_question"}
    );

    if(currentData && currentData.question){
      const q = currentData.question;
      const i = Number(q.question_num) - FIRST_QUESTION_NUMBER;

      if(i >= 0){
        merged[i] = {
          question:q.question,
          answers:q.answers
        };
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
  }
})();

document.write('<script src="test-platform-core.js?v=20260904"><\/script>');
document.write('<script src="test-results.js?v=20260904"><\/script>');
