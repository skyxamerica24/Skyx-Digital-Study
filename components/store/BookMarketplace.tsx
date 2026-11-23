"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/components/context/AppContext";
import { getSessionToken } from "@/lib/auth/session-storage";
import { claimFreeBook, getStore, reviewStoreOrder, saveBookListing, submitStoreOrder } from "@/lib/actions/book-store-actions";

type Store = Awaited<ReturnType<typeof getStore>>;
type Checkout = { kind: "book" | "subscription"; targetId: string; title: string; total: string };
const card = "space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";
const input = "rounded-lg border border-slate-300 p-2 text-sm";
const money = (minor: number, currency: string) => currency + " " + (minor / 100).toFixed(2);

function ListingForm({ book, plans, busy, onSave }: {
  book: Store["books"][number]; plans: Store["plans"]; busy: boolean;
  onSave: (task: () => Promise<void>, message: string) => Promise<void>;
}) {
  const offer = book.listing;
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const price = String(form.get("price") ?? "").trim();
    void onSave(() => saveBookListing(getSessionToken(), {
      bookId: book.id, enabled: form.has("enabled"), free: form.has("free"),
      priceMinor: price ? Math.round(Number(price) * 100) : null,
      planId: String(form.get("plan") ?? "") || null,
    }), "Listing saved.");
  }
  return <form className={card} onSubmit={save}>
    <h3 className="font-semibold">{book.title}</h3>
    {!book.isPublished && <p className="text-sm text-slate-600">Publish the book to make the listing visible.</p>}
    <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
      <label className="flex items-center gap-1 text-sm"><input name="enabled" type="checkbox" defaultChecked={offer?.enabled} /> Listed</label>
      <label className="flex items-center gap-1 text-sm"><input name="free" type="checkbox" defaultChecked={offer?.free} /> Free Claim</label>
      <label className="grid text-sm">Purchase Price (BDT)
        <input className={input} name="price" type="number" min="0.01" max="1000000" step="0.01"
          placeholder="Optional" defaultValue={offer?.priceMinor ? offer.priceMinor / 100 : ""} />
      </label>
      <label className="grid text-sm">Included in Plan
        <select className={input} name="plan" defaultValue={offer?.planId ?? ""}>
          <option value="">None</option>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select>
      </label>
      <button className={button} type="submit">Save Listing</button>
    </fieldset>
  </form>;
}

export default function BookMarketplace({ manage = false }: { manage?: boolean }) {
  const { refreshBookAccess, openBookReader } = useApp();
  const [store, setStore] = useState<Store>();
  const [checkout, setCheckout] = useState<Checkout>();
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    getStore(getSessionToken(), manage).then(data => { if (alive) setStore(data); })
      .catch(() => { if (alive) setMessage("Could not load the marketplace."); });
    return () => { alive = false; };
  }, [manage]);

  async function run(task: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await task();
      setStore(await getStore(getSessionToken(), manage));
      if (!manage) await refreshBookAccess();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function openCheckout(next: Checkout) {
    setCheckout(next);
    setReference("");
    setMessage("");
  }

  const query = search.trim().toLowerCase();
  const visibleBooks = store?.books.filter(book => (book.title + " " + (book.author ?? "")).toLowerCase().includes(query)) ?? [];
  const booksInPlans = new Set(store?.books.flatMap(book => book.listing?.planId ? [book.listing.planId] : []));
  const learnerEmail = new Map(store?.accounts.map(account => [account.id, account.email]));

  return <section className="space-y-4 rounded-xl bg-slate-50 p-4 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{manage ? "Digital Products" : "Book Library Marketplace"}</h2>
      <button type="button" className={button} disabled={busy} onClick={() => run(async () => {}, "Marketplace refreshed.")}>Refresh</button>
    </header>
    {message && <p role="status" className="rounded-lg bg-indigo-50 p-2 text-sm">{message}</p>}
    {!store && !message && <p role="status">Loading marketplace…</p>}
    {store && <>
      <label className="grid max-w-sm text-sm">Search Books
        <input className={input} value={search} onChange={e => setSearch(e.target.value)} />
      </label>
      {!store.paymentInstructions && <p className="text-sm">Payment instructions are unavailable. Free books can still be claimed.</p>}
      {!visibleBooks.length && <p className="text-sm">No matching books.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {visibleBooks.map(book => {
          if (manage) return <ListingForm key={book.id} book={book} plans={store.plans} busy={busy} onSave={run} />;
          const offer = book.listing!;
          const owned = store.licenses.some(license => license.bookId === book.id);
          const included = Boolean(offer.planId && store.activePlans.includes(offer.planId));
          const plan = store.plans.find(item => item.id === offer.planId);
          return <article className={card} key={book.id}>
            <h3 className="font-semibold">{book.title}</h3>
            {book.author && <p className="text-sm">{book.author}</p>}
            {book.description && <p className="line-clamp-3 text-sm text-slate-600">{book.description}</p>}
            {plan && <p className="text-sm">Included in {plan.name}</p>}
            <div className="flex flex-wrap gap-2">
              {(owned || included) && <button className={button} onClick={() => openBookReader(book.id)}>Read Book</button>}
              {!owned && offer.free && <button className={button} disabled={busy} onClick={() => run(() => claimFreeBook(getSessionToken(), book.id), "Added to My Library.")}>Get Free</button>}
              {!owned && offer.priceMinor && <button className={button} disabled={busy || !store.paymentInstructions}
                onClick={() => openCheckout({kind:"book",targetId:book.id,title:book.title,total:money(offer.priceMinor!,offer.currency)})}>
                Buy Book · {money(offer.priceMinor, offer.currency)}
              </button>}
            </div>
          </article>;
        })}
      </div>
      {!manage && store.plans.some(plan => booksInPlans.has(plan.id) && plan.priceMonthly > 0) && <div className={card}>
        <h3 className="font-semibold">Subscriptions</h3>
        {store.plans.filter(plan => booksInPlans.has(plan.id) && plan.priceMonthly > 0).map(plan => (
          <button key={plan.id} className={button} disabled={busy || !store.paymentInstructions}
            onClick={() => openCheckout({kind:"subscription",targetId:plan.id,title:plan.name,total:money(Math.round(plan.priceMonthly * 100), plan.currency)})}>
            {store.activePlans.includes(plan.id) ? "Renew" : "Subscribe"} · {plan.name} · {money(Math.round(plan.priceMonthly * 100), plan.currency)} / 30 days
          </button>
        ))}
      </div>}
      {!manage && checkout && <form className={card} onSubmit={e => {
        e.preventDefault();
        void run(async () => { await submitStoreOrder(getSessionToken(), {...checkout, reference}); setCheckout(undefined); }, "Order submitted for payment review.");
      }}>
        <h3 className="font-semibold">Checkout · {checkout.title}</h3>
        <p>Amount due {checkout.total}</p>
        <p className="whitespace-pre-wrap text-sm">{store.paymentInstructions}</p>
        <label className="grid max-w-sm text-sm">Payment Reference
          <input className={input} required minLength={6} maxLength={80} value={reference} onChange={e => setReference(e.target.value)} />
        </label>
        <button className={button} disabled={busy} type="submit">Submit Payment for Review</button>
        <button className={button} type="button" disabled={busy} onClick={() => setCheckout(undefined)}>Cancel</button>
      </form>}
      <div className={card}>
        <h3 className="font-semibold">{manage ? "Sales and Payment Review" : "My Orders"}</h3>
        {!store.orders.length && <p className="text-sm">No orders yet.</p>}
        {store.orders.map(order => <div key={order.id} className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-2 text-sm">
          <span className="flex-1">{order.title} · {money(order.priceMinor, order.currency)} · <span className="capitalize">{order.status}</span>
            {order.expiresAt && <span> · Ends {new Date(order.expiresAt).toLocaleDateString("en-GB")}</span>}
            <small className="block text-slate-600">{manage ? (learnerEmail.get(order.userId) ?? order.userId) + " · " : ""}{order.reference}</small>
          </span>
          {manage && order.status === "pending" && <>
            <button className={button} disabled={busy} onClick={() => {
              if (window.confirm("Have you verified the payment reference, amount and currency?"))
                void run(() => reviewStoreOrder(getSessionToken(), order.id, true), "Order approved.");
            }}>Approve</button>
            <button className={button} disabled={busy} onClick={() => run(() => reviewStoreOrder(getSessionToken(), order.id, false), "Order rejected.")}>Reject</button>
          </>}
        </div>)}
      </div>
    </>}
  </section>;
}
