/* TEST PLATFORM LOADER */

const QUESTION_SERVICE =
  BASE + "/quiz-question-service";

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
