// Throwaway access code, deters casual visitors only. Not real security,
// this is a public static site. Change freely, do not reuse a real password.
const ACCESS_CODE = "coo2026";

const gate = document.getElementById("gate");
const dashboard = document.getElementById("dashboard");
const gateInput = document.getElementById("gate-input");
const gateSubmit = document.getElementById("gate-submit");
const gateError = document.getElementById("gate-error");

function unlock() {
  gate.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadDashboard();
}

if (sessionStorage.getItem("coo-dashboard-unlocked") === "1") {
  unlock();
}

gateSubmit.addEventListener("click", tryUnlock);
gateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlock();
});

function tryUnlock() {
  if (gateInput.value === ACCESS_CODE) {
    sessionStorage.setItem("coo-dashboard-unlocked", "1");
    unlock();
  } else {
    gateError.textContent = "Incorrect code.";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderMarkdown(md) {
  if (!md || !md.trim()) return "";
  return window.marked ? window.marked.parse(md) : `<pre>${md}</pre>`;
}

function block(title, entries, renderEntry) {
  const el = document.createElement("div");
  el.className = "block";
  const h2 = document.createElement("h2");
  h2.textContent = title;
  el.appendChild(h2);

  if (!entries || entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nothing logged yet.";
    el.appendChild(empty);
    return el;
  }

  entries.forEach((entry) => el.appendChild(renderEntry(entry)));
  return el;
}

function markdownEntryCard(entry) {
  const card = document.createElement("div");
  card.className = "entry";
  const title = document.createElement("div");
  title.className = "entry-title";
  title.textContent = entry.filename;
  const body = document.createElement("div");
  body.className = "entry-body";
  body.innerHTML = renderMarkdown(entry.content);
  card.appendChild(title);
  card.appendChild(body);
  return card;
}

function deliverableRow(file) {
  const row = document.createElement("div");
  row.className = "file-row";
  const name = document.createElement("span");
  name.textContent = file.filename;
  const size = document.createElement("span");
  size.className = "size";
  size.textContent = formatBytes(file.sizeBytes);
  row.appendChild(name);
  row.appendChild(size);
  return row;
}

function renderDepartment(dept) {
  const section = document.createElement("section");
  section.className = "dept-section";
  section.id = `dept-${dept.key}`;

  const title = document.createElement("div");
  title.className = "dept-title";
  title.textContent = dept.name;
  title.style.borderColor = `#${dept.accent}`;
  section.appendChild(title);

  section.appendChild(block("Daily Check-ins", dept.dailyCheckins, markdownEntryCard));
  section.appendChild(block("Weekly Status", dept.weeklyStatus, markdownEntryCard));
  section.appendChild(block("Deliverables", dept.deliverables, deliverableRow));

  const lessonsBlock = document.createElement("div");
  lessonsBlock.className = "block";
  const h2 = document.createElement("h2");
  h2.textContent = "Lessons Learned";
  lessonsBlock.appendChild(h2);
  const card = document.createElement("div");
  card.className = "entry-body";
  card.innerHTML = dept.lessonsLearned && dept.lessonsLearned.trim()
    ? renderMarkdown(dept.lessonsLearned)
    : '<div class="empty">Nothing logged yet.</div>';
  lessonsBlock.appendChild(card);
  section.appendChild(lessonsBlock);

  return section;
}

async function loadDashboard() {
  const res = await fetch("data.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("generated-at").textContent =
    `Last built ${new Date(data.generatedAt).toLocaleString()}`;

  const nav = document.getElementById("dept-nav");
  const sections = document.getElementById("dept-sections");
  nav.innerHTML = "";
  sections.innerHTML = "";

  data.departments.forEach((dept, i) => {
    const btn = document.createElement("button");
    btn.textContent = dept.name;
    btn.dataset.key = dept.key;
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", () => showDept(dept.key));
    nav.appendChild(btn);

    const section = renderDepartment(dept);
    if (i === 0) section.classList.add("active");
    sections.appendChild(section);
  });
}

function showDept(key) {
  document.querySelectorAll("#dept-nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.key === key);
  });
  document.querySelectorAll(".dept-section").forEach((s) => {
    s.classList.toggle("active", s.id === `dept-${key}`);
  });
}
