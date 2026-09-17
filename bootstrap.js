/* BDL bootstrap — fast cached legacy shell + current modules. */
(function(){
  const LEGACY_SHELL='https://raw.githubusercontent.com/BDL-Amy/Quiz-Me-This-BDL-Quiz-Me-That/18a31bcbb2c83c1dbc405b3b1d23bd0492b23567/index.html';
  const VERSION='20260917-fast2';
  const CACHE_KEY='bdl_legacy_shell_v1';
  function modernize(html){
    let out=html.replace('<script src="questions-51-60.js?v=20260916-live2"></script>','').replace('<script src="quiz-schedule-1530.js?v=20260917a"></script>','').replace('questions-51-60.js?v=20260916-live3',`questions-51-60.js?v=${VERSION}`).replace('quiz-schedule-1530.js?v=20260917a',`quiz-schedule-1530.js?v=${VERSION}`).replace('result-catchphrases.js?v=20260917a',`result-catchphrases.js?v=${VERSION}`).replace('account.js?v=20260909c',`account.js?v=${VERSION}`).replace('history.js?v=20260914d',`history.js?v=${VERSION}`).replace('test-platform.js?v=20260917a',`test-platform.js?v=${VERSION}`).replace('recovery-onboarding.js?v=20260909',`recovery-onboarding.js?v=${VERSION}`).replace('results-menu.js?v=20260914e',`results-menu.js?v=${VERSION}`);
    out=out.replace('</body>',`<script src="performance.js?v=${VERSION}"></script></body>`);
    return out;
  }
  function launch(t){document.open();document.write(modernize(t));document.close()}
  let cached=null;try{cached=localStorage.getItem(CACHE_KEY)}catch(e){}
  if(cached){launch(cached);fetch(LEGACY_SHELL,{cache:'force-cache'}).then(r=>r.ok?r.text():null).then(t=>{if(t)try{localStorage.setItem(CACHE_KEY,t)}catch(e){}}).catch(()=>{});return}
  fetch(LEGACY_SHELL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('legacy_shell_unavailable');return r.text()}).then(t=>{try{localStorage.setItem(CACHE_KEY,t)}catch(e){}launch(t)}).catch(()=>{const el=document.getElementById('restore');if(el)el.textContent='The quiz could not be loaded. Please refresh.'});
})();