/* LIVE RESULTS — TEST ACCOUNTS ONLY */
const TEST_RESULTS_SERVICE = BASE + "/test-results-service";

// The full test platform originally only admitted Amy.TEST.
// Keep the same platform, but allow both recognised test accounts.
testGuard = function(){
  if(!isTestIdentity()){
    showMainMenu();
    return false;
  }
  return true;
};

const baseShowTestControlPlatform = showTestControlPlatform;
showTestControlPlatform = function(){
  baseShowTestControlPlatform();
  if(!isTestIdentity()) return;
  const menu = document.querySelector(".section.settings .menu");
  if(!menu || document.getElementById("testResultsButton")) return;
  const b = document.createElement("button");
  b.id = "testResultsButton";
  b.className = "settings-button";
  b.textContent = "RESULTS";
  b.onclick = ()=>showTestResults();
  menu.insertBefore(b, menu.firstChild);
};

async function showTestResults(index){
  if(!testGuard()) return;
  if(!Number.isInteger(index)) index=Math.max(0,Math.min(questions.length-1,quizDay()));
  const q=questions[index];
  const options=questions.map((item,i)=>`<option value="${i}" ${i===index?'selected':''}>Q${questionNumber(i)} · ${testQuestionDateString(i)}</option>`).join("");

  testShell("RESULTS",`
    <div class="settings-card">
      <label><strong>Question</strong></label>
      <select onchange="showTestResults(Number(this.value))" style="width:100%;padding:14px;margin:8px 0 14px;border:2px solid #111;border-radius:12px;font-size:16px">${options}</select>
      <p><strong>Question ${questionNumber(index)}</strong></p>
      <p>${html(q?.question||"")}</p>
    </div>
    <div class="notice"><strong>LIVE ADMIN RESULTS</strong><br>Player answers appear here immediately after they submit. This view is available only in the recognised test accounts.</div>
    <div id="testResultsArea" class="loading">Loading results...</div>
    <button class="settings-button" onclick="loadTestResults(${index})">REFRESH RESULTS</button>
  `);
  await loadTestResults(index);
}

async function loadTestResults(index){
  if(!testGuard()) return;
  const area=document.getElementById("testResultsArea");
  if(area) area.innerHTML='<div class="loading">Loading results...</div>';
  try{
    const data=await api(TEST_RESULTS_SERVICE,{
      action:"results",
      player_id:playerId(),
      player_name:playerName(),
      quiz_date:testQuestionDateString(index),
      question_num:questionNumber(index)
    });
    const rows=Array.isArray(data.results)?data.results:[];
    if(!area) return;
    if(!rows.length){
      area.innerHTML='<div class="notice">No player has answered this question yet.</div>';
      return;
    }

    const correct=rows.filter(r=>r.is_correct===true).length;
    const incorrect=rows.filter(r=>r.is_correct===false).length;
    const scored=correct+incorrect;
    const correctPct=scored?Math.round(correct/scored*100):0;
    const incorrectPct=scored?100-correctPct:0;

    area.innerHTML=`
      <div class="notice"><strong>${rows.length} ANSWER${rows.length===1?'':'S'}</strong></div>

      <div class="settings-card" style="margin:10px 0 16px;text-align:left">
        <h3 style="margin-bottom:12px">CORRECT / INCORRECT</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:center">
          <div class="stat-card">
            <strong>${correct}</strong>
            Correct<br>
            <small style="margin:5px 0 0">${correctPct}%</small>
          </div>
          <div class="stat-card">
            <strong>${incorrect}</strong>
            Incorrect<br>
            <small style="margin:5px 0 0">${incorrectPct}%</small>
          </div>
        </div>
        <div style="display:flex;width:100%;height:14px;border-radius:999px;overflow:hidden;margin-top:12px;background:#eee" aria-label="${correctPct}% correct, ${incorrectPct}% incorrect">
          <div style="width:${correctPct}%;background:#267c78"></div>
          <div style="width:${incorrectPct}%;background:#b42318"></div>
        </div>
      </div>

      ${rows.map(r=>{
        const answer=String(r.answer||'—');
        const mark=r.is_correct===true?'✓ CORRECT':r.is_correct===false?'✗ INCORRECT':'—';
        return `<div class="settings-card" style="margin:10px 0;text-align:left">
          <strong>${html(r.player_name||'Unknown player')}</strong><br>
          <div style="margin-top:7px"><strong>Answer:</strong> ${html(answer)}</div>
          <div style="margin-top:5px"><strong>Result:</strong> ${html(mark)}</div>
        </div>`;
      }).join('')}
    `;
  }catch(e){
    if(area) area.innerHTML=`<div class="notice">Results could not be loaded.<br>${html(e.message||'Unknown error')}</div>`;
  }
}
