/* One-time recovery-code onboarding for existing BDL players. */

const RECOVERY_ONBOARDING_KEY = "bdlRecoveryOnboardingSavedV1";
let recoveryOnboardingChecked = false;

async function checkExistingPlayerRecoveryOnboarding(){
  if(recoveryOnboardingChecked) return false;
  recoveryOnboardingChecked = true;

  const id = localStorage.getItem("bdlPlayerId");
  const name = localStorage.getItem("bdlPlayerName");

  if(!id || !name) return false;
  if(localStorage.getItem(RECOVERY_ONBOARDING_KEY) === "yes") return false;

  try{
    const status = await accountApi({
      action:"recovery_status",
      player_id:id,
      player_name:name
    });

    /* New players already received their code during account creation. */
    if(status.recovery_enabled){
      localStorage.setItem(RECOVERY_ONBOARDING_KEY,"yes");
      return false;
    }

    const data = await accountApi({
      action:"register_player",
      player_id:id,
      player_name:name
    });

    if(!data.recovery_code){
      return false;
    }

    showExistingPlayerRecoveryNotice(data.recovery_code);
    return true;
  }catch(error){
    console.log("Recovery onboarding will be tried again later.");
    recoveryOnboardingChecked = false;
    return false;
  }
}

function showExistingPlayerRecoveryNotice(code){
  document.getElementById("mainHeader").style.display = "none";

  page(`
    <div class="section settings">
      <h2 class="center">IMPORTANT — SAVE YOUR RECOVERY CODE</h2>

      <div class="settings-card center">
        <p>
          Your player account now has a recovery code.
          You will need this code if you change or lose your device.
        </p>

        <p><strong>Keep it somewhere safe.</strong></p>

        <div class="notice" style="font-size:22px;font-weight:bold;letter-spacing:1px;word-break:break-word">
          ${html(code)}
        </div>

        <p>
          This code is shown only now. You can generate a new code later in Personal Settings.
        </p>

        <button class="settings-button" onclick="confirmExistingRecoverySaved()">
          I HAVE SAVED MY CODE
        </button>
      </div>
    </div>
  `);
}

function confirmExistingRecoverySaved(){
  localStorage.setItem(RECOVERY_ONBOARDING_KEY,"yes");
  showStartScreen();
}

/* Question 49 repair: remove the accidental empty slot directly before the Bubu money question. */
if(typeof questions !== "undefined"){
  const q49Index = 49 - FIRST_QUESTION_NUMBER;
  const slot = questions[q49Index];
  const next = questions[q49Index + 1];
  if(
    slot && !slot.question &&
    next && next.question === "Bubu found a big bag with a lot of money once. What did she do with it?"
  ){
    questions.splice(q49Index,1);
  }
}

/* Check once on the player's next visit, after account.js has loaded. */
setTimeout(()=>{
  checkExistingPlayerRecoveryOnboarding();
},0);
