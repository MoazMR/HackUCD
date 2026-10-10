// Inside the app (Demo tab, served at /demo/) the deck uses the app's own origin, where /api is proxied.
const inApp = location.pathname.startsWith("/demo/");
const slides = [...document.querySelectorAll(".slide")];
const progressBar = document.getElementById("progressBar");
const slideNumber = document.getElementById("slideNumber");
const slideTotal = document.getElementById("slideTotal");
const slideTitle = document.getElementById("slideTitle");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
let current = Math.max(0, Math.min(slides.length - 1, Number(new URLSearchParams(location.hash.slice(1)).get("slide")) - 1 || 0));
let selectedEvent = "poker";

slideTotal.textContent = String(slides.length).padStart(2, "0");

function showSlide(index, replaceHistory = false) {
  const next = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, position) => {
    slide.classList.toggle("active", position === next);
    slide.classList.toggle("was-active", position < next);
    slide.setAttribute("aria-hidden", position === next ? "false" : "true");
  });
  current = next;
  progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
  slideNumber.textContent = String(current + 1).padStart(2, "0");
  slideTitle.textContent = slides[current].dataset.title || "ThirdPlace";
  prevButton.disabled = current === 0;
  nextButton.disabled = current === slides.length - 1;
  const hash = `slide=${current + 1}`;
  if (replaceHistory || inApp) history.replaceState(null, "", `#${hash}`);
  else history.pushState(null, "", `#${hash}`);
}

function next() { showSlide(current + 1); }
function previous() { showSlide(current - 1); }
prevButton.addEventListener("click", previous);
nextButton.addEventListener("click", next);
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", next));
document.querySelectorAll("[data-restart]").forEach((button) => button.addEventListener("click", () => showSlide(0)));

window.addEventListener("popstate", () => {
  const target = Number(new URLSearchParams(location.hash.slice(1)).get("slide")) - 1;
  if (Number.isInteger(target)) showSlide(target, true);
});

document.addEventListener("keydown", (event) => {
  const interactive = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(document.activeElement?.tagName);
  if (event.key === "ArrowRight" || event.key === "PageDown" || (!interactive && event.key === " ")) { event.preventDefault(); next(); }
  if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); previous(); }
  if (event.key === "Home") { event.preventDefault(); showSlide(0); }
  if (event.key === "End") { event.preventDefault(); showSlide(slides.length - 1); }
  if (!interactive && event.key.toLowerCase() === "f") document.getElementById("fullscreenButton").click();
  if (!interactive && event.key.toLowerCase() === "n") document.getElementById("notesToggle").click();
});

document.getElementById("fullscreenButton").addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});

document.getElementById("notesToggle").addEventListener("click", (event) => {
  const showing = document.body.classList.toggle("show-notes");
  event.currentTarget.setAttribute("aria-pressed", String(showing));
});

document.querySelectorAll(".choice").forEach((choice) => {
  choice.addEventListener("click", () => {
    choice.classList.toggle("selected");
    choice.setAttribute("aria-pressed", String(choice.classList.contains("selected")));
  });
});

const radius = document.getElementById("radius");
radius.addEventListener("input", () => { document.getElementById("radiusValue").textContent = `${radius.value} km`; });

const eventData = {
  poker: { title: "Low-stakes poker night", hint: "Poker selected" },
  football: { title: "Five-a-side", hint: "Football selected" }
};

document.querySelectorAll("[data-event]").forEach((card) => {
  card.addEventListener("click", () => {
    selectedEvent = card.dataset.event;
    document.querySelectorAll("[data-event]").forEach((item) => item.classList.toggle("active", item === card));
    const data = eventData[selectedEvent];
    document.getElementById("eventHint").textContent = data.hint;
    document.getElementById("detailTitle").textContent = data.title;
    resetJoin();
  });
});

const joinButton = document.getElementById("joinButton");
function resetJoin() {
  joinButton.classList.remove("joined");
  joinButton.textContent = "Join this event";
  document.getElementById("joinStatus").textContent = "Joining unlocks the public group chat.";
}
joinButton.addEventListener("click", () => {
  const joined = joinButton.classList.toggle("joined");
  joinButton.textContent = joined ? "✓ Joined" : "Join this event";
  document.getElementById("joinStatus").textContent = joined ? "You’re in. The group chat is now open." : "Joining unlocks the public group chat.";
});

document.getElementById("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chatInput");
  const body = input.value.trim();
  if (!body) return;
  const message = document.createElement("div");
  message.className = "message own";
  const bubble = document.createElement("p");
  const author = document.createElement("strong");
  author.textContent = "Jack";
  bubble.append(author, document.createTextNode(body));
  message.append(bubble);
  document.querySelector(".messages").append(message);
  input.value = "";
});


/* ---- live slides: call the running ThirdPlace API (npm run dev). Nothing here is faked. ---- */
const params = new URLSearchParams(location.search);
// Standalone, the deck talks to localhost.
const API = (params.get("api") ?? (inApp ? "" : "http://localhost:3001")).replace(/\/$/, "");
const WEB = (params.get("web") ?? (inApp ? "" : "http://localhost:5173")).replace(/\/$/, "");
document.getElementById("portalLink").href = `${WEB}/src/features/business/portal.html`;
document.getElementById("portalLink").target = inApp ? "_top" : "_blank";

function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
async function api(path, options) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const notRunning = `Can’t reach the API${API ? ` at ${API}` : ""}. Start it with npm run dev.`;

const aiForm = document.getElementById("aiForm");
aiForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const out = document.getElementById("aiOut");
  const button = document.getElementById("aiButton");
  button.disabled = true; button.textContent = "Generating…";
  out.replaceChildren(el("p", "Asking the model…", "muted"));
  try {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const data = await api("/api/event-plans", { method: "POST", body: JSON.stringify({
      goal: document.getElementById("aiGoal").value, area: document.getElementById("aiArea").value,
      category: document.getElementById("aiCategory").value, date: tomorrow }) });
    const live = data.provider === "openrouter";
    out.replaceChildren(
      el("span", live ? `Generated with OpenRouter · ${data.model}` : "Placeholder plan (no OpenRouter key set)", live ? "badge" : "badge warn"),
      el("h4", data.plan.title), el("p", data.plan.description),
      Object.assign(el("ul"), {}), el("p", `About ${data.plan.suggestedDurationMinutes} minutes. ${data.plan.rationale}`, "muted"));
    const list = out.querySelector("ul");
    data.plan.checklist.forEach((item) => list.append(el("li", item)));
  } catch (error) {
    out.replaceChildren(el("p", error.name === "TypeError" ? notRunning : error.message, "err"));
  } finally { button.disabled = false; button.textContent = "Generate a plan"; }
});

async function refreshStripe() {
  const status = document.getElementById("stripeStatus");
  const out = document.getElementById("orderOut");
  try {
    const [pay, orders] = await Promise.all([api("/api/payments/status"), api("/api/business/orders")]);
    status.textContent = pay.stripeConfigured ? "Test mode connected" : "Key not set";
    if (!orders.orders.length) { out.replaceChildren(el("p", "No orders yet. Make a test purchase in the business portal.", "muted")); return; }
    const table = el("table", undefined, "orders");
    const head = table.createTHead().insertRow();
    ["Event", "Amount", "Status"].forEach((label) => head.append(el("th", label)));
    const body = table.createTBody();
    orders.orders.slice().reverse().slice(0, 5).forEach((order) => {
      const row = body.insertRow();
      row.insertCell().textContent = order.eventTitle;
      row.insertCell().textContent = `€${(order.amountCents / 100).toFixed(2)}`;
      row.insertCell().textContent = order.status === "paid" ? "Paid · Promoted" : order.status;
    });
    out.replaceChildren(table);
  } catch (error) {
    status.textContent = "API not running";
    out.replaceChildren(el("p", error.name === "TypeError" ? notRunning : error.message, "err"));
  }
}
document.getElementById("orderRefresh").addEventListener("click", refreshStripe);
refreshStripe();

showSlide(current, true);
