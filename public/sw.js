const CACHE_NAME = "routie-cache-v1";

// 로컬 개발 환경(localhost/127.0.0.1)에서는 이 서비스워커가 어떤 경로로 설치됐든(예전
// 버전이 남아있었거나, 실수로 프로덕션 빌드를 로컬에서 열어본 경우 등) 스스로 등록을
// 해제하고 캐시를 전부 지웁니다. 브라우저는 서비스워커 "스크립트 파일" 자체에 대한 업데이트
// 확인 요청은 현재 활성 서비스워커의 fetch 핸들러를 절대 거치지 않고 항상 네트워크로 직접
// 보내도록 스펙에 정해져 있습니다 — 그래서 페이지의 JS가 새로 로드되는지 여부와 무관하게,
// 이 파일이 새로 배포되면(그리고 브라우저가 업데이트를 확인하면) 아래 self-destruct 로직은
// 반드시 실행됩니다. PwaRegister.tsx의 "마운트 시 unregister" 코드만으로는, 이미 설치된
// 예전 서비스워커가 페이지 JS 자체를 gate 하고 있을 때 그 코드가 아예 실행되지 못하는
// "닭이 먼저냐 달걀이 먼저냐" 문제가 있어서, 이 파일 쪽에서도 독립적으로 방어합니다.
const isLocalDev = ["localhost", "127.0.0.1"].includes(self.location.hostname);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      if (isLocalDev) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.registration.unregister();
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (isLocalDev) return; // 로컬 개발 환경에서는 어떤 요청도 가로채지 않습니다.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw error;
      }
    })
  );
});
