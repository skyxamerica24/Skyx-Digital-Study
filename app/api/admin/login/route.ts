import { NextResponse } from "next/server";
import { parseValidatedJson } from "@/lib/api-schemas";
import { validateAdminCredentials, createAdminToken, AccessError } from "@/lib/reader-live/identity";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const parsed = await parseValidatedJson(request, loginSchema);
    if (parsed.errorResponse) return parsed.errorResponse;

    const { email, password } = parsed.data;

    const isValid = await validateAdminCredentials(email, password);
    if (!isValid) {
      throw new AccessError(401, "Email or password is incorrect.");
    }

    // Find the user to get their ID
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      throw new AccessError(401, "User not found.");
    }

    const token = createAdminToken(user.id, email.trim().toLowerCase());

    return NextResponse.json(
      {
        success: true,
        token,
        email: email.trim().toLowerCase(),
        message: "Login successful.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return failure(error.message, error.status);
    }
    return failure("Login failed. Please try again.", 400);
  }
}
