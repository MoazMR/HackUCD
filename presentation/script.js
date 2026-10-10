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
  if (replaceHistory) history.replaceState(null, "", `#${hash}`);
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
  poker: { title: "Low-stakes poker night", symbol: "♠", className: "poker-art" },
  football: { title: "Friendly five-a-side", symbol: "⚽", className: "football-art" }
};

document.querySelectorAll("[data-event]").forEach((card) => {
  card.addEventListener("click", () => {
    selectedEvent = card.dataset.event;
    document.querySelectorAll("[data-event]").forEach((item) => item.classList.toggle("active", item === card));
    const data = eventData[selectedEvent];
    document.getElementById("eventHint").textContent = `${data.title.split(" ")[0]} selected`;
    const hero = document.querySelector(".event-hero");
    hero.classList.remove("poker-art", "football-art");
    hero.classList.add(data.className);
    hero.querySelector(":scope > span").textContent = data.symbol;
    document.getElementById("detailTitle").textContent = data.title;
    resetJoin();
  });
});

const joinButton = document.getElementById("joinButton");
function resetJoin() {
  joinButton.classList.remove("joined");
  joinButton.textContent = "Join this event";
  document.getElementById("joinStatus").textContent = "You’ll unlock the public event group when you join.";
}
joinButton.addEventListener("click", () => {
  const joined = joinButton.classList.toggle("joined");
  joinButton.textContent = joined ? "✓ Joined — open public group" : "Join this event";
  document.getElementById("joinStatus").textContent = joined ? "You’re in. The public event group is now available." : "You’ll unlock the public event group when you join.";
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

showSlide(current, true);
