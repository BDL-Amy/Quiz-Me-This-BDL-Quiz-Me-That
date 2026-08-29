/* BDL PLAYER ACCOUNTS + RECOVERY */

const AMY_TEST_PLAYER_ID = "a06f21c0-62a7-4072-bad8-e12f6d846e99";

function normalizePlayerName(value){
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g," ")
    .toLowerCase();
}

function isAmyTestIdentity(){
  return (
    String(playerId()) === AMY_TEST_PLAYER_ID
    &&
    normalizePlayerName(playerName()) === "amy.test"
  );
}

async function accountApi(body){
  const response = await fetch(QUIZ_SERVICE,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });

  const data = await response.json().catch(()=>({}));

  if(!response.ok){
    const error = new Error(data.error || "Something went wrong.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function clearLocalIdentity(){
  localStorage.removeItem("bdlPlayerName");
  localStorage.removeItem("bdlPlayerId");
}

function generatePlayerId(){
  if(crypto.randomUUID){
    return crypto.randomUUID();
  }

  return "bdl-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function showAccountChoice(){
  document.getElementById("mainHeader").style.display = "none";

  page(`
    <div class="center">
      <h1>Quiz Me This<br>BDL<br>Quiz Me That</h1>
      <p>Choose how you want to continue.</p>

      <button onclick="showNewPlayerRegistration()">
        NEW PLAYER
      </button>

      <button onclick="showAccountRecovery()">
        I ALREADY HAVE AN ACCOUNT
      </button>
    </div>
  `);
}

function showNewPlayerRegistration(){
  page(`
    <div class="center">
      <h2>NEW PLAYER</h2>
      <p>Choose your unique player name.</p>

      <input id="newPlayerName" placeholder="Your player name" maxlength="50">

      <div id="accountMessage" class="notice" style="display:none"></div>

      <button id="registerPlayerButton" onclick="registerNewPlayer()">
        CREATE ACCOUNT
      </button>

      ${back("showAccountChoice")}
    </div>
  `);
}

async function registerNewPlayer(){
  const input = document.getElementById("newPlayerName");
  const button = document.getElementById("registerPlayerButton");
  const message = document.getElementById("accountMessage");
  const name = String(input?.value || "").trim();

  if(!name){
    input?.focus();
    return;
  }

  button.disabled = true;
  button.textContent = "CREATING...";

  const candidateId = generatePlayerId();

  try{
    const data = await accountApi({
      action:"register_player",
      player_id:candidateId,
      player_name:name
    });

    localStorage.setItem("bdlPlayerId",data.player_id || candidateId);
    localStorage.setItem("bdlPlayerName",data.player_name || name);
    dashboardCache = null;
    migrateLegacyAnswers();

    if(data.recovery_code){
      showRecoveryCodeOnce(data.recovery_code);
    }else{
      showStartScreen();
    }

  }catch(error){
    message.style.display = "block";

    if(error.status === 409 && String(error.message).includes("name_taken")){
      message.textContent = "That player name is already in use. Please choose another name.";
    }else{
      message.textContent = error.message || "Your account could not be created.";
    }

    button.disabled = false;
    button.textContent = "CREATE ACCOUNT";
  }
}

function showRecoveryCodeOnce(code){
  page(`
    <div class="section settings">
      <h2 class="center">YOUR RECOVERY CODE</h2>

      <div class="settings-card center">
        <p>Keep this code somewhere safe. You need it if you change device.</p>

        <div class="notice" style="font-size:22px;font-weight:bold;letter-spacing:1px">
          ${html(code)}
        </div>

        <p>This code is shown only now. You can generate a new one later in Personal Settings.</p>

        <button class="settings-button" onclick="confirmRecoveryCodeSaved()">
          I HAVE SAVED MY CODE
        </button>
      </div>
    </div>
  `);
}

function confirmRecoveryCodeSaved(){
  showStartScreen();
}

function showAccountRecovery(){
  clearLocalIdentity();

  page(`
    <div class="center">
      <h2>RECOVER ACCOUNT</h2>
      <p>Enter your player name and recovery code.</p>

      <input id="recoverPlayerName" placeholder="Player name" maxlength="50">
      <input id="recoverPlayerCode" placeholder="BDL-XXXX-XXXX-XXXX-XXXX" maxlength="24" autocapitalize="characters">

      <div id="recoveryMessage" class="notice" style="display:none"></div>

      <button id="recoverPlayerButton" onclick="recoverExistingPlayer()">
        RECOVER ACCOUNT
      </button>

      ${back("showAccountChoice")}
    </div>
  `);
}

async function recoverExistingPlayer(){
  const name = String(document.getElementById("recoverPlayerName")?.value || "").trim();
  const recoveryCode = String(document.getElementById("recoverPlayerCode")?.value || "").trim();
  const button = document.getElementById("recoverPlayerButton");
  const message = document.getElementById("recoveryMessage");

  if(!name || !recoveryCode){
    message.style.display = "block";
    message.textContent = "Enter both your player name and recovery code.";
    return;
  }

  button.disabled = true;
  button.textContent = "CHECKING...";

  try{
    const data = await accountApi({
      action:"recover_player",
      player_name:name,
      recovery_code:recoveryCode
    });

    localStorage.setItem("bdlPlayerId",data.player_id);
    localStorage.setItem("bdlPlayerName",data.player_name);
    dashboardCache = null;
    migrateLegacyAnswers();
    showStartScreen();

  }catch(error){
    message.style.display = "block";

    if(error.status === 401){
      message.textContent = "The player name or recovery code is not correct.";
    }else if(error.status === 409 && String(error.message).includes("recovery_not_set")){
      message.textContent = "No recovery code has been created for this account yet. Contact the quiz administrator.";
    }else{
      message.textContent = error.message || "Your account could not be recovered.";
    }

    button.disabled = false;
    button.textContent = "RECOVER ACCOUNT";
  }
}

/* Scope local answers to the player ID. */
answerKey = function(index){
  return "bdlQuizAnswer_" + playerId() + "_" + questionNumber(index);
};

function legacyAnswerKey(index){
  return "bdlQuizAnswer_" + questionNumber(index);
}

function migrateLegacyAnswers(){
  const id = localStorage.getItem("bdlPlayerId");
  if(!id) return;

  for(let i=0;i<questions.length;i++){
    const legacy = legacyAnswerKey(i);
    const scoped = "bdlQuizAnswer_" + id + "_" + questionNumber(i);

    if(localStorage.getItem(scoped) === null){
      const value = localStorage.getItem(legacy);
      if(value !== null){
        localStorage.setItem(scoped,value);
      }
    }
  }
}

/* Account-aware start screen. Existing users on this device continue normally. */
showStartScreen = function(){
  document.getElementById("mainHeader").style.display = "none";

  const day = quizDay();

  if(day < 0){
    page(`
      <div class="center">
        <h1>Quiz Me This<br>BDL<br>Quiz Me That</h1>
        <p>The Daily Quiz starts on 11 August at 08:00.</p>
      </div>
    `);
    return;
  }

  if(day >= questions.length){
    page(`
      <div class="center">
        <h1>Quiz Me This<br>BDL<br>Quiz Me That</h1>
        <p>No new Daily Quiz is scheduled yet.</p>
      </div>
    `);
    return;
  }

  const name = playerName();
  const id = localStorage.getItem("bdlPlayerId");

  if(!name || !id){
    showAccountChoice();
    return;
  }

  migrateLegacyAnswers();

  page(`
    <div class="center">
      <h1>Quiz Me This<br>BDL<br>Quiz Me That</h1>
      <p>Welcome back, <strong>${html(name)}</strong>!</p>
      <button class="center" onclick="startQuiz()">START QUIZ</button>
    </div>
  `);
};

/* Amy.TEST gets a separate test entry point. */
showMainMenu = function(){
  document.getElementById("mainHeader").style.display = "block";

  const testButton = isAmyTestIdentity()
    ? `<button onclick="showTestMode()">TEST MODE</button>`
    : "";

  page(`
    <h2 class="center">Welcome, ${html(playerName())}</h2>

    <div class="menu main-menu">
      <button onclick="showMyStatistics()">MY STATISTICS</button>
      <button onclick="showQuizMenu()">QUIZ</button>
      <button onclick="showHistory()">HISTORY</button>
      <button onclick="showPersonalSettings()">PERSONAL SETTINGS</button>
      ${testButton}
    </div>
  `);
};

function showTestMode(){
  if(!isAmyTestIdentity()){
    showMainMenu();
    return;
  }

  page(`
    <div class="section settings">
      <h2 class="center">TEST MODE</h2>
      <div class="settings-card center">
        <p>Amy.TEST is recognised as the test account.</p>
        <p>The full test platform will be added in step 2.</p>
      </div>
    </div>
    ${back("showMainMenu")}
  `);
}

/* Personal settings: recovery + existing push settings. */
showPersonalSettings = async function(){
  page(`
    <div class="section settings">
      <h2 class="center">PERSONAL SETTINGS</h2>

      <div class="settings-card">
        <h3>Account recovery</h3>
        <p>Use a recovery code to restore this player account on another device.</p>
        <p id="recoveryStatus">Checking status...</p>
        <button id="recoveryButton" class="settings-button" onclick="createOrRotateRecoveryCode()" disabled>
          PLEASE WAIT...
        </button>
      </div>

      <div class="settings-card" style="margin-top:14px">
        <h3>Push notifications</h3>
        <p>Receive a notification when the new Daily Quiz is available.</p>
        <p id="pushStatus">Checking status...</p>
        <button id="pushButton" class="settings-button" onclick="togglePushNotifications()">
          PLEASE WAIT...
        </button>
      </div>
    </div>

    ${back("showMainMenu")}
  `);

  await Promise.all([
    refreshRecoveryStatus(),
    refreshPushStatus()
  ]);
};

async function refreshRecoveryStatus(){
  const status = document.getElementById("recoveryStatus");
  const button = document.getElementById("recoveryButton");
  if(!status || !button) return;

  try{
    const data = await accountApi({
      action:"recovery_status",
      player_id:playerId(),
      player_name:playerName()
    });

    if(data.recovery_enabled){
      status.innerHTML = "<strong>Status: SET</strong>";
      button.textContent = "GENERATE NEW RECOVERY CODE";
    }else{
      status.innerHTML = "<strong>Status: NOT SET</strong>";
      button.textContent = "CREATE RECOVERY CODE";
    }

    button.disabled = false;
  }catch(error){
    status.textContent = "Recovery status could not be checked.";
    button.textContent = "TRY AGAIN";
    button.disabled = false;
  }
}

async function createOrRotateRecoveryCode(){
  const button = document.getElementById("recoveryButton");
  if(button){
    button.disabled = true;
    button.textContent = "GENERATING...";
  }

  try{
    const statusData = await accountApi({
      action:"recovery_status",
      player_id:playerId(),
      player_name:playerName()
    });

    let data;

    if(statusData.recovery_enabled){
      data = await accountApi({
        action:"rotate_recovery_code",
        player_id:playerId(),
        player_name:playerName()
      });
    }else{
      data = await accountApi({
        action:"register_player",
        player_id:playerId(),
        player_name:playerName()
      });
    }

    if(!data.recovery_code){
      throw new Error("No recovery code was returned.");
    }

    showRecoveryCodeOnce(data.recovery_code);
  }catch(error){
    alert(error.message || "A recovery code could not be generated.");
    await refreshRecoveryStatus();
  }
}

/* Keep the backend answer authoritative when it says this player already answered. */
submitAnswer = async function(){
  const index = quizDay();
  const q = questions[index];

  if(selectedAnswer === null || !q) return;

  const button = document.getElementById("submitButton");
  if(button){
    button.disabled = true;
    button.textContent = "SUBMITTING...";
  }

  try{
    const response = await fetch(QUIZ_SERVICE,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        action:"submit_answer",
        player_id:playerId(),
        player_name:playerName(),
        quiz_date:dateString(effectiveDate()),
        question_num:questionNumber(index),
        answer:String.fromCharCode(65+selectedAnswer),
        is_correct:selectedAnswer === q.correct
      })
    });

    const data = await response.json().catch(()=>({}));

    if(response.ok){
      storeAnswer(index,selectedAnswer);
      dashboardCache = null;
      showThankYouPage();
      return;
    }

    if(response.status === 409 && String(data.error || "").includes("already_answered")){
      const existing = await accountApi({
        action:"get_answer",
        player_id:playerId(),
        question_num:questionNumber(index)
      });

      if(existing.answered && existing.answer){
        const letter = String(existing.answer.answer || "").trim().toUpperCase();
        const actualIndex = ["A","B","C","D"].indexOf(letter);

        if(actualIndex >= 0){
          selectedAnswer = actualIndex;
          storeAnswer(index,actualIndex);
          showTodayQuestion();
          return;
        }
      }
    }

    throw new Error(data.error || "Your answer could not be submitted.");
  }catch(error){
    if(button){
      button.disabled = false;
      button.textContent = "SUBMIT ANSWER";
    }

    alert(error.message || "Your answer could not be submitted.");
  }
};

/* Re-render after the original script's startup call. */
migrateLegacyAnswers();
showStartScreen();
