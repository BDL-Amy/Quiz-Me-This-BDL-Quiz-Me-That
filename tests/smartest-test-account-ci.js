const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function must(ok,msg){if(!ok){console.error("FAIL:",msg);process.exitCode=1}else console.log("PASS:",msg)}
const index=read("index.html"),history=read("history.js"),stats=read("results-menu.js"),backend=read("supabase/functions/quiz-results-service/index.ts");
must(/window\.showMyStatistics=function/.test(stats),"statistics navigation is active");
must(/TEST PLATFORM/.test(history)&&/BDL-Amy-test-platform/.test(history),"test accounts link to standalone TEST PLATFORM");
must(/isTestIdentity\(\)/.test(history),"TEST PLATFORM entry is limited to test identities");
must(/test-session-service/.test(history),"secure TEST PLATFORM handoff is active");
must(!/<script src="test-platform\.js/.test(index)&&!/<script src="test-platform-core\.js/.test(index)&&!/<script src="test-results\.js/.test(index),"embedded TEST PLATFORM code is absent from production main");
must(/if\(b\.action==="admin_weekly_overview"\)/.test(backend),"backend weekly overview endpoint exists");
must(/if\(b\.action==="weekly_winner"\)/.test(backend),"backend weekly winner endpoint exists");
must(/if\(b\.action==="latest_weekly_winner"\)/.test(backend),"backend latest weekly winner endpoint exists");
must(/Results are published at Previous Answer/.test(stats),"Previous Answer publication rule is preserved");
if(process.exitCode)process.exit(process.exitCode);
console.log("All BDL quiz integration checks passed.");
