/* BDL QUIZ RESULT CATCHPHRASES */
const BDL_CORRECT_CATCHPHRASES=[
  "Spot on!",
  "Nailed it!",
  "Sharp thinking!",
  "BDL brilliance!",
  "You know your BDL!",
  "Right on target!",
  "Excellent memory!",
  "That was clever!",
  "Perfect answer!",
  "Quiz magic!"
];
const BDL_WRONG_CATCHPHRASES=[
  "Almost!",
  "So close!",
  "Nice try!",
  "Better luck next time!",
  "That one was tricky!",
  "The BDL archives got you this time!"
];
function bdlCatchphraseForIndex(index,correct){
  const list=correct?BDL_CORRECT_CATCHPHRASES:BDL_WRONG_CATCHPHRASES;
  const n=Math.abs(Number(index)||0)%list.length;
  return list[n];
}
function bdlResultWordForIndex(index){return bdlCatchphraseForIndex(index,true).replace(/[!.?]+$/,'');}
function bdlResultFeedbackForIndex(index,correct){return bdlCatchphraseForIndex(index,correct);}
