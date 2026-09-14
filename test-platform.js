/* TEST PLATFORM LOADER */

/*
  Authoritative quiz questions live on the quiz-questions branch.
  Main fetches that JSON at runtime and replaces its local fallback list.
*/
(async function loadQuizQuestionsFromBranch(){
  try{
    const url =
      "https://raw.githubusercontent.com/BDL-Amy/Quiz-Me-This-BDL-Quiz-Me-That/quiz-questions/questions.json?ts="
      + Date.now();

    const response = await fetch(url,{cache:"no-store"});

    if(!response.ok){
      throw new Error("Question branch returned " + response.status);
    }

    const branchQuestions = await response.json();

    if(
      !Array.isArray(branchQuestions)
      ||
      !branchQuestions.length
    ){
      throw new Error("Question branch did not return a valid question list.");
    }

    if(typeof questions !== "undefined" && Array.isArray(questions)){
      questions.splice(0,questions.length,...branchQuestions);

      if(typeof showStartScreen === "function"){
        showStartScreen();
      }
    }
  }catch(error){
    console.error("Could not load quiz questions from quiz-questions branch:",error);
  }
})();

document.write('<script src="test-platform-core.js?v=20260904"><\/script>');
document.write('<script src="test-results.js?v=20260904"><\/script>');
