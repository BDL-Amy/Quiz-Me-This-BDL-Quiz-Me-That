/* BDL PWA UPDATE 2026-09-15C — direct Grandmaster results implementation */
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await clients.claim();
    const windowClients = await clients.matchAll({type:"window",includeUncontrolled:true});
    for (const client of windowClients) {
      if ("navigate" in client) {
        try { await client.navigate(client.url); } catch {}
      }
    }
  })());
});

self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET") return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  const freshUrl=new URL(url.href);
  if(url.pathname.endsWith("/stats-menu.js")) freshUrl.searchParams.set("v","20260915c");
  if(url.pathname.endsWith("/results-menu.js")) freshUrl.searchParams.set("v","20260915c");
  if(url.pathname.endsWith("/test-platform.js")) freshUrl.searchParams.set("v","20260915c");
  event.respondWith(fetch(freshUrl.href,{cache:"no-store"}).catch(()=>fetch(request,{cache:"no-store"})));
});

self.addEventListener("push", event => {
  let data={};
  try { data=event.data?event.data.json():{}; } catch { data={}; }
  event.waitUntil(self.registration.showNotification(data.title||"Quiz Me This, BDL, Quiz Me That",{body:data.body||"A new Daily Quiz question is ready.",data:{url:data.url||"./"}}));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url=event.notification.data?.url||"./";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(windowClients=>{
    for(const client of windowClients){if("focus" in client){if("navigate" in client)client.navigate(url);return client.focus();}}
    if(clients.openWindow)return clients.openWindow(url);
  }));
});