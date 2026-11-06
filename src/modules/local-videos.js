const DB_NAME = "EquiAI-media";
const STORE = "videos";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalVideo(file) {
  const db = await openDB();
  const id = "video-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  await requestResult(db.transaction(STORE, "readwrite").objectStore(STORE).put({
    id, blob: file, name: file.name, type: file.type, size: file.size, savedAt: new Date().toISOString()
  }));
  db.close();
  return id;
}

export async function getLocalVideo(id) {
  const db = await openDB();
  const result = await requestResult(db.transaction(STORE, "readonly").objectStore(STORE).get(id));
  db.close();
  return result ? result.blob : null;
}

export async function deleteLocalVideo(id) {
  const db = await openDB();
  await requestResult(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
  db.close();
}

export async function clearLocalVideos() {
  const db = await openDB();
  await requestResult(db.transaction(STORE, "readwrite").objectStore(STORE).clear());
  db.close();
}
