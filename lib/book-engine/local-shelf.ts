import type { SkyxBookProject } from "./types";

export interface ShelfItem { id: string; fileName: string; edited?: boolean; createdAt?: string }

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve,reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function shelf(account: string) {
  const req = indexedDB.open("skyx-books-" + account, 1);
  req.onupgradeneeded = () => {
    for (const name of ["items","projects","sources"]) req.result.createObjectStore(name);
  };
  return request(req);
}

export async function listLocalBooks(account: string): Promise<ShelfItem[]> {
  const db = await shelf(account);
  try { return await request(db.transaction("items").objectStore("items").getAll()); }
  finally { db.close(); }
}

export async function storeLocalBook(account: string, project: SkyxBookProject, file?: File) {
  const plain = new Blob([JSON.stringify(project)]);
  const digest = await crypto.subtle.digest("SHA-256", await (file ?? plain).arrayBuffer());
  const id = (file ? "local-" : "edition-") + Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,"0")).join("");
  const blob = typeof CompressionStream === "undefined" ? plain :
    new Blob([await new Response(plain.stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()], {type:"application/gzip"});
  const db = await shelf(account);
  try {
    const tx = db.transaction(["items","projects","sources"], "readwrite");
    const done = new Promise<void>((resolve,reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Book storage unavailable."));
    });
    tx.objectStore("items").put({id,fileName:file?.name || project.title,edited:!file,createdAt:new Date().toISOString()}, id);
    tx.objectStore("projects").put(blob,id);
    if (file) tx.objectStore("sources").put(file,id);
    await done;
  } finally { db.close(); }
}

export async function openLocalBook(account: string, id: string, source = false) {
  const db = await shelf(account);
  try {
    const store = source ? "sources" : "projects";
    const blob: Blob = await request(db.transaction(store).objectStore(store).get(id));
    if (!blob) throw new Error("Book not found on this device.");
    if (source) return blob;
    const text = blob.type === "application/gzip" ?
      await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text() : await blob.text();
    return JSON.parse(text) as SkyxBookProject;
  } finally { db.close(); }
}
