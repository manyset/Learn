import ms from "./ms.js";
await ms.ready();

const root = ms.id("compRoot");

// Reusable config: each tab has an id, a label, and its own checkbox options.
const CONFIG = [
    {
        id: "serviceType",
        label: "Service Type",
        options: [
            { id: "data_peotv_voice", label: "Data, PEOTV & Voice Packages" },
            { id: "data_packages", label: "Data Packages" },
            { id: "data_voice", label: "Data & Voice" }
        ]
    },
    {
        id: "packageType",
        label: "Package Type",
        options: [
            { id: "prepaid", label: "Prepaid" },
            { id: "postpaid", label: "Postpaid" },
            { id: "hybrid", label: "Hybrid" }
        ]
    },
    {
        id: "connectionType",
        label: "Connection Type",
        options: [
            { id: "fiber", label: "Fiber" },
            { id: "adsl", label: "ADSL" },
            { id: "4g_lte", label: "4G LTE" },
            { id: "5g", label: "5G" }
        ]
    },
    {
        id: "dataBundle",
        label: "Data Bundle",
        options: [
            { id: "daily", label: "Daily Bundles" },
            { id: "weekly", label: "Weekly Bundles" },
            { id: "monthly", label: "Monthly Bundles" }
        ]
    }
];

const applied = {};   // tabId -> Set of committed option ids
const pending = {};   // tabId -> Set of in-progress option ids (before OK)
let openTabId = null;
let hoverTimer = null;

CONFIG.forEach(function (tab) {
    applied[tab.id] = new Set();
    pending[tab.id] = new Set();
});
applied.serviceType.add("data_peotv_voice"); // matches the pre-checked sample in the screenshot

function buildTab(tab) {
    const doc = root.el.ownerDocument;

    const wrap = doc.createElement("div");
    wrap.className = "tab-wrap";
    wrap.id = "wrap-" + tab.id;

    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn";
    btn.id = "tabBtn-" + tab.id;
    btn.textContent = tab.label;

    const chev = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    chev.setAttribute("viewBox", "0 0 12 8");
    chev.setAttribute("class", "chev");
    const chevPath = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    chevPath.setAttribute("d", "M1 1L6 6L11 1");
    chevPath.setAttribute("stroke", "#fff");
    chevPath.setAttribute("stroke-width", "2");
    chevPath.setAttribute("fill", "none");
    chevPath.setAttribute("stroke-linecap", "round");
    chev.appendChild(chevPath);
    btn.appendChild(chev);
    wrap.appendChild(btn);

    const panel = doc.createElement("div");
    panel.className = "tab-panel";
    panel.id = "panel-" + tab.id;

    const inner = doc.createElement("div");
    inner.className = "panel-inner";

    const list = doc.createElement("div");
    list.className = "opt-list";
    list.id = "optList-" + tab.id;

    tab.options.forEach(function (opt) {
        const row = doc.createElement("label");
        row.className = "opt-row";
        row.id = "optRow-" + tab.id + "-" + opt.id;

        const checkbox = doc.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "chk-" + tab.id + "-" + opt.id;
        checkbox.checked = applied[tab.id].has(opt.id);
        row.classList.toggle("checked", checkbox.checked);

        checkbox.addEventListener("change", function () {
            if (checkbox.checked) pending[tab.id].add(opt.id);
            else pending[tab.id].delete(opt.id);
            row.classList.toggle("checked", checkbox.checked);
        });

        const text = doc.createElement("span");
        text.textContent = opt.label;

        row.appendChild(checkbox);
        row.appendChild(text);
        list.appendChild(row);
    });
    inner.appendChild(list);

    const footer = doc.createElement("div");
    footer.className = "panel-footer";

    const cancelBtn = doc.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-cancel";
    cancelBtn.id = "btnCancel-" + tab.id;
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", function () { cancelTab(tab.id); });

    const okBtn = doc.createElement("button");
    okBtn.type = "button";
    okBtn.className = "btn-ok";
    okBtn.id = "btnOk-" + tab.id;
    okBtn.textContent = "OK";
    okBtn.addEventListener("click", function () { commitTab(tab.id); });

    footer.appendChild(cancelBtn);
    footer.appendChild(okBtn);
    inner.appendChild(footer);
    panel.appendChild(inner);
    wrap.appendChild(panel);

    // Mouse-over navigation: hovering the tab opens it, leaving it closes it
    // (with a short delay so moving from the button down into the panel doesn't flicker).
    wrap.addEventListener("mouseenter", function () { openTab(tab.id); });
    wrap.addEventListener("mouseleave", function () { scheduleClose(tab.id); });

    return wrap;
}

function openTab(tabId) {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    if (openTabId === tabId) return;
    if (openTabId) closeTab(openTabId);

    pending[tabId] = new Set(applied[tabId]);
    syncCheckboxes(tabId);

    root.querySelector("#panel-" + tabId).classList.add("open");
    root.querySelector("#tabBtn-" + tabId).classList.add("open");
    openTabId = tabId;
}

function closeTab(tabId) {
    const panel = root.querySelector("#panel-" + tabId);
    const btn = root.querySelector("#tabBtn-" + tabId);
    if (panel) panel.classList.remove("open");
    if (btn) btn.classList.remove("open");
    if (openTabId === tabId) openTabId = null;
}

function scheduleClose(tabId) {
    hoverTimer = setTimeout(function () { closeTab(tabId); }, 150);
}

function syncCheckboxes(tabId) {
    const boxes = root.querySelectorAll("#optList-" + tabId + " input[type=checkbox]");
    boxes.forEach(function (cb) {
        const optId = cb.id.replace("chk-" + tabId + "-", "");
        const checked = pending[tabId].has(optId);
        cb.checked = checked;
        cb.closest(".opt-row").classList.toggle("checked", checked);
    });
}

function cancelTab(tabId) {
    pending[tabId] = new Set(applied[tabId]);
    closeTab(tabId);
}

function commitTab(tabId) {
    applied[tabId] = new Set(pending[tabId]);
    root.querySelector("#tabBtn-" + tabId).classList.toggle("has-selection", applied[tabId].size > 0);
    closeTab(tabId);
}

function buildAll() {
    const pillRow = root.querySelector("#pillRow");
    CONFIG.forEach(function (tab) {
        pillRow.appendChild(buildTab(tab));
        root.querySelector("#tabBtn-" + tab.id).classList.toggle("has-selection", applied[tab.id].size > 0);
    });
}
buildAll();

root.querySelector("#resetBtn").addEventListener("click", resetAll);

// ---------------------------------------------------------------------
// Public API — declared in the <ms-public> block in filter_menu.html
// ---------------------------------------------------------------------

// Read what's currently selected (committed via OK) in a given tab.
// Returns an array like: [{ id: "data_voice", label: "Data & Voice" }]
export function getSelected(tabId) {
   
    const tab = CONFIG.find(function (t) { return t.id === tabId; });
    if (!tab) return [];
    return tab.options
        .filter(function (o) { return applied[tabId].has(o.id); })
        .map(function (o) { return { id: o.id, label: o.label }; });
}

// Clears every tab's selection (also wired to the Reset pill).
export function resetAll() {
    CONFIG.forEach(function (tab) {
        applied[tab.id] = new Set();
        pending[tab.id] = new Set();
        root.querySelector("#tabBtn-" + tab.id).classList.remove("has-selection");
    });
    root.querySelectorAll(".opt-row").forEach(function (row) {
        row.classList.remove("checked");
        const cb = row.querySelector("input[type=checkbox]");
        if (cb) cb.checked = false;
    });
}

// Cleanup hook for the hover-close timer, per the component lifecycle rules.
export function onClose() {
    if (hoverTimer) clearTimeout(hoverTimer);
}