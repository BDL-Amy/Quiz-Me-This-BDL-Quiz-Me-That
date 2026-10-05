const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
for (const file of fs.readdirSync('.').filter(f => f.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(file, 'utf8'), {filename:file});
}
async function check(name) {
  const storage = new Map(name ? [['bdlPlayerId','test-player'], ['bdlPlayerName', name]] : []);
  const nodes = new Map(['quiz','mainHeader'].map(id => [id,{innerHTML:'',style:{}}]));
  const requests = [];
  const context = vm.createContext({
    console, Date, Intl, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    crypto:{randomUUID:()=>'test-player'}, navigator:{}, location:{search:'',href:'https://example.test/'},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    document:{getElementById:id=>nodes.get(id)??null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute:()=>{}}),head:{appendChild:()=>{}},body:{appendChild:()=>{}}},
    alert:()=>{},
    fetch:async (url,options)=>{
      const body=JSON.parse(options.body);requests.push(body);
      assert.equal(body.action,'get_current_question');
      return {ok:true,json:async()=>({question:{question_num:71,quiz_date:'2026-10-05',question:'Test live question',answers:['One','Two','Three','Four']}})};
    }
  });
  context.window=context;
  for(const [,attrs,inline] of scripts){
    const src=attrs.match(/src="([^"]+)"/);
    const code=src?fs.readFileSync(src[1].split('?')[0],'utf8'):inline;
    vm.runInContext(code,context,{filename:src?.[1]||'inline'});
  }
  const screen=()=>nodes.get('quiz').innerHTML;
  if(!name){assert.match(screen(),/NEW PLAYER/);assert.match(screen(),/I ALREADY HAVE AN ACCOUNT/);return;}
  assert.match(screen(),/START QUIZ/);
  context.startQuiz();
  assert.match(screen(),/MY STATISTICS/);
  assert.equal(/TEST PLATFORM/.test(screen()),name==='Amy.test'||name==='DrBDL.test');
  for(const handler of ['showPersonalSettings','refreshPushStatus','showMainMenu','showMyStatistics','showHistory','showQuizPolicy'])assert.equal(typeof context[handler],'function',handler);
  context.showQuizMenu();assert.match(screen(),/PLAY/);
  context.showQuizPlayMenu();assert.match(screen(),/RESULT/);
  context.showQuizPlayQuizMenu();assert.match(screen(),/TODAY'S QUESTION/);
  await context.showTodayQuestion();
  assert.match(screen(),/QUESTION 71/);assert.match(screen(),/Test live question/);
  assert.equal(requests.length,1);
  assert.equal(typeof vm.runInContext('window.__bdlCurrentQuestion',context),'object');
  assert.doesNotMatch(screen(),/correct answer is/i);
  context.showMainMenu();assert.match(screen(),/MY STATISTICS/);
}
(async()=>{for(const name of ['', 'Player', 'Amy.test', 'DrBDL.test'])await check(name);console.log('PASS: production scripts load together; new accounts, Start, menu, live question and Back work for player and test identities.');})().catch(e=>{console.error(e);process.exit(1)});
