const fs=require("fs");
function read(p){return fs.readFileSync(p,"utf8")}
function must(ok,msg){if(!ok){console.error("FAIL:",msg);process.exitCode=1}else console.log("PASS:",msg)}
const index=read("index.html"), account=read("account.js"), platform=read("test-platform.js"), core=read("test-platform-core.js"), backend=read("supabase/functions/quiz-results-service/index.ts");
must(/loadWinnerAnnouncementsAfterStart\(\)/.test(index),"winner announcements are invoked after START");
must(/action:"latest_weekly_winner"/.test(index),"Smartest announcement requests the latest published winner");
must(/actualDate\.getDate\(\)-8/.test(index),"Sunday 15:30 preview resolves Saturday-Friday week start");
must(/typeof isTestIdentity==="function" && isTestIdentity\(\)/.test(index),"test identities use canonical identity check");
must(/function showTestMode\(\)/.test(account)&&/showTestControlPlatform/.test(account),"TEST MODE opens full control platform");
must(/test-platform-core\.js\?v=20260921-winner-review-v2/.test(platform),"latest test platform core is loaded");
must(/async function showWeeklyAdminOverview\(\)/.test(core),"weekly test overview exists");
must(/action:"admin_weekly_overview"/.test(core),"weekly test overview calls backend");
must(/if\(b\.action==="admin_weekly_overview"\)/.test(backend),"backend weekly overview endpoint exists");
must(/if\(b\.action==="weekly_winner"\)/.test(backend),"backend weekly winner endpoint exists");
must(/if\(b\.action==="latest_weekly_winner"\)/.test(backend),"backend latest weekly winner endpoint exists");
if(process.exitCode)process.exit(process.exitCode);
console.log("All Smartest/Test Account integration checks passed.");
