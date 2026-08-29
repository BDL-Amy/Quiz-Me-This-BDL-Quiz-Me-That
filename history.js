/* BDL HISTORY: PREVIOUS QUESTIONS + WALL OF FAME */

function historyDateForIndex(index){
  const d = new Date(2026,7,11);
  d.setDate(d.getDate() + index);
  return d;
}

function historyDateLabel(d){
  return d.toLocaleDateString("en-GB",{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });
}

function historyShortDate(d){
  return d.toLocaleDateString("en-GB",{
    day:"numeric",
    month:"short"
  }).toUpperCase();
}

function historyMonday(d){
  const x = new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  return x;
}

function historyAddDays(d,n){
  const x = new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()+n);
  return x;
}

function historyReleasedLastIndex(){
  return Math.min(questions.length-1, quizDay()-1);
}

showHistory = function(){
  page(`
    <div class="section history">
      <h2 class="center">HISTORY</h2>
      <div class="menu">
        <button onclick="showPreviousQuestions()" style="border-color:var(--history);font-weight:bold">
          PREVIOUS QUESTIONS
        </button>
        <button onclick="showWallOfFameMenu()" style="border-color:var(--history);font-weight:bold">
          WALL OF FAME
        </button>
      </div>
    </div>
    ${back("showMainMenu")}
  `);
};

function showPreviousQuestions(){
  const last = historyReleasedLastIndex();

  if(last < 0){
    page(`
      <div class="section history">
        <h2 class="center">PREVIOUS QUESTIONS</h2>
        <div class="notice">No previous questions are available yet.</div>
      </div>
      ${back("showHistory")}
    `);
    return;
  }

  const weeks = new Map();
  for(let i=0;i<=last;i++){
    const d = historyDateForIndex(i);
    const monday = historyMonday(d);
    const key = dateString(monday);
    if(!weeks.has(key)) weeks.set(key,{monday,indices:[]});
    weeks.get(key).indices.push(i);
  }

  const buttons = [...weeks.values()]
    .sort((a,b)=>b.monday-a.monday)
    .map(w=>{
      const sunday = historyAddDays(w.monday,6);
      return `
        <button onclick="showPreviousQuestionsWeek('${dateString(w.monday)}')" style="border-color:var(--history);font-weight:bold">
          ${historyShortDate(w.monday)} – ${historyShortDate(sunday)}
        </button>
      `;
    }).join("");

  page(`
    <div class="section history">
      <h2 class="center">PREVIOUS QUESTIONS</h2>
      <p class="center">Choose a quiz week.</p>
      <div class="menu">${buttons}</div>
    </div>
    ${back("showHistory")}
  `);
}

async function historyPlayerAnswer(index){
  let selected = savedAnswer(index);

  try{
    const data = await accountApi({
      action:"get_answer",
      player_id:playerId(),
      question_num:questionNumber(index)
    });

    if(data.answered && data.answer){
      const letter = String(data.answer.answer || "").trim().toUpperCase();
      const backendIndex = ["A","B","C","D"].indexOf(letter);
      if(backendIndex >= 0) selected = backendIndex;
    }
  }catch(error){
    /* Local answer remains the fallback. */
  }

  return Number.isInteger(selected) && selected >= 0 && selected <= 3 ? selected : null;
}

async function showPreviousQuestionsWeek(weekStart){
  page(`<div class="loading">Loading previous questions...</div>`);

  const monday = new Date(weekStart + "T12:00:00");
  const sunday = historyAddDays(monday,6);
  const last = historyReleasedLastIndex();
  const rows = [];

  for(let i=0;i<=last;i++){
    const d = historyDateForIndex(i);
    if(d >= historyMonday(monday) && d <= sunday){
      rows.push({index:i,date:d,answer:await historyPlayerAnswer(i)});
    }
  }

  let htmlRows = "";

  for(const row of rows){
    const q = questions[row.index];
    if(!q || !q.question || !Array.isArray(q.answers)) continue;

    const correct = q.correct;
    const your = row.answer;
    const options = q.answers.map((answer,idx)=>{
      const letter = String.fromCharCode(65+idx);
      return `<div style="padding:7px 0"><strong>${letter}/</strong> ${html(answer)}</div>`;
    }).join("");

    const yourText = your === null
      ? "Not answered"
      : `${String.fromCharCode(65+your)}/ ${html(q.answers[your])}`;

    const correctText = `${String.fromCharCode(65+correct)}/ ${html(q.answers[correct])}`;

    htmlRows += `
      <div class="wall-card" style="background:#fff;border:2px solid var(--history);text-align:left">
        <h3 style="margin-bottom:4px">${html(historyDateLabel(row.date))}</h3>
        <small style="text-align:left;margin-bottom:12px">Question ${questionNumber(row.index)}</small>
        <p><strong>${html(q.question)}</strong></p>
        <div>${options}</div>
        <div class="notice" style="text-align:left">
          <strong>Your answer:</strong><br>${yourText}
        </div>
        <div class="notice" style="text-align:left">
          <strong>Correct answer:</strong><br>${correctText}
        </div>
      </div>
    `;
  }

  if(!htmlRows){
    htmlRows = `<div class="notice">No released questions are available for this week yet.</div>`;
  }

  page(`
    <div class="section history">
      <h2 class="center">PREVIOUS QUESTIONS</h2>
      <p class="center"><strong>${historyShortDate(monday)} – ${historyShortDate(sunday)}</strong></p>
      ${htmlRows}
    </div>
    ${back("showPreviousQuestions")}
  `);
}

function showWallOfFameMenu(){
  page(`
    <div class="section history">
      <h2 class="center">WALL OF FAME</h2>
      <div class="menu">
        <button onclick="showWeeklyWallOfFame()" style="border-color:var(--gold);font-weight:bold">
          SMARTEST BDL'ER OF THE WEEK
        </button>
        <button onclick="showSupremeWallOfFame()" style="border-color:var(--copper);font-weight:bold">
          SUPREME BDL'ER
        </button>
      </div>
    </div>
    ${back("showHistory")}
  `);
}

async function showWeeklyWallOfFame(){
  page(`<div class="loading">Loading Wall of Fame...</div>`);

  try{
    const data = await loadDashboard();
    const rows = Array.isArray(data?.history?.weekly) ? data.history.weekly : [];

    const cards = rows.length ? rows.map(row=>`
      <div class="wall-card week">
        <strong>SMARTEST BDL'ER OF THE WEEK</strong>
        <h3>${html(row.player_name)}</h3>
        <div>${row.correct_answers ?? 0} correct · ${row.days_played ?? 0} days played</div>
        <small>${html(row.week_start)} — ${html(row.week_end)}</small>
      </div>
    `).join("") : `<div class="notice">No weekly winners yet.</div>`;

    page(`
      <div class="section history">
        <h2 class="center">SMARTEST BDL'ER OF THE WEEK</h2>
        ${cards}
      </div>
      ${back("showWallOfFameMenu")}
    `);
  }catch(error){
    page(`
      <div class="section history">
        <h2 class="center">SMARTEST BDL'ER OF THE WEEK</h2>
        <div class="notice">The weekly Wall of Fame could not be loaded.</div>
      </div>
      ${back("showWallOfFameMenu")}
    `);
  }
}

async function showSupremeWallOfFame(){
  page(`<div class="loading">Loading Wall of Fame...</div>`);

  try{
    const data = await loadDashboard();
    const rows = Array.isArray(data?.history?.monthly) ? data.history.monthly : [];

    const cards = rows.length ? rows.map(row=>`
      <div class="wall-card month">
        <strong>THE SUPREME BDL'ER</strong>
        <h3>${html(row.player_name)}</h3>
        <div>${row.correct_answers ?? 0} correct · ${row.days_played ?? 0} days played</div>
        <small>${html(row.month_start)} — ${html(row.month_end)}</small>
      </div>
    `).join("") : `<div class="notice">No Supreme BDL'er winners yet.</div>`;

    page(`
      <div class="section history">
        <h2 class="center">SUPREME BDL'ER</h2>
        ${cards}
      </div>
      ${back("showWallOfFameMenu")}
    `);
  }catch(error){
    page(`
      <div class="section history">
        <h2 class="center">SUPREME BDL'ER</h2>
        <div class="notice">The Supreme Wall of Fame could not be loaded.</div>
      </div>
      ${back("showWallOfFameMenu")}
    `);
  }
}
