import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, unlink, open } from "node:fs/promises";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { getAvailableSecretSlots, isValidSecretSlotName } from "../gemini-server";
import type { ReaderBinding, ReaderCredential, ReaderSettings } from "./settings-types";

type StoredKey = ReaderCredential & { ciphertext: string; iv: string; tag: string };
interface Store { keys: StoredKey[]; binding?: ReaderBinding }

export class ReaderConfigurationError extends Error {}

function directory() {
  // Resolve the private store from the running server's environment at request time.
  if (process.env.SKYX_READER_CONFIG_DIR) return process.env.SKYX_READER_CONFIG_DIR;
  if (process.env.LOCALAPPDATA) return join(process.env.LOCALAPPDATA, "skyx-academy");
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) throw new Error("Set SKYX_READER_CONFIG_DIR on the server.");
  return join(home, ".local/share/skyx-academy");
}
function masterKey() {
  const key = Buffer.from(process.env.SKYX_READER_MASTER_KEY || "", "base64");
  if (key.length !== 32) throw new ReaderConfigurationError("Set SKYX_READER_MASTER_KEY to a base64-encoded 32-byte key on the server.");
  return key;
}
function seal(secret: string, id: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]).toString("base64");
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext, suffix: secret.slice(-4) };
}
async function read(): Promise<Store> {
  try { return JSON.parse(await readFile(join(directory(), "reader.json"), "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { keys: [] };
    throw new ReaderConfigurationError("Reader settings could not be read. Check the server's reader settings directory.");
  }
}
function binding(store: Store): ReaderBinding {
  return store.binding ?? {
    enabled: true,
    credentialId: process.env.SKYX_READER_KEY_SLOT?.trim() || "",
    modelId: process.env.SKYX_READER_LIVE_MODEL?.trim() || "",
  };
}
export async function listReaderSettings(): Promise<ReaderSettings> {
  const store = await read();
  const envKeys: ReaderCredential[] = getAvailableSecretSlots().map(({ id }) => ({
    id, label: id, source: "server", enabled: true, suffix: process.env[id]!.trim().slice(-4),
  }));
  return {
    credentials: [...envKeys, ...store.keys.map(({ id, label, suffix, enabled, source }) => ({ id, label, suffix, enabled, source }))],
    binding: binding(store),
    bindingSource: store.binding ? "managed" : "server",
    canStoreSecrets: Buffer.from(process.env.SKYX_READER_MASTER_KEY || "", "base64").length === 32,
  };
}
function resolve(store: Store, selected: ReaderBinding) {
  if (!selected.enabled) throw new ReaderConfigurationError("Book Reader Assistant is disabled in Advanced Tools.");
  if (!/^gemini-[a-z0-9.-]+$/.test(selected.modelId)) throw new ReaderConfigurationError("Choose a Live model in Advanced Tools.");
  const key = store.keys.find(item => item.id === selected.credentialId);
  let value: string | undefined;
  if (key) {
    if (!key.enabled) throw new ReaderConfigurationError("The selected Gemini key is disabled. Enable it or select another key.");
    const encryptionKey = masterKey();
    try {
      const cipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(key.iv, "base64"));
      cipher.setAAD(Buffer.from(key.id));
      cipher.setAuthTag(Buffer.from(key.tag, "base64"));
      value = Buffer.concat([cipher.update(Buffer.from(key.ciphertext, "base64")), cipher.final()]).toString("utf8");
    } catch {
      throw new ReaderConfigurationError("The selected key could not be decrypted. Check the server master key.");
    }
  } else if (isValidSecretSlotName(selected.credentialId)) {
    value = process.env[selected.credentialId]?.trim();
  }
  if (!value) throw new ReaderConfigurationError("Select an available Gemini key in Advanced Tools.");
  return { ai: new GoogleGenAI({ apiKey: value, httpOptions: { apiVersion: "v1beta" } }), model: selected.modelId };
}
export async function readerClient(override?: ReaderBinding) {
  const store = await read();
  return resolve(store, override ?? binding(store));
}
type Edit =
  | { action: "add"; label: string; key: string }
  | { action: "replace"; credentialId: string; key: string }
  | { action: "enable"; credentialId: string; enabled: boolean }
  | { action: "bind"; binding: ReaderBinding };

export async function changeReaderSettings(change: Edit) {
  const dir = directory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const lockPath = join(dir, "reader.lock");
  const lock = await open(lockPath, "wx", 0o600).catch(error => {
    if (error.code === "EEXIST") throw new ReaderConfigurationError("Reader settings are being updated. Retry in a moment.");
    throw error;
  });
  const temp = join(dir, randomUUID() + ".tmp");
  try {
    const store = await read();
    if (change.action === "add") {
      const id = randomUUID();
      store.keys.push({ id, label: change.label, enabled: true, source: "managed", ...seal(change.key, id) });
    } else if (change.action === "bind") {
      if (change.binding.enabled) resolve(store, change.binding);
      store.binding = change.binding;
    } else {
      const key = store.keys.find(item => item.id === change.credentialId);
      if (!key) throw new ReaderConfigurationError("Managed key not found.");
      if (change.action === "replace") Object.assign(key, seal(change.key, key.id));
      else key.enabled = change.enabled;
    }
    await writeFile(temp, JSON.stringify(store), { mode: 0o600, flag: "wx" });
    await rename(temp, join(dir, "reader.json"));
  } finally {
    await unlink(temp).catch(() => {});
    await lock.close();
    await unlink(lockPath);
  }
}
