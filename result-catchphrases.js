/* BDL QUIZ RESULT CATCHPHRASES — helper only; rendering lives in quiz-schedule-1530.js */
const BDL_CATCHPHRASE_SERVICE=BASE+"/quiz-catchphrase-service";
async function bdlLoadResultCatchphrase(questionNum,status){
  try{return await api(BDL_CATCHPHRASE_SERVICE,{action:"get",question_num:Number(questionNum),status});}
  catch(e){return null;}
}