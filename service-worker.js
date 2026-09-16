/* BDL PWA UPDATE 2026-09-16B — 15:30 schedule */
self.addEventListener("install",event=>self.skipWaiting());
self.addEventListener("activate",event=>{event.waitUntil((async()=>{await clients.claim();const cs=await clients.matchAll({type:"window",includeUncontrolled:true});for(const c of cs){if("navigate" in c){try{await c.navigate(c.url)}catch{}}}})())});
self.addEventListener("fetch",event=>{
 const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request,{cache:"no-store"}).then(async r=>{const type=r.headers.get("content-type")||"";if(!type.includes("text/html"))return r;let text=await r.text();if(!text.includes("quiz-schedule-1530.js"))text=text.replace("</body>",'<script src="quiz-schedule-1530.js?v=20260916b"></script></body>');return new Response(text,{status:r.status,statusText:r.statusText,headers:r.headers})}).catch(()=>fetch(request,{cache:"no-store"})));return;
 }
 const fresh=new URL(url.href);if(url.pathname.endsWith("/results-menu.js"))fresh.searchParams.set("v","20260916b");if(url.pathname.endsWith("/test-platform.js"))fresh.searchParams.set("v","20260916b");if(url.pathname.endsWith("/quiz-schedule-1530.js"))fresh.searchParams.set("v","20260916b");event.respondWith(fetch(fresh.href,{cache:"no-store"}).catch(()=>fetch(request,{cache:"no-store"})));
});
self.addEventListener("push",event=>{let data={};try{data=event.data?event.data.json():{}}catch{}event.waitUntil(self.registration.showNotification(data.title||"Quiz Me This, BDL, Quiz Me That",{body:data.body||"A new Daily Quiz question is ready.",data:{url:data.url||"./"}}))});
self.addEventListener("notificationclick",event=>{event.notification.close();const url=event.notification.data?.url||"./";event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus" in c){if("navigate" in c)c.navigate(url);return c.focus()}}if(clients.openWindow)return clients.openWindow(url)}))});