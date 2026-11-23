import { NextResponse } from "next/server";
import { completePasswordReset, requestPasswordReset } from "@/lib/auth/password-reset";

export async function POST(req: Request) {
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object") return NextResponse.json({error:"Invalid request."},{status:400});
  try {
    if ("token" in input) {
      const success = await completePasswordReset(input);
      return success ? NextResponse.json({success:true}) :
        NextResponse.json({error:"This link has expired or is invalid, or the password is unsuitable."},{status:400});
    }
    const result = await requestPasswordReset(input.email);
    return NextResponse.json(result.error ? {error:result.error} : {success:true}, {status:result.status});
  } catch {
    return NextResponse.json({error:"Password recovery is unavailable."},{status:503});
  }
}
