import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getCurrentUser } from "./db/user";

export async function requireStoreUser(token: string | null, admin = false) {
  const user = await getCurrentUser(token);
  if (!user || (admin && user.role !== "admin")) throw new Error(admin ? "Administrator access is required." : "Sign in to continue.");
  return user;
}

export async function activeStorePlanIds(userId: string) {
  const orders = await prisma.storeOrder.findMany({
    where: { userId, kind: "subscription", status: "approved", expiresAt: { gt: new Date() } },
    select: { planId: true },
  });
  return [...new Set(orders.flatMap(order => order.planId ? [order.planId] : []))];
}

export async function readableBookFilter(token: string | null): Promise<Prisma.BookWhereInput> {
  const user = await getCurrentUser(token);
  if (user?.role === "admin") return {};
  return {
    isPublished: true,
    OR: [
      { listing: null, accessTier: "free" },
      ...(user ? [
        { licenses: { some: { userId: user.userId } } },
        { listing: { enabled: true, planId: { in: await activeStorePlanIds(user.userId) } } },
      ] : []),
    ],
  };
}
