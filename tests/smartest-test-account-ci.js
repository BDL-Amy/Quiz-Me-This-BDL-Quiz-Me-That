const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function must(ok,msg){if(!ok){console.error("FAIL:",msg);process.exitCode=1}else console.log("PASS:",msg)}
const index=read("index.html"),account=read("account.js"),history=read("history.js"),stats=read("results-menu.js"),platform=read("test-platform.js"),core=read("test-platform-core.js"),backend=read("supabase/functions/quiz-results-service/index.ts");
must(/window\.showMyStatistics=function/.test(stats),"statistics navigation is active");
must(/function showTestMode\(\)/.test(account)&&/showTestControlPlatform/.test(account),"TEST MODE opens full control platform");
must(/test-platform-core\.js\?v=20260921-testmode-v22/.test(platform),"test platform loader and core cache version agree");
must(/async function showWeeklyAdminOverview\(\)/.test(core),"weekly test overview exists");
must(/action:"admin_weekly_overview"/.test(core),"weekly test overview calls backend");
must(/if\(b\.action==="admin_weekly_overview"\)/.test(backend),"backend weekly overview endpoint exists");
must(/if\(b\.action==="weekly_winner"\)/.test(backend),"backend weekly winner endpoint exists");
must(/if\(b\.action==="latest_weekly_winner"\)/.test(backend),"backend latest weekly winner endpoint exists");
must(!/player_name:"Nunya"/.test(index),"no hard-coded winner fallback remains");
must(/Results are published at Previous Answer/.test(stats),"Previous Answer publication rule is preserved");
must(/isWinnerTestAccount/.test(history)&&/showTestMode\(\)/.test(history),"test accounts retain dedicated test entry");
if(process.exitCode)process.exit(process.exitCode);
console.log("All BDL quiz integration checks passed.");
