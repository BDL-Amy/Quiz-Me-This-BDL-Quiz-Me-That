from pathlib import Path
p=Path('recovery-onboarding.js')
s=p.read_text()
marker='/* POLICY UPDATE NOTICE 2026-08-31 */'
if marker in s:
    raise SystemExit('Policy popup already present')
block=r'''

/* POLICY UPDATE NOTICE 2026-08-31 */
const BDL_POLICY_NOTICE_VERSION="2026-08-31-statistics-rankings";
const BDL_POLICY_NOTICE_KEY=`bdlPolicyNoticeSeen:${BDL_POLICY_NOTICE_VERSION}`;

function bdlClosePolicyUpdateNotice(markSeen=true){
  if(markSeen) localStorage.setItem(BDL_POLICY_NOTICE_KEY,"yes");
  const overlay=document.getElementById("bdlPolicyUpdateOverlay");
  if(overlay) overlay.remove();
}

function bdlOpenUpdatedPolicy(){
  bdlClosePolicyUpdateNotice(true);
  if(typeof showQuizPolicy==="function") showQuizPolicy();
}

function bdlShowPolicyUpdateNotice(){
  if(!playerName()) return;
  if(localStorage.getItem(BDL_POLICY_NOTICE_KEY)==="yes") return;
  if(document.getElementById("bdlPolicyUpdateOverlay")) return;
  const overlay=document.createElement("div");
  overlay.id="bdlPolicyUpdateOverlay";
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-labelledby","bdlPolicyUpdateTitle");
  overlay.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box";
  overlay.innerHTML=`
    <div style="width:min(520px,100%);max-height:88vh;overflow:auto;background:#fff;color:#111;border:3px solid #111;border-radius:18px;padding:22px;box-sizing:border-box;box-shadow:0 18px 60px rgba(0,0,0,.35)">
      <h2 id="bdlPolicyUpdateTitle" class="center" style="margin-top:0">POLICY UPDATED</h2>
      <p class="center"><strong>31 AUGUST 2026</strong></p>
      <div class="notice" style="text-align:left">
        Our Quiz Policy has been updated to explain the new Statistics & Rankings system more clearly.
      </div>
      <p style="text-align:left"><strong>What changed?</strong></p>
      <p style="text-align:left">The policy now explains This Week, This Month and All Time statistics, the Quiz Top 20 rankings, Title Points, the All-Time Title Top 20, ranking privacy, and read-only test/admin access.</p>
      <p style="text-align:left">Your ranking privacy choice still does <strong>not</strong> affect your chances of becoming a weekly or monthly winner.</p>
      <div class="menu" style="margin-top:18px">
        <button class="settings-button" onclick="bdlOpenUpdatedPolicy()">READ UPDATED POLICY</button>
        <button onclick="bdlClosePolicyUpdateNotice(true)">CONTINUE</button>
      </div>
      <p class="center" style="font-size:.78rem;opacity:.72;margin-bottom:0">This notice is shown once for this policy version.</p>
    </div>`;
  document.body.appendChild(overlay);
}

if(typeof showStartScreen==="function"){
  const bdlShowStartScreenBeforePolicyNotice=showStartScreen;
  showStartScreen=function(){
    bdlShowStartScreenBeforePolicyNotice();
    setTimeout(()=>bdlShowPolicyUpdateNotice(),30);
  };
}

setTimeout(()=>bdlShowPolicyUpdateNotice(),120);
'''
p.write_text(s.rstrip()+block+'\n')
