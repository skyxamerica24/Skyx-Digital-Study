"use server";

import { z } from "zod";
import { prisma } from "../db";
import { activeStorePlanIds, requireStoreUser } from "../book-store-access";

const offerSchema = z.object({
  bookId: z.string().min(1),
  enabled: z.boolean(),
  free: z.boolean(),
  priceMinor: z.number().int().positive().max(100000000).nullable(),
  planId: z.string().min(1).nullable(),
});

export async function getStore(token: string | null, manage = false) {
  const user = await requireStoreUser(token, manage);
  const [books, plans, orders, licenses, activePlans, accounts] = await Promise.all([
    prisma.book.findMany({
      where: manage ? {} : { isPublished: true, listing: { enabled: true } },
      select: { id: true, title: true, author: true, description: true, isPublished: true, listing: true },
      orderBy: { title: "asc" },
    }),
    prisma.subscriptionPlan.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, priceMonthly: true, currency: true },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.storeOrder.findMany({ where: manage ? {} : { userId: user.userId }, orderBy: { createdAt: "desc" } }),
    prisma.bookLicense.findMany({ where: { userId: user.userId }, select: { bookId: true } }),
    activeStorePlanIds(user.userId),
    manage ? prisma.user.findMany({ select: {id:true,email:true} }) : [],
  ]);
  return { books, plans, orders, licenses, activePlans, accounts, paymentInstructions: process.env.SKYX_STORE_PAYMENT_INSTRUCTIONS?.trim() ?? "" };
}

export async function saveBookListing(token: string | null, input: z.infer<typeof offerSchema>) {
  await requireStoreUser(token, true);
  const { bookId, ...data } = offerSchema.parse(input);
  if (data.enabled && !data.free && !data.priceMinor && !data.planId) throw new Error("Choose at least one access option.");
  await prisma.bookListing.upsert({ where: { bookId }, create: { bookId, ...data }, update: data });
}

export async function claimFreeBook(token: string | null, bookId: string) {
  const user = await requireStoreUser(token);
  const offer = await prisma.bookListing.findFirst({ where: { bookId, enabled: true, free: true, book: { isPublished: true } } });
  if (!offer) throw new Error("This book is unavailable for free claim.");
  const identity = { userId: user.userId, bookId };
  await prisma.bookLicense.createMany({ data: identity, skipDuplicates: true });
}

export async function submitStoreOrder(token: string | null, input: { kind: "book" | "subscription"; targetId: string; reference: string }) {
  const user = await requireStoreUser(token);
  const data = z.object({
    kind: z.enum(["book","subscription"]), targetId: z.string().min(1),
    reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{5,79}$/, "Enter a valid transaction reference."),
  }).parse(input);
  if (!process.env.SKYX_STORE_PAYMENT_INSTRUCTIONS?.trim()) throw new Error("Payment instructions are unavailable.");
  let details;
  if (data.kind === "book") {
    const offer = await prisma.bookListing.findFirst({
      where: { bookId: data.targetId, enabled: true, priceMinor: { gt: 0 }, book: { isPublished: true } }, include: { book: true },
    });
    if (!offer?.priceMinor) throw new Error("This book is unavailable for purchase.");
    if (await prisma.bookLicense.findUnique({ where: {userId_bookId:{userId:user.userId,bookId:offer.bookId}} })) {
      throw new Error("This book is already in your library.");
    }
    details = { bookId: offer.bookId, title: offer.book.title, priceMinor: offer.priceMinor, currency: offer.currency };
  } else {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: data.targetId, isPublished: true, priceMonthly: { gt: 0 }, bookListings: {some:{enabled:true,book:{isPublished:true}}} },
    });
    if (!plan) throw new Error("This subscription is unavailable.");
    details = { planId: plan.id, title: plan.name, priceMinor: Math.round(plan.priceMonthly * 100), currency: plan.currency };
  }
  await prisma.$transaction(async tx => {
    const key = user.userId + ":" + data.targetId;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    const pending = await tx.storeOrder.findFirst({
      where: { userId: user.userId, kind: data.kind, status: "pending", ...("bookId" in details ? {bookId: details.bookId} : {planId: details.planId}) },
      select: { reference: true },
    });
    if (pending && pending.reference !== data.reference) throw new Error("An order is already awaiting review.");
    await tx.storeOrder.createMany({
      data: { ...details, kind: data.kind, userId: user.userId, reference: data.reference },
      skipDuplicates: true,
    });
    const existing = await tx.storeOrder.findUniqueOrThrow({where: {reference: data.reference}});
    if (existing.userId !== user.userId || existing.bookId !== (details.bookId ?? null) || existing.planId !== (details.planId ?? null)) {
      throw new Error("This transaction reference is already in use.");
    }
  });
}

export async function reviewStoreOrder(token: string | null, id: string, approve: boolean) {
  const admin = await requireStoreUser(token, true);
  await prisma.$transaction(async tx => {
    const order = await tx.storeOrder.findUniqueOrThrow({ where: { id } });
    if (order.status !== "pending") return;
    const key = order.userId + ":" + (order.bookId ?? order.planId);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    const now = new Date();
    let expiresAt: Date | undefined;
    if (approve && order.kind === "subscription") {
      const last = await tx.storeOrder.findFirst({
        where: { userId: order.userId, planId: order.planId, status: "approved", expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" },
      });
      expiresAt = new Date((last?.expiresAt ?? now).getTime() + 30 * 86400000);
    }
    const changed = await tx.storeOrder.updateMany({
      where: { id, status: "pending" }, data: {status: approve ? "approved" : "rejected", reviewedAt: now, reviewedBy: admin.userId, expiresAt},
    });
    if (changed.count && approve && order.bookId) {
      const identity = { userId: order.userId, bookId: order.bookId };
      await tx.bookLicense.createMany({ data: identity, skipDuplicates: true });
    }
  });
}
