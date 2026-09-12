from pathlib import Path
import re, html, zipfile, shutil

ROOT=Path('/mnt/data/v9work')

# Exact page metadata and educational examples. Each entry is deliberately framework-specific.
entries={
1:("Dynamic Component Loading", "A business application often needs to load a screen only when the user opens that part of the system.",
'''import { lazy, Suspense, useState } from "react";

const DailySale = lazy(() => import("./Sales/DailySale"));

function SalesMenu() {
    const [open, setOpen] = useState(false);

    return <button onClick={() => setOpen(true)}>Daily Sale</button>;
}''',
'''import { Component, ViewChild, ViewContainerRef } from "@angular/core";
import { DailySaleComponent } from "./sales/daily-sale.component";

export class SalesMenuComponent {
    @ViewChild("host", { read: ViewContainerRef }) host!: ViewContainerRef;

    openDailySale() {
        this.host.clear();
        this.host.createComponent(DailySaleComponent);
    }
}''',
'''const ref = await ms.inject(
    "./Sales/DailySale",
    "content"
);''',
"ManySet provides a direct runtime command for loading a component into a target container."),
2:("Passing Parameters", "A dynamically loaded business component usually needs context such as an item ID, customer ID, or document number.",
'''function Customer({ customerId }) {
    return <div>Customer: {customerId}</div>;
}

function SalesPage() {
    return <Customer customerId={1001} />;
}''',
'''@Component({
    selector: "app-sales",
    template: `<app-customer [customerId]="customerId" />`
})
export class SalesComponent {
    customerId = 1001;
}

@Component({
    selector: "app-customer",
    template: `<div>Customer: {{ customerId }}</div>`
})
export class CustomerComponent {
    @Input() customerId!: number;
}''',
'''const ref = await ms.inject(
    "./Sales/Customer",
    "content",
    { customerId: 1001 }
);''',
"ManySet can pass component parameters directly when a component is injected."),
3:("Calling Component Methods", "A parent screen may need to tell an already loaded business component to refresh, validate, print, or perform another operation.",
'''const reportRef = useRef(null);

function SalesPage() {
    function refreshReport() {
        reportRef.current?.refresh();
    }

    return <button onClick={refreshReport}>Refresh</button>;
}''',
'''@ViewChild(ReportComponent) report!: ReportComponent;

refreshReport() {
    this.report.refresh();
}''',
'''const ref = await ms.inject("./Reports/Sales", "content");
ref.refresh();''',
"ManySet returns a component reference, allowing the caller to invoke a public component function."),
4:("Accessing Component Properties", "Business screens sometimes expose a value that another component needs to read, such as the selected customer or current age.",
'''const customerRef = useRef(null);

function readCustomer() {
    // A React component normally communicates through
    // props, state, callbacks, or a shared state mechanism.
}''',
'''@ViewChild(CustomerComponent) customer!: CustomerComponent;

showAge() {
    console.log(this.customer.age);
}''',
'''const ref = await ms.inject("./Customer", "content");
alert(ref.txtAge);''',
"ManySet component references can expose readable properties, including values represented by HTML controls."),
5:("Component Communication", "Large business applications need predictable ways for parent and child components to exchange data and commands.",
'''function CustomerEditor({ onSaved }) {
    function save() {
        onSaved({ id: 1001 });
    }

    return <button onClick={save}>Save</button>;
}

function CustomerPage() {
    return <CustomerEditor onSaved={(x) => console.log(x)} />;
}''',
'''@Output() saved = new EventEmitter<number>();

save() {
    this.saved.emit(1001);
}

// Parent template:
// <app-editor (saved)="customerSaved($event)" />''',
'''const editor = await ms.inject("./CustomerEditor", "editor");
editor.onSaved = (customer) => console.log(customer);''',
"ManySet can use component references and public functions for direct communication between business components."),
6:("Cross-Component Events", "Unrelated parts of an ERP may need to react to events such as an order being posted or stock being updated.",
'''// A common React solution uses a shared event bus
// or application state library.

bus.emit("stock.updated", { itemId: 25 });
bus.on("stock.updated", (data) => refreshItem(data.itemId));''',
'''// A service can act as a shared event stream.
stockUpdated$.subscribe(itemId => {
    this.refreshItem(itemId);
});

stockUpdated$.next(25);''',
'''ms.ui.emit("stock.updated", { itemId: 25 });

ms.ui.listen("stock.updated", data => {
    refreshItem(data.itemId);
});''',
"ManySet provides ms.ui.emit and ms.ui.listen for application-level UI events."),
7:("Deep Component Injection", "A wizard or tab can contain sub-screens that themselves load further components. Managing these nested relationships can become cumbersome.",
'''function WizardStep() {
    return (
        <div>
            {/* Step components are rendered by React */}
            <CustomerStep />
            <PaymentStep />
        </div>
    );
}''',
'''@ViewChild("stepHost", { read: ViewContainerRef })
stepHost!: ViewContainerRef;

openStep() {
    this.stepHost.createComponent(CustomerStepComponent);
}''',
'''const b = await ms.inject("B", ms.id("DivA"));
const c = await ms.inject("C", b.divB);''',
"ManySet can inject into a container owned by an already injected component, making nested wizard and tab structures direct to express."),
8:("Component Lifecycle", "Business components often need initialization, show/hide, and cleanup behavior tied to their lifetime.",
'''useEffect(() => {
    loadCustomer();

    return () => {
        // cleanup subscriptions, timers, listeners, etc.
    };
}, []);''',
'''ngOnInit() {
    this.loadCustomer();
}

ngOnDestroy() {
    this.subscription?.unsubscribe();
}''',
'''function msLoad() {
    // optional constructor-like component initialization
}

function onLoad() { }
function onShow() { }
function onHide() { }
function onClose() { }''',
"ManySet supports an optional msLoad function and lifecycle-style hooks such as onLoad, onShow, onHide, and onClose."),
9:("Parallel Preloading", "When several likely screens are known in advance, loading them one at a time can increase perceived startup or navigation delay.",
'''const DailySale = lazy(() => import("./DailySale"));
const Customers = lazy(() => import("./Customers"));
const Reports = lazy(() => import("./Reports"));

// React lazy loading is normally triggered as components are rendered.''',
'''// Angular can preload lazy routes through the router.
provideRouter(routes,
    withPreloading(PreloadAllModules)
);''',
'''const refs = await ms.preload(
    "DailySale",
    "Customers",
    "Reports"
);''',
"ManySet provides ms.preload for a small set of components that should be loaded in parallel. Images are also preloaded by the runtime."),
10:("Sequential Preload Queue", "A large number of assets may be better loaded gradually rather than creating one large parallel burst.",
'''// A React application can schedule work itself.
for (const screen of screens) {
    await import(`./screens/${screen}.js`);
}''',
'''// Angular can use route preloading strategies to control
// when lazy modules are requested. Custom strategies can
// queue selected routes instead of loading everything at once.''',
'''await ms.preloadQueue(
    "Screen01",
    "Screen02",
    "Screen03",
    "Screen04"
);''',
"ManySet provides preloadQueue for sequential loading when many components should be loaded in a controlled order."),
11:("Bulk Injection", "A dashboard or business screen may need several independent components inserted during one navigation operation.",
'''function Dashboard() {
    return (
        <>
            <DailySale />
            <Stock />
        </>
    );
}''',
'''@ViewChildren(WidgetHostDirective)
hosts!: QueryList<WidgetHostDirective>;

// Each host can create its required component.
// The application controls the mapping between hosts and components.''',
'''const [sale, stock] = await ms.inject(
    ["./abc/DailySale", "demo1", { append: true }],
    ["./xyz/Stock", "demo2"]
);''',
"ManySet can inject several components through one bulk call, reducing repetitive orchestration code."),
12:("CallTree Dependency Preloading", "Deep component trees can otherwise cause repeated discovery and network visits when one component loads another component at runtime.",
'''const Sales = lazy(() => import("./Sales"));

// Nested components are discovered through the React module graph
// and bundler/build tooling rather than an MS CallTree.''',
'''loadComponent() {
    // Angular's compiler and bundler process component references.
    // Route/component lazy loading is configured through Angular APIs.''',
'''// Developer code remains unchanged:
await ms.inject("./Sales", "content");

// CallTree is generated and consumed internally by ManySet
// to discover onLoad injection dependencies before execution.''',
"ManySet's CallTree is a hidden build-time/runtime performance booster, not another developer API to learn."),
13:("ERP Form Construction", "ERP data-entry screens commonly combine labels, inputs, combos, validation, and grids in a repeated structure.",
'''function ItemForm() {
    return (
        <form>
            <label>Item Name</label>
            <input name="name" />
            <label>Category</label>
            <select name="category"><option>Raw Material</option></select>
            <button type="submit">Save</button>
        </form>
    );
}''',
'''<form [formGroup]="form">
    <input formControlName="name" />
    <select formControlName="category"></select>
    <button type="submit">Save</button>
</form>''',
'''const section = ms.form.section();
section.fields = {
    Name: "text(40)",
    Category: "combo"
};

await ms.insert(section, "itemForm");''',
"ManySet's form.section is aimed at quickly building business-oriented input panels with controls and validation."),
14:("Form Validation", "Business forms need field-level rules and useful feedback before a record is submitted.",
'''<input
    value={name}
    maxLength={30}
    onChange={e => setName(e.target.value)}
/>
{!name && <span>Name is required</span>}''',
'''name = new FormControl("", [
    Validators.required,
    Validators.maxLength(30)
]);

// The template can display control errors.''',
'''g.editFields = {
    Name: "text(30)",
    Weight: "decimal(10.5-80.5)",
    Age: "int(20-80)",
    Date: "date(23/02/18-23/04/26) optional"
};''',
"ManySet can declare common business validation rules in editFields and apply them to grid/form controls."),
15:("Combo and Select Controls", "ERP applications repeatedly use searchable or data-bound selections such as Supplier, Country, Warehouse, and Item.",
'''const [country, setCountry] = useState("");

<select value={country} onChange={e => setCountry(e.target.value)}>
    <option value="LK">Sri Lanka</option>
    <option value="IN">India</option>
</select>''',
'''country = new FormControl("");

countries = [
    { id: "LK", name: "Sri Lanka" },
    { id: "IN", name: "India" }
];''',
'''const countryCombo = ms.form.combo();
countryCombo.data = ms.data(json.countries);
await ms.insert(countryCombo, "country");''',
"ManySet provides a form combo control and ms.data integration for business data sources."),
16:("Complex Business Grids", "Business grids often need editable fields, calculated values, validation, hidden keys, and custom actions—not just a list of records.",
'''function ItemGrid({ rows }) {
    return <table>
        <tbody>
            {rows.map(row => (
                <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.quantity}</td>
                    <td>{row.quantity * row.price}</td>
                </tr>
            ))}
        </tbody>
    </table>;
}''',
'''<table mat-table [dataSource]="items">
    <!-- columns, cell templates, sorting, paging and editing
         are configured through Angular Material/CDK or application code -->
</table>''',
'''const g = ms.form.grid();
g.fields = [
    { key: "Id", label: "ID" },
    { key: "Name", label: "Name" },
    { key: "Quantity", label: "Qty" },
    { key: "Total", label: "Total" }
];
await ms.insert(g, "items");''',
"ManySet's form.grid is designed around recurring business-grid requirements such as editing, validation, paging, and data operations."),
17:("Local Grid Pagination", "When a grid already has a manageable dataset in the browser, pagination can be performed locally without another server request for every page.",
'''const [page, setPage] = useState(1);
const pageSize = 20;
const visible = rows.slice((page - 1) * pageSize, page * pageSize);''',
'''pageIndex = 0;
pageSize = 20;

// Angular Material's paginator can drive the displayed slice
// or a data source can manage the paging state.''',
'''const g = ms.form.grid();
g.pageSize = 20;
g.data = ms.data(rows);
g.pagination = "local";''',
"ManySet can keep a loaded dataset in the grid and paginate it locally."),
18:("Server Grid Pagination", "Large ERP tables should normally retrieve only the requested page instead of downloading every record to the browser.",
'''async function loadPage(page) {
    const response = await fetch(`/api/items?page=${page}&pageSize=20`);
    const result = await response.json();
    setRows(result.items);
}''',
'''loadPage(pageIndex: number) {
    this.http.get(`/api/items?page=${pageIndex}&pageSize=20`)
        .subscribe(result => this.items = result.items);
}''',
'''const g = ms.form.grid();
g.data = ms.data("Inventory", "/itemsDataGrid", "items", true);''',
"ManySet's ms.data can describe a server-paged grid source so the grid can request data as needed."),
19:("Grid Editing", "Inline editing in business grids needs rules for opening editors, validating values, reading values, and writing them back safely.",
'''function QuantityCell({ row, onChange }) {
    return <input
        value={row.quantity}
        onChange={e => onChange(row.id, Number(e.target.value))}
    />;
}''',
'''<input matInput
       [(ngModel)]="row.quantity"
       type="number">

// Angular forms/validation can be attached to the editor.''',
'''g.editFields = {
    Quantity: "int(0-9999)",
    Weight: "decimal(0.1-80.5)"
};

g.onTextLeave = (row, field) => {
    // recalculate dependent values
};

g.setValue(row, "Quantity", 12);''',
"ManySet exposes business-grid editing through a compact configuration and grid API."),
20:("Grid Data Binding and Joining", "A business grid may need a display value from another data section—for example, Item rows joined with Country or Supplier information.",
'''const rows = items.map(item => ({
    ...item,
    countryName: countries.find(c => c.id === item.countryId)?.name
}));''',
'''items = items.map(item => ({
    ...item,
    countryName: this.countries.find(c => c.id === item.countryId)?.name
}));''',
'''g.data = ms.data("Inventory", "/itemsDataGrid", "items");
g.dataJoin("itemsCountry", "id=itemId");''',
"ManySet provides dataJoin so related data sections can be combined at the grid-data layer."),
21:("Screen Layout", "ERP screens commonly have a header, navigation area, content region, and optional side panels that should remain independent of the business components placed inside them.",
'''function AppLayout({ children }) {
    return (
        <div className="shell">
            <header>ERP</header>
            <aside>Menu</aside>
            <main>{children}</main>
        </div>
    );
}''',
'''<div class="shell">
    <app-header />
    <app-sidebar />
    <main><router-outlet /></main>
</div>''',
'''const layout = ms.layout();
layout.header = "header";
layout.left = "menu";
layout.main = "content";
await ms.insert(layout, "app");''',
"ManySet's layout separates screen regions from the components placed inside them."),
22:("Dynamic Tabs and Wizards", "Tabs and multi-step wizards often need to create the next screen only when the user reaches that step.",
'''const [step, setStep] = useState(1);
return step === 1
    ? <CustomerStep onNext={() => setStep(2)} />
    : <PaymentStep />;''',
'''currentStep = 1;

next() {
    this.currentStep++;
}

// The template selects the component for the current step.''',
'''const wizard = await ms.inject("./Wizard", "content");
const customer = await ms.inject("./CustomerStep", wizard.stepHost);
const payment = await ms.inject("./PaymentStep", wizard.stepHost);''',
"ManySet's deep injection model lets a parent wizard or tab dynamically place sub-screens into containers owned by other components."),
23:("HTTP and Backend Services", "Business components need a consistent way to call backend endpoints without repeating base URLs and request configuration throughout the UI.",
'''const response = await fetch("/api/inventory/items");
const items = await response.json();''',
'''constructor(private http: HttpClient) {}

loadItems() {
    return this.http.get<Item[]>("/api/inventory/items");
}''',
'''const data = await ms.http.get(
    "Inventory",
    "/itemsData"
);''',
"ManySet's ms.http can resolve a logical service name through GlobalConfig and call its endpoint directly."),
24:("Multiple Backend Services", "An ERP can have separate services for Sales, Inventory, Auth, Reporting, or other bounded areas, each with different base URLs and security rules.",
'''async function load() {
    const [sales, stock] = await Promise.all([
        fetch("/api/sales/orders").then(r => r.json()),
        fetch("/api/inventory/items").then(r => r.json())
    ]);
}''',
'''this.http.get("/api/sales/orders");
this.http.get("/api/inventory/items");

// Angular environments/interceptors can centralize service URLs.''',
'''const orders = await ms.http.get("Sales", "/orders");
const stock  = await ms.http.get("Inventory", "/items");''',
"ManySet can map components to logical services and keep service base URLs and authentication settings in GlobalConfig."),
25:("Client-Side Embedded Database", "Some applications need local structured data for temporary work, offline-like processing, caching, or complex client-side queries.",
'''// React itself does not provide a SQL database.
// Applications commonly add IndexedDB wrappers or another client database.
const request = indexedDB.open("erp-cache", 1);''',
'''// Angular itself does not provide an embedded SQL engine.
// A project can add a browser database library and wrap it in a service.''',
'''await ms.db.exec(`
    CREATE TABLE Items (Id INTEGER, Name TEXT);
`);

const rows = await ms.db.query(`
    SELECT * FROM Items WHERE Id = 10
`);''',
"ManySet provides ms.db as a client-side embedded database API capable of executing SQL commands."),
26:("Application Data Binding", "Business screens often need to transform, extract, and reuse sections of a JSON response rather than manually copying data between controls.",
'''const result = await fetch("/api/items").then(r => r.json());
const countries = result.countries;
setCountries(countries);''',
'''this.http.get<DataResult>("/api/items")
    .subscribe(result => {
        this.countries = result.countries;
    });''',
'''const json = await ms.http.get("Inventory", "/itemsData");
countryCombo.data = ms.data(json.countries);''',
"ManySet's ms.data can extract a section from JSON and can also describe grid data sources."),
27:("Centralized Error Handling", "A business application needs consistent decisions about whether errors should be shown to users, written to the console, or reported to a server.",
'''try {
    await saveCustomer();
} catch (error) {
    setError("Unable to save customer.");
}''',
'''this.http.post(url, body).subscribe({
    error: () => this.errorMessage = "Unable to save customer."
});

// Interceptors can centralize HTTP error handling.''',
'''// GlobalConfig.json controls MS error behaviour.
// Example settings can enable popup, console detail,
// or server reporting.
// A component may also handle its own error explicitly.''',
"ManySet centralizes default error behaviour through GlobalConfig while still allowing application-level handling."),
28:("Global Loading Animation", "Navigation and server operations can leave users wondering whether a screen is still working unless loading feedback is handled consistently.",
'''const [loading, setLoading] = useState(false);

async function save() {
    setLoading(true);
    try { await api.save(); }
    finally { setLoading(false); }
}''',
'''loading = false;

save() {
    this.loading = true;
    this.service.save().subscribe({
        complete: () => this.loading = false
    });
}''',
'''// GlobalConfig.json
"LoadingAnimation": {
    "Enabled": true,
    "Type": "image",
    "LockUI": false
}''',
"ManySet can apply loading-animation behaviour globally through configuration instead of requiring each screen to implement the same visual mechanism."),
29:("Global CSS and Style Injection", "Large frontends need a controlled way to load shared styles while avoiding uncontrolled global CSS collisions between micro-frontends.",
'''import "./sales.css";

function Sales() {
    return <div className="sales-panel">Sales</div>;
}''',
'''@Component({
    styleUrls: ["./sales.component.css"]
})
export class SalesComponent {}''',
'''await ms.style.inject(
    "./Sales/Sales.css",
    "sales"
);''',
"ManySet provides style injection and a configuration-driven style system intended to keep component styling controlled."),
30:("Common JavaScript and Library Management", "Many screens may depend on the same utility or third-party library. Repeating imports and loading rules can make a large frontend harder to govern.",
'''import { formatCurrency } from "./common/format.js";
import chart from "some-chart-library";

// Each module declares its dependencies explicitly.''',
'''import { CurrencyPipe } from "@angular/common";
import { ChartService } from "./chart.service";

// Shared Angular providers can centralize reusable services.''',
'''// GlobalConfig.json
"CommonJS": [
    "./CommonReports.js",
    "./helper.js"
],
"CommonCSS": [
    "./CommonReports.css"
]''',
"ManySet can declare common JavaScript and CSS resources centrally in GlobalConfig."),
31:("Component and Service Governance", "A micro-frontend team needs rules for which components can access services and which components are allowed to participate in shared application infrastructure.",
'''// React has no built-in service-governance policy.
// Teams commonly enforce boundaries through package structure,
// lint rules, code review, and application conventions.''',
'''// Angular can organize features into modules/standalone components
// and use route guards/providers, but governance policy remains
// largely an application/team concern.''',
'''"ComponentServices": {
    "./Sales/": "Sales",
    "./Inventory/": "Inventory"
},
"Services": {
    "Inventory": {
        "AllowedComponents": ["./Inventory/", "./Sales/"]
    }
}''',
"ManySet can express component-to-service permissions in GlobalConfig, making governance visible as configuration."),
32:("MS Public Governance Visualization", "When component boundaries and public APIs are important, developers need a way to see the declared public surface of components.",
'''// React component APIs are normally visible through props,
// exported functions, context, and the source tree.
// Governance visualization is generally supplied by external tooling.''',
'''// Angular metadata, inputs, outputs, providers and routes can be
// inspected through Angular tooling, but custom governance views
// usually require additional tooling.''',
'''<ms-public>
    publicFunctions: ["save", "refresh"]
    publicContainers: ["content"]
    access: "Sales"
</ms-public>''',
"ManySet provides GUI support at compile time for visualizing the declared <ms-public> governance surface."),
33:("MS JavaScript and HTML Syntax Checking", "A business-component file combines HTML, JavaScript, and MS commands, so errors can be detected before the application is deployed.",
'''// React projects normally rely on TypeScript/ESLint/build tooling.
// JSX and JavaScript syntax are checked during development/build.''',
'''// Angular CLI uses the TypeScript compiler, template compiler,
// and lint/build tooling to detect many source errors.''',
'''// ManySet compiler validation checks MS, JavaScript and HTML
// syntax as part of the development/build workflow.''',
"ManySet adds syntax checking specifically across the MS component model, JavaScript, and HTML."),
34:("Build-Time Dependency Analysis", "Finding component dependencies at build time can reduce runtime discovery work and make a micro-frontend deployment more predictable.",
'''// Bundlers build a module dependency graph from imports.
// React developers normally rely on Vite, Webpack, or another bundler.''',
'''// Angular CLI builds a dependency graph from imports, routes,
// templates and lazy-loaded application structure.''',
'''// MS compiler scans component files and creates CallTree.json.
// The runtime can use it before executing inject/open operations.''',
"ManySet uses build-time component analysis for its hidden CallTree performance mechanism; developers do not call CallTree directly."),
35:("AI-Assisted Development", "AI tools work best when the application structure, commands, and conventions are explicit and easy to inspect.",
'''function CustomerCard({ customer }) {
    return <article>
        <h2>{customer.name}</h2>
        <button onClick={() => save(customer)}>Save</button>
    </article>;
}''',
'''@Component({
    selector: "app-customer-card",
    template: `
      <article>
        <h2>{{ customer.name }}</h2>
        <button (click)="save()">Save</button>
      </article>`
})
export class CustomerCardComponent {}''',
'''const ref = await ms.inject("./CustomerCard", "content");
ref.refresh();''',
"ManySet's compact HTML/JS structure and explicit runtime APIs can give AI-assisted development a smaller, more direct vocabulary for common business UI operations."),
36:("Micro-Frontend Team Development", "Independent teams need boundaries around components, services, events, and ownership without creating unnecessary integration code.",
'''// A React micro-frontend may expose a component from one build
// and consume it from another through a federation or package boundary.
const SalesApp = remoteModule.SalesApp;''',
'''// Angular micro-frontends can use module federation or route-based
// boundaries, with each remote exposing application features.''',
'''await ms.inject("./Sales/Invoice", "salesHost");

// GlobalConfig can define service and event permissions
// for the component boundary.''',
"ManySet's component isolation, service mapping, event controls, and dynamic injection are intended to support micro-frontend team boundaries."),
37:("Reducing Architectural Infrastructure", "A large business frontend can accumulate routing, state, component loading, data, forms, layout, and utility layers that developers must coordinate.",
'''// React itself is a UI library, so a business application often
// combines React with routing, state, forms, data fetching,
// validation and other libraries.''',
'''// Angular provides a broader framework, but complex ERP systems
// still combine router, forms, HTTP, UI libraries, state patterns,
// and application-specific infrastructure.''',
'''const data = await ms.http.get("Inventory", "/items");
const g = ms.form.grid();
g.data = ms.data(data.items);
await ms.insert(g, "content");''',
"ManySet groups recurring business-application capabilities into its runtime APIs so fewer separate application-level mechanisms are needed for common tasks."),
38:("Long-Term Sustainability and Maintenance", "Sustainable business software benefits when recurring patterns are consistent, dependencies are visible, and infrastructure is centralized instead of repeated across screens.",
'''// React applications can remain maintainable with strong conventions,
// reusable components, tests, linting and disciplined dependency management.
function CustomerField({ value, onChange }) {
    return <input value={value} onChange={onChange} />;
}''',
'''// Angular encourages consistent patterns through its framework,
// dependency injection, templates and CLI tooling.
@Component({ selector: "app-field", template: `<input>` })
export class FieldComponent {}''',
'''const ref = await ms.inject("./Customer", "content");
await ms.http.get("Sales", "/orders");
ms.ui.emit("customer.changed", { id: 1001 });''',
"ManySet's approach is to keep common business runtime capabilities consistent and centrally configurable, reducing repeated infrastructure across components."),
39:("Modern JavaScript and Vanilla JavaScript Integration", "Business developers sometimes need direct access to native HTML elements, properties, methods, and browser events instead of wrapping every operation in framework-specific abstractions.",
'''const button = document.getElementById("save");
button?.addEventListener("click", () => {
    const input = document.getElementById("name");
    console.log(input?.value);
});''',
'''const button = document.getElementById("save");
button?.addEventListener("click", () => {
    const input = document.getElementById("name");
    console.log(input?.value);
});''',
'''ms.id("txtBox1").value = "Apple";
ms.id("board1").addEventListener("click", f);

ms.el.button("b2").onclick = () =>
    ms.inject("./B", "a");''',
"ManySet provides ms.id and ms.el as simplified access to native element properties, methods, and events while remaining compatible with modern/vanilla JavaScript."),
40:("Learning Curve", "A business developer may need to learn a framework, language extensions, component conventions, state patterns, and ecosystem tooling before implementing routine screens.",
'''import { useState } from "react";

function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}''',
'''@Component({
    selector: "app-counter",
    template: `<button (click)="count = count + 1">{{ count }}</button>`
})
export class CounterComponent {
    count = 0;
}''',
'''<button id="btn">Count</button>
<script type="module">
    import ms from "./msLib/ms.js";

    let count = 0;
    ms.id("btn").onclick = () => {
        count++;
        ms.id("btn").textContent = count;
    };
</script>''',
"ManySet is designed around HTML and JavaScript with a compact business-application API surface, avoiding the need for JSX or TypeScript for native MS development."),
41:("HTML-Native Component Structure and Governance", "A component is easier to inspect when its markup, containers, scripts, and declared public surface are visible in one familiar file structure.",
'''function SalesCard() {
    return (
        <section>
            <h2>Sales</h2>
            <button>Open</button>
        </section>
    );
}''',
'''@Component({
    selector: "app-sales-card",
    templateUrl: "./sales-card.html"
})
export class SalesCardComponent {}''',
'''<ms-public>
    publicFunctions: ["open", "refresh"]
    publicContainers: ["details"]
</ms-public>

<h2>Sales</h2>
<button id="open">Open</button>
<div id="details"></div>''',
"ManySet keeps component markup close to ordinary HTML and allows a declared public surface through <ms-public>."),
42:("Direct HTML and JavaScript Integration", "When a developer already knows browser APIs, moving between ordinary HTML/JavaScript and a component runtime should not require abandoning that knowledge.",
'''function SalesPanel() {
    return <div id="sales-panel">Sales</div>;
}

// Native browser APIs can still be used where appropriate.
document.title = "Sales";''',
'''@Component({
    template: `<div #panel>Sales</div>`
})
export class SalesComponent {
    @ViewChild("panel") panel!: ElementRef;
}''',
'''<div id="sales-panel">Sales</div>

<script type="module">
    import ms from "./msLib/ms.js";

    ms.id("sales-panel").textContent = "Daily Sales";
    ms.id("sales-panel").addEventListener("click", () => {
        ms.inject("./Reports", "sales-panel");
    });
</script>''',
"ManySet allows normal HTML and JavaScript to remain visible while adding MS runtime commands where they simplify the business task."),
43:("Component Development & Integration", "A business component may contain markup, dynamic component slots, buttons, and external scripts. Keeping these pieces together can simplify integration.",
'''function Sales() {
    return (
        <section>
            <CustomerList />
            <button onClick={() => openReport()}>Report</button>
        </section>
    );
}''',
'''@Component({
    selector: "app-sales",
    templateUrl: "./sales.html",
    styleUrls: ["./sales.css"]
})
export class SalesComponent {
    openReport() { /* route or create component */ }
}''',
'''<h1>Sales</h1>
<ms-com id="customers" src="./Customers"></ms-com>
<div id="reportHost"></div>
<button id="openReport">Report</button>

<script type="module" src="./Sales.mjs"></script>
<script src="./classic.js"></script>''',
"ManySet components can combine HTML, MS elements, native HTML containers, internal JavaScript, and external modern/classic JavaScript in a straightforward component structure."),
44:("Learning Curve & Boilerplates", "Repeated business screens can require a surprising amount of surrounding setup when each concern is implemented through separate abstractions and libraries.",
'''function CustomerForm() {
    const [name, setName] = useState("");
    return (
        <form onSubmit={save}>
            <input value={name} onChange={e => setName(e.target.value)} />
            <button type="submit">Save</button>
        </form>
    );
}''',
'''form = new FormGroup({
    name: new FormControl("", Validators.required)
});

save() {
    if (this.form.valid) this.service.save(this.form.value);
}''',
'''const section = ms.form.section();
section.fields = {
    Name: "text(30)",
    Age: "int(20-80)"
};
await ms.insert(section, "customerForm");''',
"ManySet aims to reduce repeated business-form boilerplate by putting common business controls and validation behind a compact runtime API.")
}

# Sidebar categories copied from current site structure.
def sidebar(section, active):
    groups=[
    ("01. Component Architecture", range(1,9)),
    ("02. Loading & Performance", range(9,13)),
    ("03. Business UI", range(13,23)),
    ("04. Data & Backend", range(23,27)),
    ("05. Infrastructure", range(27,31)),
    ("06. Governance & Tooling", range(31,35)),
    ("07. Architecture & Sustainability", range(35,39)),
    ("08. Developer Experience & Productivity", range(39,45)),]
    links=[]
    links.append('<div class="category"><a class="menu-link intro-link" href="../index.html#introduction">Introduction</a></div>')
    for title, nums in groups:
        a=[f'<div class="category"><h3>{html.escape(title)}</h3>']
        for n in nums:
            t=entries[n][0]
            fn=filenames[n]
            cls=' active' if n==active else ''
            a.append(f'<a class="menu-link{cls}" href="{fn}">{n:02d}. {html.escape(t)}</a>')
        a.append('</div>')
        links.append(''.join(a))
    return ''.join(links)

filenames={n:f for n,f in [(1,'01-dynamic-component-loading.html'),(2,'02-passing-parameters.html'),(3,'03-calling-component-methods.html'),(4,'04-accessing-component-properties.html'),(5,'05-component-communication.html'),(6,'06-cross-component-events.html'),(7,'07-deep-component-injection.html'),(8,'08-component-lifecycle.html'),(9,'09-parallel-preloading.html'),(10,'10-sequential-preload-queue.html'),(11,'11-bulk-injection.html'),(12,'12-calltree-dependency-preloading.html'),(13,'13-erp-form-construction.html'),(14,'14-form-validation.html'),(15,'15-combo-and-select-controls.html'),(16,'16-complex-business-grids.html'),(17,'17-local-grid-pagination.html'),(18,'18-server-grid-pagination.html'),(19,'19-grid-editing.html'),(20,'20-grid-data-binding-and-joining.html'),(21,'21-screen-layout.html'),(22,'22-dynamic-tabs-and-wizards.html'),(23,'23-http-and-backend-services.html'),(24,'24-multiple-backend-services.html'),(25,'25-client-side-embedded-database.html'),(26,'26-application-data-binding.html'),(27,'27-centralized-error-handling.html'),(28,'28-global-loading-animation.html'),(29,'29-global-css-and-style-injection.html'),(30,'30-common-javascript-and-library-management.html'),(31,'31-component-and-service-governance.html'),(32,'32-ms-public-governance-visualization.html'),(33,'33-ms-javascript-and-html-syntax-checking.html'),(34,'34-build-time-dependency-analysis.html'),(35,'35-ai-assisted-development.html'),(36,'36-micro-frontend-team-development.html'),(37,'37-reducing-architectural-infrastructure.html'),(38,'38-long-term-sustainability-and-maintenance.html'),(39,'39-modern-javascript-and-vanilla-javascript-integration.html'),(40,'40-extremely-low-learning-curve.html'),(41,'41-html-like-component-structure-and-governance.html'),(42,'42-direct-html-javascript-integration.html'),(43,'43-html-native-component-structure.html'),(44,'44-low-learning-curve-minimal-boilerplate.html')]}

persist='''<script>\n(function(){\n  const STORAGE_KEY='ms-sidebar-scroll:'+location.pathname.split('/')[1];\n  function sidebar(){return document.querySelector('.docs-sidebar')}\n  function save(){const s=sidebar();if(s)sessionStorage.setItem(STORAGE_KEY,String(s.scrollTop));}\n  function restore(){const s=sidebar();if(!s)return;const v=sessionStorage.getItem(STORAGE_KEY);if(v!==null)s.scrollTop=+v;}\n  const s=sidebar(); if(s)s.addEventListener('scroll',save,{passive:true});\n  restore();\n})();\n</script>'''

def write_page(framework, n):
    title,diff,react,angular,ms,mswhy=entries[n]
    fwcode=react if framework=='React' else angular
    framework_difficulty=f"The {framework} Difficulty"
    framework_approach=f"{framework} Approach"
    folder='react-vs-ms' if framework=='React' else 'angular-vs-ms'
    out=ROOT/folder/'problems'/filenames[n]
    out.parent.mkdir(parents=True,exist_ok=True)
    page=f'''<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>{n:02d}. {html.escape(title)} — {framework} Difficulties | ManySet</title>\n<meta name="description" content="{html.escape(title)}: {framework} and ManySet approaches for business applications.">\n<link rel="stylesheet" href="../../assets/site.css">\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css">\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.min.css">\n<style>\n.problem-body h1{{font-size:38px;line-height:1.2;margin:0 0 26px}}\n.problem-body h2{{font-size:25px;margin-top:38px}}\n.problem-body p{{font-size:16px;line-height:1.75;color:#535c69}}\n.problem-code{{background:#fff!important;border:1px solid #dfe3e8!important;border-radius:9px!important;box-shadow:none!important;margin:18px 0 30px!important}}\n.problem-code code,.problem-code pre{{font-size:15px;line-height:1.65}}\n</style>\n</head>\n<body>\n<header class="site-header">\n<a class="brand" href="../../index.html"><span class="brand-mark">MS</span><span>ManySet</span><span class="version">v1.0</span></a>\n<nav class="main-nav"><a href="../../learn/index.html">Learn</a><a href="../../api-reference/index.html">API Reference</a><a class="{'active' if framework=='Angular' else ''}" href="../../angular-vs-ms/index.html">Angular Difficulties</a><a class="{'active' if framework=='React' else ''}" href="../../react-vs-ms/index.html">React Difficulties</a></nav>\n</header>\n<main class="docs-shell">\n<aside class="docs-sidebar" aria-label="{framework} difficulties navigation">{sidebar(framework+' Difficulties',n)}</aside>\n<section class="docs-main">\n<article class="problem-body">\n<div class="breadcrumbs">ManySet / {framework} Difficulties / {n:02d}</div>\n<h1>{n:02d}. {html.escape(title)}</h1>\n<h2>The Problem</h2>\n<p>{html.escape(diff)}</p>\n<h2>{html.escape(framework_difficulty)}</h2>\n<p>{html.escape(diff)} The framework provides the building blocks, but the application still has to assemble them according to its architecture and conventions.</p>\n<h2>{html.escape(framework_approach)}</h2>\n<pre class="line-numbers problem-code"><code class="language-javascript">{html.escape(fwcode)}</code></pre>\n<h2>MS Approach</h2>\n<p>{html.escape(mswhy)}</p>\n<pre class="line-numbers problem-code"><code class="language-javascript">{html.escape(ms)}</code></pre>\n<h2>Why this way is useful in business applications :</h2>\n<p>ManySet aims to express recurring business-application work with direct runtime APIs, while keeping the underlying HTML and JavaScript model visible to the developer.</p>\n<h3>Key Point :</h3>\n<p><strong>{html.escape('ManySet provides a focused runtime API for this recurring business-application task, while keeping framework-specific infrastructure outside the developer-facing command where possible.')}</strong></p>\n</article>\n</section>\n</main>\n<footer>ManySet — frontend runtime and Low-Code API framework</footer>\n{persist}\n<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>\n</body>\n</html>'''
    out.write_text(page,encoding='utf-8')

for framework in ('React','Angular'):
    for n in entries: write_page(framework,n)

# Update index menu 43/44 labels to match pages and clean labels.
for folder in ('react-vs-ms','angular-vs-ms'):
    p=ROOT/folder/'index.html'
    if p.exists():
        t=p.read_text(encoding='utf-8')
        replacements={
          '40. Learning Curve':'40. Learning Curve',
          '43. Component Development &amp; Integration':'43. Component Development &amp; Integration',
          '44. Learning Curve &amp; Boilerplates':'44. Learning Curve &amp; Boilerplates',
        }
        p.write_text(t,encoding='utf-8')

# Validate every problem page has all required sections and different React/Angular code.
errors=[]
for n in entries:
    r=(ROOT/'react-vs-ms'/'problems'/filenames[n]).read_text(encoding='utf-8')
    a=(ROOT/'angular-vs-ms'/'problems'/filenames[n]).read_text(encoding='utf-8')
    for label,text in [('React',r),('Angular',a)]:
        for h in ['The Problem','The '+label+' Difficulty',label+' Approach','MS Approach','Why this way is useful in business applications','Key Point']:
            if h not in text: errors.append(f'{label} {n}: missing {h}')
    # Compare code blocks only, not full pages.
    rc=re.findall(r'<code class="language-javascript">(.*?)</code>',r,re.S)
    ac=re.findall(r'<code class="language-javascript">(.*?)</code>',a,re.S)
    if rc and ac and rc[0]==ac[0]: errors.append(f'{n}: React/Angular code identical')

print('Generated',len(entries)*2,'problem pages')
print('Validation errors:',len(errors))
if errors: print('\n'.join(errors[:20]))
