import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { TextBox } from "./pdf-layout";

const run = promisify(execFile);
export async function createOcrInput(bytes: Buffer) {
  const dir = await mkdtemp(join(tmpdir(), "skyx-ocr-"));
  try {
    const { stdout } = await run("tesseract", ["--list-langs"], { timeout: 10000 });
    const langs = stdout.split(/\s+/);
    if (!langs.includes("ben") || !langs.includes("eng")) throw new Error("Bengali and English OCR data required");
    await writeFile(join(dir,"source.pdf"), bytes, {mode:0o600});
    return dir;
  } catch (error) {
    await rm(dir,{recursive:true,force:true}); throw error;
  }
}

export async function recognizePage(dir: string, page: number) {
  const prefix = join(dir,"page");
  const options = {timeout:60000, maxBuffer:12*1024*1024};
  await run("pdftoppm", ["-f",String(page),"-l",String(page),"-scale-to","2800","-singlefile","-png",join(dir,"source.pdf"),prefix],options);
  const {stdout} = await run("tesseract",[prefix+".png","stdout","-l","ben+eng","--psm","3","-c","tessedit_create_tsv=1"],options);
  const boxes: TextBox[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const fields = line.split("\t");
    if (fields[0] !== "5" || !fields[11]?.trim()) continue;
    boxes.push({x:Number(fields[6]),y:Number(fields[7])+Number(fields[9])/2,width:Number(fields[8]),
      height:Number(fields[9]),text:fields.slice(11).join(" ")});
  }
  return boxes;
}
