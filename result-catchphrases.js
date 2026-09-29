/* BDL QUIZ RESULT CATCHPHRASES — helper only; rendering lives in quiz-schedule-1530.js */
const BDL_CATCHPHRASE_SERVICE=BASE+"/quiz-catchphrase-service";
async function bdlLoadResultCatchphrase(questionNum,status){
  try{return await api(BDL_CATCHPHRASE_SERVICE,{action:"get",question_num:Number(questionNum),status});}
  catch(e){return null;}
}

/* Shared statistics dashboard loader.
   Single implementation used by Statistics, Rankings and Wall of Fame.
   quiz-results-service requires both the player id and claimed player name
   before it authorizes dashboard access. */
async function loadDashboard(){
  if(dashboardCache)return dashboardCache;
  const data=await api(RESULTS_SERVICE,{
    action:"dashboard",
    player_id:playerId(),
    player_name:playerName(),
    week_start:currentWeekStart(),
    month_start:currentMonthStart()
  });
  dashboardCache=data;
  return dashboardCache;
}
