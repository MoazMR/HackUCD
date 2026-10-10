import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import Stripe from "stripe";

// No test may use configured credentials, persistent demo data or an external payment network.
process.env.THIRDPLACE_DATA_FILE = ":memory:";
process.env.STRIPE_SECRET_KEY = "sk_test_offline_payment_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline_payment_tests";
const { createApp } = await import("../dist/app.js");
const { getStripe, setCheckoutSessionsForTesting } = await import("../dist/services/stripe.js");
const { findOrder, listActivePromotions, promotionForOrder } = await import("../dist/services/promotions.js");
const { getEvent } = await import("../dist/services/events.js");

let server;
let base;
let createFailure;
let expireFailure;
let retrieveFailure;
let createDelay;
const sessions = new Map();
const checkoutRequests = [];
const stripeError = (type = "StripeConnectionError") => Object.assign(new Error("Offline simulated failure"), { type });
setCheckoutSessionsForTesting({
  create: async (input) => {
    checkoutRequests.push(input);
    if (createFailure) throw createFailure;
    if (createDelay) await createDelay;
    const session = {
      id: `cs_test_offline_${sessions.size + 1}`, object: "checkout.session", livemode: false,
      metadata: input.metadata, client_reference_id: input.client_reference_id,
      amount_total: input.line_items[0].price_data.unit_amount, currency: input.line_items[0].price_data.currency,
      payment_status: "unpaid", status: "open", expires_at: input.expires_at,
      url: "https://checkout.example.test/offline"
    };
    sessions.set(session.id, session);
    return { ...session };
  },
  retrieve: async (id) => {
    if (retrieveFailure) throw retrieveFailure;
    if (!sessions.has(id)) throw stripeError("StripeInvalidRequestError");
    return { ...sessions.get(id) };
  },
  expire: async (id) => {
    if (expireFailure) throw expireFailure;
    const session = sessions.get(id);
    if (!session || session.status !== "open") throw stripeError("StripeInvalidRequestError");
    session.status = "expired";
    return { ...session };
  }
});

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  setCheckoutSessionsForTesting();
  if (server) await new Promise((resolve) => server.close(resolve));
});

const future = (days = 2) => new Date(Date.now() + days * 86_400_000).toISOString();
async function call(path, { json, headers, ...init } = {}) {
  const response = await fetch(base + path, {
    ...init, headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: json === undefined ? init.body : JSON.stringify(json)
  });
  return { status: response.status, body: await response.json() };
}
async function businessDraft(name = "Offline venue") {
  const result = await call("/business/events", {
    method: "POST", json: {
      businessName: name, title: `${name} coffee night`, description: "Meet the local community for coffee.",
      startsAt: future(), venueName: name, venueAddressArea: "Smithfield", category: "social", interest: "coffee"
    }
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.event.publicationStatus, "draft");
  return result.body.event;
}
async function checkout(event, name, extra = {}) {
  const result = await call("/payments/checkout", {
    method: "POST", json: {
      planId: name ? "venue-boost-7d" : "community-boost-3d", eventId: event.id,
      buyer: name ? { type: "business", name } : { type: "user" }, ...extra.json
    }, headers: extra.headers
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const order = findOrder(result.body.orderId);
  return { order, session: sessions.get(order.stripeCheckoutSessionId) };
}
async function webhook(session, type = "checkout.session.completed", facts = {}, eventFields = {}) {
  const payload = JSON.stringify({
    id: `evt_offline_${Date.now()}`, object: "event", livemode: false, type,
    data: { object: { ...session, payment_status: "paid", status: "complete", ...facts } }, ...eventFields
  });
  return call("/payments/webhook", {
    method: "POST", body: payload,
    headers: { "Content-Type": "application/json", "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET }) }
  });
}
async function assertDraft(event) {
  assert.equal(getEvent(event.id).publicationStatus, "draft");
  assert.equal((await call("/events")).body.events.some((item) => item.id === event.id), false);
  assert.equal(listActivePromotions().some((item) => item.eventId === event.id), false);
}

test("cached Stripe clients still reject missing and live keys on every new checkout", async () => {
  getStripe();
  const previous = process.env.STRIPE_SECRET_KEY;
  try {
    for (const key of [undefined, "sk_live_refused_after_cached_test_client"]) {
      if (key === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = key;
      assert.throws(() => getStripe(), /Stripe|test-mode/);
      assert.equal((await call("/payments/checkout", { method: "POST", json: {} })).status, 503);
    }
  } finally { process.env.STRIPE_SECRET_KEY = previous; }
});

test("business draft becomes public only after signed sandbox payment and replay stays idempotent", async () => {
  const event = await businessDraft("Verified venue");
  await assertDraft(event);
  const { order, session } = await checkout(event, "Verified venue", { json: { amountCents: 1, currency: "usd" } });
  assert.equal(order.status, "pending");
  assert.ok(Date.parse(order.checkoutExpiresAt) > Date.now());
  const request = checkoutRequests.at(-1);
  assert.equal(request.line_items[0].price_data.unit_amount, 1499);
  assert.equal(request.line_items[0].price_data.currency, "eur");
  assert.equal(request.metadata.orderId, order.id);
  await assertDraft(event);
  assert.equal((await webhook(session)).status, 200);
  assert.equal(order.status, "paid");
  assert.equal(order.confirmedVia, "webhook");
  assert.equal(getEvent(event.id).publicationStatus, "published");
  assert.ok((await call("/events?paid=true")).body.events.some((item) => item.id === event.id));
  const promotion = promotionForOrder(order.id);
  assert.equal(promotion.endsAt, event.startsAt);
  for (const privateField of ["attendeeIds", "coordinates", "hostId"]) assert.equal(privateField in promotion.event, false);
  await webhook(session);
  await webhook(session, "checkout.session.async_payment_succeeded");
  assert.equal(listActivePromotions().filter((item) => item.eventId === event.id).length, 1);
  assert.equal((await call(`/payments/confirm?session_id=${session.id}`)).body.status, "active");
});

test("ordinary user can create freely, see My Events and optionally promote only their own event", async () => {
  const result = await call("/events", {
    method: "POST", headers: { "x-user-id": "offline-alice" }, json: {
      title: "Alice local coffee", description: "A friendly open coffee meetup with neighbours.", startsAt: future(3),
      locationName: "Neighbourhood library", category: "social", interest: "coffee", area: "Smithfield",
      latitude: 53.3487, longitude: -6.2789, hostName: "Alice"
    }
  });
  assert.equal(result.status, 201);
  const event = result.body.event;
  assert.equal(getEvent(event.id).isPaidPromotion, false);
  assert.ok((await call("/business/my-events", { headers: { "x-user-id": "offline-alice" } })).body.events.some((item) => item.id === event.id));
  assert.equal((await call("/business/my-events")).body.events.some((item) => item.id === event.id), false);
  const denied = await call("/payments/checkout", {
    method: "POST", headers: { "x-user-id": "offline-bob" },
    json: { planId: "community-boost-3d", eventId: event.id, buyer: { type: "user", id: "offline-alice" } }
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, "not_event_host");
  const { order, session } = await checkout(event, undefined, { headers: { "x-user-id": "offline-alice" } });
  assert.equal(order.buyer.id, "offline-alice");
  assert.equal(order.amountCents, 299);
  await webhook(session);
  assert.equal(getEvent(event.id).isPaidPromotion, true);
});

test("cancelled business checkout remains a draft and a later paid webhook cannot reopen it", async () => {
  const event = await businessDraft("Cancelled venue");
  const { order, session } = await checkout(event, "Cancelled venue");
  const cancelled = await call("/payments/cancel", { method: "POST", json: { orderId: order.id } });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.order.status, "cancelled");
  assert.equal(session.status, "expired");
  await webhook(session);
  assert.equal(order.status, "cancelled");
  await assertDraft(event);
  const retry = await checkout(event, "Cancelled venue");
  assert.notEqual(retry.order.id, order.id);
  assert.equal(retry.order.status, "pending");
});

test("amount and currency mismatches fail permanently without publishing or activating", async () => {
  for (const facts of [{ amount_total: 1 }, { currency: "usd" }]) {
    const name = `Mismatched venue ${sessions.size}`;
    const event = await businessDraft(name);
    const { order, session } = await checkout(event, name);
    await webhook(session, "checkout.session.completed", facts);
    assert.equal(order.status, "failed");
    await webhook(session);
    assert.equal(order.status, "failed");
    await assertDraft(event);
  }
});

test("expired checkout is bound to its order and cannot activate on a later completed webhook", async () => {
  const event = await businessDraft("Expired venue");
  const { order, session } = await checkout(event, "Expired venue");
  await webhook(session, "checkout.session.expired", { id: "cs_test_wrong_session", status: "expired", payment_status: "unpaid" });
  assert.equal(order.status, "pending");
  await webhook(session, "checkout.session.expired", { status: "expired", payment_status: "unpaid" });
  assert.equal(order.status, "expired");
  await webhook(session);
  assert.equal(order.status, "expired");
  await assertDraft(event);
  const retry = await checkout(event, "Expired venue");
  assert.notEqual(retry.order.id, order.id);
  assert.equal(retry.order.status, "pending");

  const other = await businessDraft("Return expired venue");
  const second = await checkout(other, "Return expired venue");
  second.session.status = "expired";
  const returned = await call(`/payments/confirm?session_id=${second.session.id}`);
  assert.equal(returned.status, 202);
  assert.equal(returned.body.status, "expired");
  assert.equal(second.order.status, "expired");
  await assertDraft(other);
});

test("unpaid and wrong-session webhooks do not publish, and signed live-mode payloads are refused", async () => {
  const event = await businessDraft("Boundary venue");
  const { order, session } = await checkout(event, "Boundary venue");
  await webhook(session, "checkout.session.completed", { payment_status: "unpaid" });
  await webhook(session, "checkout.session.completed", { id: "cs_test_not_the_attached_session" });
  assert.equal(order.status, "pending");
  assert.equal((await webhook(session, "checkout.session.completed", {}, { livemode: true })).status, 400);
  await webhook(session, "checkout.session.completed", { livemode: true });
  assert.equal(order.status, "pending");
  await assertDraft(event);
});

test("late payment cannot publish an event that has already started", async () => {
  const event = await businessDraft("Late venue");
  const { order, session } = await checkout(event, "Late venue");
  getEvent(event.id).startsAt = new Date(Date.now() - 1000).toISOString();
  await webhook(session);
  assert.equal(order.status, "failed");
  await assertDraft(event);
});

test("second pending checkout is rejected before another chargeable session is created", async () => {
  const event = await businessDraft("Concurrent venue");
  const first = await checkout(event, "Concurrent venue");
  const before = checkoutRequests.length;
  const second = await call("/payments/checkout", {
    method: "POST", json: {planId:"venue-boost-7d", eventId:event.id,buyer:{type:"business",name:"Concurrent venue"}}
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "checkout_pending");
  assert.equal(checkoutRequests.length, before);
  await webhook(first.session);
  assert.equal(first.order.status, "paid");
  assert.equal(listActivePromotions().filter((item) => item.eventId === event.id).length, 1);
});

test("pending reservation blocks duplicate requests while the first Stripe call is still in flight", async () => {
  const event = await businessDraft("In flight venue");
  let release;
  createDelay = new Promise((resolve) => { release = resolve; });
  const before = checkoutRequests.length;
  const first = checkout(event, "In flight venue");
  try {
    // Wait until the mocked network boundary has received the first request.
    while (checkoutRequests.length === before) await new Promise((resolve) => setImmediate(resolve));
    const second = await call("/payments/checkout", {
      method:"POST",json:{planId:"venue-boost-7d",eventId:event.id,buyer:{type:"business",name:"In flight venue"}}
    });
    assert.equal(second.status,409);
    assert.equal(second.body.code,"checkout_pending");
    assert.equal(checkoutRequests.length,before+1);
  } finally { release(); createDelay = undefined; }
  const completed = await first;
  assert.equal(completed.order.status,"pending");
  assert.equal(completed.order.stripeCheckoutSessionId,completed.session.id);
});

test("past-deadline pending checkout is reconciled before allowing a new session", async () => {
  const expiredEvent=await businessDraft("Reconciled expired venue");
  const expired=await checkout(expiredEvent,"Reconciled expired venue");
  expired.order.checkoutExpiresAt=new Date(Date.now()-1000).toISOString();
  const retry=await checkout(expiredEvent,"Reconciled expired venue");
  assert.equal(expired.order.status,"expired");
  assert.equal(expired.session.status,"expired");
  assert.notEqual(retry.order.id,expired.order.id);

  const paidEvent=await businessDraft("Delayed webhook venue");
  const paid=await checkout(paidEvent,"Delayed webhook venue");
  paid.order.checkoutExpiresAt=new Date(Date.now()-1000).toISOString();
  paid.session.status="complete";
  paid.session.payment_status="paid";
  const before=checkoutRequests.length;
  const refused=await call("/payments/checkout",{
    method:"POST",json:{planId:"venue-boost-7d",eventId:paidEvent.id,buyer:{type:"business",name:"Delayed webhook venue"}}
  });
  assert.equal(refused.status,409);
  assert.equal(refused.body.code,"already_promoted");
  assert.equal(paid.order.status,"paid");
  assert.equal(checkoutRequests.length,before);
  assert.equal(getEvent(paidEvent.id).publicationStatus,"published");

  const blockedEvent=await businessDraft("Expiry network failure venue");
  const blocked=await checkout(blockedEvent,"Expiry network failure venue");
  blocked.order.checkoutExpiresAt=new Date(Date.now()-1000).toISOString();
  retrieveFailure=stripeError();
  try {
    const before=checkoutRequests.length;
    const unavailable=await call("/payments/checkout",{
      method:"POST",json:{planId:"venue-boost-7d",eventId:blockedEvent.id,buyer:{type:"business",name:"Expiry network failure venue"}}
    });
    assert.equal(unavailable.status,502);
    assert.equal(blocked.order.status,"pending");
    assert.equal(checkoutRequests.length,before);
  } finally {retrieveFailure=undefined;}
});

test("server-side success return verifies payment and reconciles a completed checkout on cancellation", async () => {
  const event = await businessDraft("Success return venue");
  const { order, session } = await checkout(event, "Success return venue");
  assert.equal((await call(`/payments/confirm?session_id=${session.id}`)).body.status, "pending");
  session.payment_status = "paid";
  session.status = "complete";
  const returned = await call(`/payments/confirm?session_id=${session.id}`);
  assert.equal(returned.status, 200);
  assert.equal(order.confirmedVia, "success-return");
  promotionForOrder(order.id).endsAt = new Date(Date.now() - 1000).toISOString();
  const ended = await call(`/payments/confirm?session_id=${session.id}`);
  assert.equal(ended.body.status, "expired");
  assert.equal(ended.body.order.status, "paid");
  assert.equal(getEvent(event.id).publicationStatus, "published");

  const other = await businessDraft("Cancel race venue");
  const race = await checkout(other, "Cancel race venue");
  race.session.payment_status = "paid";
  race.session.status = "complete";
  const cancelled = await call("/payments/cancel", { method: "POST", json: { orderId: race.order.id } });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.order.status, "paid");
  assert.equal(getEvent(other.id).publicationStatus, "published");
});

test("simulated Stripe create and cancellation outages keep recoverable state without leaking errors", async () => {
  const event = await businessDraft("Network outage venue");
  createFailure = Object.assign(new Error("secret-that-must-not-be-returned"), { type: "StripeConnectionError" });
  try {
    const failed = await call("/payments/checkout", {
      method: "POST", json: { planId: "venue-boost-7d", eventId: event.id, buyer: { type: "business", name: "Network outage venue" } }
    });
    assert.equal(failed.status, 502);
    assert.equal(JSON.stringify(failed.body).includes("secret-that-must-not-be-returned"), false);
  } finally { createFailure = undefined; }
  const { order } = await checkout(event, "Network outage venue");
  expireFailure = stripeError();
  try {
    assert.equal((await call("/payments/cancel", { method: "POST", json: { orderId: order.id } })).status, 502);
    assert.equal(order.status, "pending");
    await assertDraft(event);
  } finally { expireFailure = undefined; }
  assert.equal((await call("/payments/cancel", { method: "POST", json: { orderId: order.id } })).body.order.status, "cancelled");
});

test("orders and promotions survive fresh API processes; restart clears expired paid flags", () => {
  const directory = mkdtempSync(join(tmpdir(), "thirdplace-payment-restart-"));
  const file = join(directory, "runtime.json");
  const run = (source, dataFile = file, cwd = process.cwd()) => {
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
      cwd, encoding: "utf8", timeout: 10_000,
      env: { ...process.env, THIRDPLACE_DATA_FILE: dataFile }
    });
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout.trim());
  };
  const services = new URL("../dist/services/", import.meta.url).href;
  const imports = `
    const business = await import(${JSON.stringify(services + "businessEvents.js")});
    const promotions = await import(${JSON.stringify(services + "promotions.js")});
    const events = await import(${JSON.stringify(services + "events.js")});
  `;
  try {
    const created = run(`${imports}
      const event = business.createBusinessEvent({ businessName: 'Durable venue', title: 'Durable coffee evening', description: 'Local coffee with neighbours.', startsAt: new Date(Date.now()+86400000).toISOString(), venueName: 'Durable venue', venueAddressArea: 'Smithfield', category: 'social', interest: 'coffee' });
      const {order} = promotions.createPendingOrder({planId:'venue-boost-7d', eventId:event.id, buyer:{type:'business',name:'Durable venue'}});
      promotions.attachCheckoutSession(order.id,'cs_test_restart_paid');
      promotions.activateFromPaidSession({sessionId:'cs_test_restart_paid',orderId:order.id,paymentStatus:'paid',amountTotal:1499,currency:'eur'},'webhook');
      const draft = business.createBusinessEvent({ businessName: 'Pending durable venue', title: 'Pending durable evening', startsAt: new Date(Date.now()+86400000).toISOString(), venueName: 'Pending durable venue', venueAddressArea: 'Smithfield', category: 'social' });
      const pending = promotions.createPendingOrder({planId:'venue-boost-7d',eventId:draft.id,buyer:{type:'business',name:'Pending durable venue'}}).order;
      promotions.attachCheckoutSession(pending.id,'cs_test_restart_pending');
      console.log(JSON.stringify({eventId:event.id,orderId:order.id,pendingId:pending.id,draftId:draft.id}));
    `);
    assert.ok(existsSync(file));
    const legacy=JSON.parse(readFileSync(file,"utf8"));
    Object.assign(legacy.promotions[0].event,{
      attendeeIds:["private-legacy-attendee"],hostId:"private-legacy-owner",
      coordinates:{latitude:53.12345678,longitude:-6.12345678},
      identityDocument:"private-legacy-document",moodText:"private-legacy-mood"
    });
    writeFileSync(file,JSON.stringify(legacy));
    const restored = run(`${imports}
      const paid=promotions.findOrder(${JSON.stringify(created.orderId)});
      const pending=promotions.findOrder(${JSON.stringify(created.pendingId)});
      const stripe=await import(${JSON.stringify(services + "stripe.js")});
      stripe.setCheckoutSessionsForTesting({
        create:async()=>{throw new Error('No new checkout should be created');},
        expire:async()=>{throw new Error('No session should be expired');},
        retrieve:async(id)=>({id,metadata:{orderId:pending.id},payment_status:'paid',amount_total:1499,currency:'eur',status:'complete',livemode:false})
      });
      const {createApp}=await import(${JSON.stringify(new URL("../dist/app.js", import.meta.url).href)});
      const server=createApp().listen(0,'127.0.0.1');
      await new Promise(resolve=>server.once('listening',resolve));
      const base='http://127.0.0.1:'+server.address().port+'/api';
      const replay=await (await fetch(base+'/payments/confirm?session_id=cs_test_restart_paid')).json();
      const recovered=await (await fetch(base+'/payments/confirm?session_id=cs_test_restart_pending')).json();
      const publicEvents=await (await fetch(base+'/events?paid=true')).json();
      const feed=await (await fetch(base+'/promotions')).json();
      const internal=promotions.promotionForOrder(paid.id);
      internal.event.hostId='private-injected-owner';
      internal.event.coordinates={latitude:53.12345678,longitude:-6.12345678};
      const safeReplay=await (await fetch(base+'/payments/confirm?session_id=cs_test_restart_paid')).json();
      await new Promise(resolve=>server.close(resolve));
      console.log(JSON.stringify({paid:paid.status,session:paid.stripeCheckoutSessionId,replay:replay.status,count:promotions.listActivePromotions().length,published:publicEvents.events.some(event=>event.id===paid.eventId),recovered:recovered.order.status,snapshots:[replay.promotion.event,safeReplay.promotion.event,...feed.promotions.map(item=>item.event)]}));
    `);
    const {snapshots,...facts}=restored;
    assert.deepEqual(facts, { paid: "paid", session: "cs_test_restart_paid", replay: "active", count: 2, published: true, recovered: "paid" });
    for (const snapshot of snapshots) {
      for (const field of ["hostId","attendeeIds","coordinates","identityDocument","moodText"]) assert.equal(field in snapshot,false);
      assert.equal(JSON.stringify(snapshot).includes("private-legacy"),false);
    }
    for (const snapshot of JSON.parse(readFileSync(file,"utf8")).promotions.map(item=>item.event)) {
      for (const field of ["hostId","attendeeIds","coordinates","identityDocument","moodText"]) assert.equal(field in snapshot,false);
    }

    const persisted = JSON.parse(readFileSync(file, "utf8"));
    for (const promotion of persisted.promotions) promotion.endsAt = new Date(Date.now() - 1000).toISOString();
    persisted.events.find((event) => event.id === "sunday-five-a-side").isPaidPromotion = true;
    writeFileSync(file, JSON.stringify(persisted));
    const expired = run(`${imports}
      console.log(JSON.stringify({active:promotions.listActivePromotions().length,paidFlag:events.getEvent(${JSON.stringify(created.eventId)}).isPaidPromotion,published:events.getEvent(${JSON.stringify(created.eventId)}).publicationStatus}));
    `);
    assert.deepEqual(expired, { active: 0, paidFlag: false, published: "published" });
    assert.equal(JSON.parse(readFileSync(file, "utf8")).events.find((item) => item.id === created.eventId).isPaidPromotion, false);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).events.find((item) => item.id === "sunday-five-a-side").isPaidPromotion, false);
    const before = readFileSync(file, "utf8");
    assert.equal(/sk_test_|whsec_/.test(before), false);
    const memoryDirectory = join(directory, "memory");
    mkdirSync(memoryDirectory);
    run(`${imports} events.createEvent({title:'Disposable coffee', description:'Disposable local coffee meetup.',startsAt:new Date(Date.now()+86400000).toISOString(),locationName:'Library',category:'social',interest:'coffee',area:'Smithfield',latitude:53.3487,longitude:-6.2789,hostId:'disposable',hostName:'Disposable host'}); console.log('{}');`, ":memory:", memoryDirectory);
    assert.equal(readFileSync(file, "utf8"), before);
    assert.equal(existsSync(join(memoryDirectory, "apps", "api", ".data", "runtime.json")), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
