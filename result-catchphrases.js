/* BDL QUIZ RESULT CATCHPHRASES — Supabase driven */
const BDL_CATCHPHRASE_SERVICE=BASE+"/quiz-catchphrase-service";
async function bdlLoadResultCatchphrase(questionNum,status){
  try{return await api(BDL_CATCHPHRASE_SERVICE,{action:"get",question_num:Number(questionNum),status});}
  catch(e){return null;}
}
setTimeout(()=>{
  window.showPreviousAnswer=async function(){
    const index=(typeof bdlClosedAnswerIndex==="function"?bdlClosedAnswerIndex():quizDay()-2),q=questions[index];
    if(index<0||!q?.question||!Array.isArray(q.answers)||!Number.isInteger(q.correct)){
      page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><div class="notice">No closed previous answer is available yet.</div></div>${back("showQuizMenu")}`);return;
    }
    page(`<div class="loading">Checking your recorded answer...</div>`);
    let record=null;
    try{
      const d=await accountApi({action:"get_answer",player_id:playerId(),question_num:questionNumber(index)});
      if(!d?.success)throw new Error("answer_lookup_failed");
      record=d.answered&&d.answer?d.answer:null;
    }catch(e){
      page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><div class="notice" style="background:#fff0df;border:2px solid #c65d00;color:#8a4100"><strong>Your recorded answer could not be verified.</strong><br><br>No result has been assumed. Please try again.</div></div>${back("showQuizMenu")}`);return;
    }
    let selected=null;
    if(record){
      selected=["A","B","C","D"].indexOf(String(record.answer||"").trim().toUpperCase());
      if(selected<0){page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><div class="notice" style="background:#fff0df;border:2px solid #c65d00;color:#8a4100"><strong>Your recorded answer could not be verified.</strong><br><br>No result has been assumed. Please try again.</div></div>${back("showQuizMenu")}`);return;}
    }
    const status=!record?"not_played":(record.is_correct===true?"correct":"incorrect");
    const cp=await bdlLoadResultCatchphrase(questionNumber(index),status);
    const character=cp?.success?html(cp.character):"";
    const phrase=cp?.success?html(cp.phrase):"";
    const player=!record?`<div class="answer"><strong>Your answer:</strong><br><br>No answer submitted.</div>`:`<div class="answer"><strong>Your answer:</strong><br><br>${html(q.answers[selected])}</div>`;
    const fixed=status==="correct"?"You got it right!":status==="incorrect"?"Better luck next time!":"This question was not answered.";
    let reaction="";
    if(phrase){reaction=status==="correct"?`<strong>${phrase}!</strong><br><br>`:`<strong>${character} ${status==="not_played"?"notes":"says"}:</strong><br>${phrase}<br><br>`;}
    const feedbackStyle=status==="correct"?"background:#e7f7ec;border:2px solid #238636;color:#145c2a":status==="incorrect"?"background:#fdeaea;border:2px solid #c62828;color:#8b1a1a":"background:#fff0df;border:2px solid #c65d00;color:#8a4100";
    const feedback=`<div class="notice" style="${feedbackStyle}">${reaction}<strong>${fixed}</strong></div>`;
    page(`<div class="section quiz-section"><h2 class="center">PREVIOUS ANSWER</h2><p><strong>Question ${questionNumber(index)}</strong></p><p>${html(q.question)}</p>${player}<div class="answer" style="margin-top:18px"><strong>The correct answer is ${html(q.answers[q.correct])}.</strong></div>${feedback}</div>${back("showQuizMenu")}`);
  };
  window.showYesterdayPage=window.showPreviousAnswer;
},0);
