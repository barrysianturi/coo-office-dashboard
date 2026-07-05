// Throwaway access code, deters casual visitors only. Not real security,
// this is a public static site. Change freely, do not reuse a real password.
const ACCESS_CODE = "coo2026";
const PRIVATE_REPO = "barrysianturi/coo-office";

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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- Decisions tab ---------- */

function escalationField(label, value) {
  if (!value) return null;
  const row = el("div", "esc-field");
  row.appendChild(el("span", "esc-label", label));
  const v = el("div", "esc-value", value);
  row.appendChild(v);
  return row;
}

function escalationCard(esc) {
  const card = el("div", "entry esc-card" + (esc.pending ? " esc-pending" : ""));

  const head = el("div", "esc-head");
  const chip = el("span", "chip", esc.department || "?");
  chip.style.background = `#${esc.accent}`;
  head.appendChild(chip);
  head.appendChild(el("span", "esc-date", esc.date));
  if (esc.tier) head.appendChild(el("span", "badge", "Tier " + esc.tier.split(" ")[0]));
  head.appendChild(
    el("span", "badge " + (esc.pending ? "badge-pending" : "badge-done"),
      esc.pending ? "NEEDS DECISION" : "DECIDED")
  );
  card.appendChild(head);

  [
    ["Issue", esc.issue],
    ["Recommendation", esc.recommendation],
    ["Why it's not Tier 1", esc.whyNotTier1],
    ["Decision needed by", esc.neededBy],
    ["Cross-department impact", esc.crossDept],
    ["Delegated to", esc.delegatedTo],
  ].forEach(([label, value]) => {
    const f = escalationField(label, value);
    if (f) card.appendChild(f);
  });

  if (esc.pending) {
    const form = el("div", "esc-form");
    const ta = el("textarea");
    ta.placeholder = "Write your decision here...";
    const btn = el("button", "btn", "Send decision");
    btn.addEventListener("click", () => {
      const text = ta.value.trim();
      if (!text) {
        ta.focus();
        return;
      }
      const title = `Decision: ${esc.id}`;
      const body = [
        `Match: ${esc.id}`,
        `Heading: ${esc.heading}`,
        "",
        "Decision:",
        text,
        "",
        "_Submitted from the dashboard_",
      ].join("\n");
      const url =
        `https://github.com/${PRIVATE_REPO}/issues/new` +
        `?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
    });
    form.appendChild(ta);
    form.appendChild(btn);
    form.appendChild(
      el(
        "p",
        "esc-hint",
        "Sending opens a prefilled GitHub issue on the private repo (you must be " +
          "logged in as a collaborator). Submit the issue and the decision is " +
          "written into the escalation log automatically, then this page updates " +
          "on the next deploy."
      )
    );
    card.appendChild(form);
  } else {
    const done = el("div", "esc-decision");
    done.appendChild(el("span", "esc-label", "Barry's decision"));
    done.appendChild(el("div", "esc-value", esc.decision));
    card.appendChild(done);
  }

  return card;
}

function renderDecisions(data) {
  const section = el("section", "dept-section");
  section.id = "tab-decisions";

  const pending = data.escalations.filter((e) => e.pending);
  const decided = data.escalations.filter((e) => !e.pending);

  const t1 = el("div", "block");
  t1.appendChild(el("h2", null, `Needs your decision (${pending.length})`));
  if (pending.length === 0) {
    t1.appendChild(el("div", "empty", "Nothing waiting on you."));
  } else {
    pending.forEach((e) => t1.appendChild(escalationCard(e)));
  }
  section.appendChild(t1);

  const t2 = el("div", "block");
  t2.appendChild(el("h2", null, `Decided (${decided.length})`));
  if (decided.length === 0) {
    t2.appendChild(el("div", "empty", "No decisions recorded yet."));
  } else {
    decided.forEach((e) => t2.appendChild(escalationCard(e)));
  }
  section.appendChild(t2);

  return section;
}

/* ---------- KPI tab ---------- */

function statusClass(status) {
  const s = (status || "").toUpperCase();
  if (s.includes("OFF")) return "status-off";
  if (s.includes("RISK")) return "status-at";
  if (s.includes("ON")) return "status-on";
  return "";
}

function renderKpi(data) {
  const section = el("section", "dept-section");
  section.id = "tab-kpi";

  const block = el("div", "block");
  block.appendChild(el("h2", null, "KPI snapshot"));
  if (data.kpi.lastUpdated) {
    block.appendChild(el("p", "esc-hint", "Last updated: " + data.kpi.lastUpdated));
  }

  const table = el("table", "kpi-table");
  const thead = el("thead");
  const hr = el("tr");
  ["Dept", "KPI", "Sub-metric", "Target", "Current", "Status"].forEach((h) =>
    hr.appendChild(el("th", null, h))
  );
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el("tbody");
  data.kpi.rows.forEach((row) => {
    const tr = el("tr");
    const deptCell = el("td");
    const chip = el("span", "chip", row.dept);
    chip.style.background = `#${row.accent}`;
    deptCell.appendChild(chip);
    tr.appendChild(deptCell);
    tr.appendChild(el("td", null, row.kpi));
    tr.appendChild(el("td", null, row.subMetric));
    tr.appendChild(el("td", null, row.target));
    tr.appendChild(el("td", "kpi-current", row.current));
    const st = el("td");
    if (row.status) st.appendChild(el("span", "badge " + statusClass(row.status), row.status));
    tr.appendChild(st);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const scroll = el("div", "table-scroll");
  scroll.appendChild(table);
  block.appendChild(scroll);
  section.appendChild(block);

  return section;
}

/* ---------- Department tabs ---------- */

function block(title, entries, renderEntry) {
  const wrap = el("div", "block");
  wrap.appendChild(el("h2", null, title));
  if (!entries || entries.length === 0) {
    wrap.appendChild(el("div", "empty", "Nothing logged yet."));
    return wrap;
  }
  entries.forEach((entry) => wrap.appendChild(renderEntry(entry)));
  return wrap;
}

function markdownEntryCard(entry) {
  const card = el("div", "entry");
  card.appendChild(el("div", "entry-title", entry.filename));
  const body = el("div", "entry-body");
  body.innerHTML = renderMarkdown(entry.content);
  card.appendChild(body);
  return card;
}

function deliverableRow(file) {
  const row = el("div", "file-row");
  row.appendChild(el("span", null, file.filename + (file.isDir ? "/" : "")));
  if (!file.isDir) row.appendChild(el("span", "size", formatBytes(file.sizeBytes)));
  return row;
}

function renderDepartment(dept) {
  const section = el("section", "dept-section");
  section.id = `tab-${dept.key}`;

  const title = el("div", "dept-title", dept.name);
  title.style.borderColor = `#${dept.accent}`;
  section.appendChild(title);

  section.appendChild(block("Daily Check-ins", dept.dailyCheckins, markdownEntryCard));
  section.appendChild(block("Weekly Status", dept.weeklyStatus, markdownEntryCard));
  section.appendChild(block("Deliverables", dept.deliverables, deliverableRow));

  const lessons = el("div", "block");
  lessons.appendChild(el("h2", null, "Lessons Learned"));
  const card = el("div", "entry-body");
  if (dept.lessonsLearned && dept.lessonsLearned.trim()) {
    card.innerHTML = renderMarkdown(dept.lessonsLearned);
  } else {
    card.appendChild(el("div", "empty", "Nothing logged yet."));
  }
  lessons.appendChild(card);
  section.appendChild(lessons);

  return section;
}

/* ---------- Shell ---------- */

async function loadDashboard() {
  const res = await fetch("data.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("generated-at").textContent =
    `Last built ${new Date(data.generatedAt).toLocaleString()}`;

  const nav = document.getElementById("dept-nav");
  const sections = document.getElementById("dept-sections");
  nav.innerHTML = "";
  sections.innerHTML = "";

  const pendingCount = data.escalations.filter((e) => e.pending).length;
  const tabs = [
    {
      key: "decisions",
      label: pendingCount > 0 ? `Decisions (${pendingCount})` : "Decisions",
      render: () => renderDecisions(data),
      alert: pendingCount > 0,
    },
    { key: "kpi", label: "KPI Dashboard", render: () => renderKpi(data) },
    ...data.departments.map((dept) => ({
      key: dept.key,
      label: dept.name,
      render: () => renderDepartment(dept),
    })),
  ];

  tabs.forEach((tab, i) => {
    const btn = el("button", tab.alert ? "tab-alert" : null, tab.label);
    btn.dataset.key = tab.key;
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", () => showTab(tab.key));
    nav.appendChild(btn);

    const section = tab.render();
    if (i === 0) section.classList.add("active");
    sections.appendChild(section);
  });
}

function showTab(key) {
  document.querySelectorAll("#dept-nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.key === key);
  });
  document.querySelectorAll(".dept-section").forEach((s) => {
    s.classList.toggle("active", s.id === `tab-${key}`);
  });
}
