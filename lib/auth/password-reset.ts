import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { hashPassword } from "../db/auth";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const lifetimeMs = 30 * 60 * 1000;
const inputEmail = z.string().trim().toLowerCase().email().max(200);
const resetInput = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(10).refine(value => Buffer.byteLength(value, "utf8") <= 72),
});

export async function requestPasswordReset(emailInput: unknown) {
  const email = inputEmail.safeParse(emailInput);
  if (!email.success) return { status:400, error:"Enter a valid email address." };
  const endpoint = process.env.SKYX_RESET_MAIL_WEBHOOK;
  const key = process.env.SKYX_RESET_MAIL_KEY;
  const origin = process.env.APP_URL;
  if (!endpoint || !key || !origin) return { status:503, error:"Password recovery is unavailable." };
  const resetUrl = new URL("/reset-password", origin);
  const mailUrl = new URL(endpoint);
  if (resetUrl.protocol !== "https:" || mailUrl.protocol !== "https:") return { status:503, error:"Password recovery is unavailable." };
  const user = await prisma.user.findUnique({ where:{email:email.data},select:{id:true,email:true} });
  if (!user) return { status:202 };
  const token = randomBytes(32).toString("hex");
  const code = digest(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lifetimeMs);
  const sent = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`;
    const existing = await tx.passwordReset.findUnique({where:{userId:user.id}});
    if (existing && now.getTime() - existing.issuedAt.getTime() < 120000) return false;
    await tx.passwordReset.upsert({
      where:{userId:user.id}, create:{userId:user.id,digest:code,issuedAt:now,expiresAt},
      update:{digest:code,issuedAt:now,expiresAt},
    });
    return true;
  });
  if (!sent) return { status:202 };
  resetUrl.hash = "token=" + token;
  try {
    const response = await fetch(mailUrl, {
      method:"POST", redirect:"error", signal:AbortSignal.timeout(10000),
      headers:{"Authorization":"Bearer " + key,"Content-Type":"application/json"},
      body:JSON.stringify({to:user.email,subject:"Reset your Skyx Academy password",
        text:"Open this link within 30 minutes to reset your password: " + resetUrl.toString()}),
    });
    if (!response.ok) throw new Error("Mail delivery failed.");
  } catch {
    await prisma.passwordReset.deleteMany({where:{userId:user.id,digest:code}});
  }
  return { status:202 };
}

export async function completePasswordReset(input: unknown) {
  const parsed = resetInput.safeParse(input);
  if (!parsed.success) return false;
  const code = digest(parsed.data.token);
  const reset = await prisma.passwordReset.findUnique({where:{digest:code}});
  if (!reset || reset.expiresAt <= new Date()) return false;
  const passwordHash = await hashPassword(parsed.data.password);
  return prisma.$transaction(async tx => {
    const used = await tx.passwordReset.deleteMany({where:{digest:code,expiresAt:{gt:new Date()}}});
    if (!used.count) return false;
    await tx.user.update({where:{id:reset.userId},data:{passwordHash}});
    return true;
  });
}
