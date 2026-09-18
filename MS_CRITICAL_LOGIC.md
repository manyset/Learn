# MS Critical Logic

This document explains the MS engine areas that must be treated as critical when changing `ms.js`, `form.js`, `ms build`, or related component rules.

The goal is not to list ordinary component syntax. The goal is to protect the engine behavior that makes MS usable in a micro frontend environment: the same component should work standalone, injected, opened, nested, declarative, and from menu navigation without leaking IDs, events, styles, or public APIs into another component.

## 1. Component Identity And Execution Context

Why this UX is required:

MS users should not have to pass a root object everywhere. Code inside a component should be able to call `ms.id("x")`, `ms.q(".x")`, `ms.inject(...)`, `ms.open(...)`, or a public function and have MS know which component is currently running.

What must be handled carefully:

- Every script, lifecycle hook, public function, DOM event handler, timer callback, and async continuation must run under the correct component instance.
- Context must survive `await`, nested `ms.inject`, nested `ms.open`, popup calls, declarative children, and callback-based events.
- Never depend on one global mutable "current component" without a stack/restore discipline.
- Always restore the previous context after the current operation completes.
- Route/menu testing is mandatory because direct standalone loading can pass while menu-driven nested navigation fails.

Technical notes:

- The engine tracks component instances in `INSTANCES`.
- Code execution is wrapped with instance context using the engine context stack.
- `CURRENT_SCREEN`, active instances, and last interaction context are fallback mechanisms only. They must not override a known execution context.
- A component ref returned by `ms.inject`, `ms.open`, `ms.com`, or popup must represent that specific instance, not whatever component happens to be active later.

High-risk failure pattern:

```js
await ms.inject("A", "host");
// A loads A1, and A1 loads A11.
// If context is restored too early, A11 may search IDs in A or the caller.
```

Required protection:

- Preserve caller/child context through the full lifecycle of nested async work.
- Test both direct component run and `menu.html` routes after context changes.

## 2. ID And DOM Lookup

Why this UX is required:

Micro frontend teams may reuse simple IDs such as `status`, `btnSave`, or `container`. MS must allow that safely. A component should only find its own element, even when another component or caller has the same ID.

What must be handled carefully:

- `ms.id("x")` must resolve inside the current component root.
- `ms.el.button("x")` is a convenience over the same scoped lookup idea. It must not create a different lookup behavior.
- `document.getElementById("x")` inside managed component code must be scoped when MS rewrites or proxies document access.
- Custom tag injection targets such as `<my-slot></my-slot>` are allowed, but this must not accidentally treat standard HTML tags as injection targets.
- Case-insensitive lookup and ambiguity checks must be consistent. If `Div1` and `div1` both exist in one component, the engine/build step should treat that as unsafe.

Technical notes:

- Each component instance has its own Shadow DOM root.
- `MSDomRef` wraps real DOM elements and exposes `.el` for browser APIs and third-party libraries.
- Third-party libraries must receive the real element:

```js
const container = ms.id("container").el;
SomeChartLibrary.chart(container, options);
```

Do not rely on third-party libraries resolving a string ID:

```js
SomeChartLibrary.chart("container", options);
```

High-risk failure pattern:

```html
<!-- caller -->
<div id="status-panel"></div>

<!-- child component -->
<script type="module">
  import ms from "./ms.js";
  await ms.ready();
  document.getElementById("status-panel").textContent = "Changed";
</script>
```

Required protection:

- The child must not modify the caller's `status-panel`.
- A missing ID must fail clearly with a component-scoped error.
- ID lookup code should be centralized as much as possible. Multiple lookup functions with slightly different rules are a maintenance risk.

## 3. Script Execution And Module Capture

Why this UX is required:

MS users should be able to write simple module component code:

```js
import ms from "./ms.js";
await ms.ready();

function onLoad(args) {}
function setData(data) {}
```

They should not be forced to use `export` only to let MS find lifecycle or public functions.

What must be handled carefully:

- Module capture must be narrow. It should apply to real MS standalone components that define lifecycle/public functions, not ordinary harness pages that merely import MS and call `ms.inject`.
- Native browser execution and MS-managed execution must not both run the same component logic.
- Generated module URLs must retain the original component `.html` or linked
  `.js` source identity, and engine prefixes must not shift source lines. VS Code
  breakpoints and MS error line reporting depend on this.
- Classic scripts are not the preferred path for MS lifecycle/public APIs.
- Do not add engine logic that names a specific third-party product. Handle general browser/library patterns instead.

Technical notes:

- The engine captures lifecycle functions from module code using the configured lifecycle names.
- Public functions listed in `<ms-public><functions>...</functions></ms-public>` are captured from top-level module declarations.
- Public `<functions>` and `<classes>` policy names are matched case-insensitively, but exact spelling is still the recommended UX.
- If one component or its linked scripts define public names that differ only by case, the engine must fail explicitly instead of choosing one.
- `export` is optional for MS lifecycle/public functions, but normal top-level declarations are required.
- Functions inside callbacks, `if` blocks, classes, or nested functions are not reliable public MS APIs.

High-risk failure pattern:

```js
import ms from "./ms.js";
await ms.ready();

function onLoad() {}
function onLoad() {} // duplicate declaration: module syntax error
```

Required protection:

- Declare each lifecycle function only once.
- Do not intercept every standalone page with a module script. Only manage module scripts when the page is acting as an MS component.

## 4. Constructor And `onLoad(args)` Logic

Why this UX is required:

MS uses `onLoad(args)` as the simple constructor-like entry point. The same pattern must work for:

```js
await ms.inject("CustomerCard", "host", { customerId: 8 });
await ms.open("Dashboard", { val: 8 });
```

and declarative components:

```html
<ms-com id="card" src="./CustomerCard.html" params='{"customerId":8}'></ms-com>
```

What must be handled carefully:

- `onLoad(args)` must run once per component instance.
- Constructor parameters must belong to that instance only.
- Re-showing an existing component should not call `onLoad` again; it should call `onShow`.
- Replacing/destroying a component must not leave old constructor state or public functions active.

Technical notes:

- `callOnLoad(instance)` guards with `instance.didLoad`.
- Constructor params are stored on the instance as `constructorParams`.
- Component filenames have no constructor meaning. A same-named function is an ordinary function and must run only when application code calls it.

Required protection:

- Use only `onLoad(args)` for constructor-like component initialization.
- Do not make component authors synchronize caller variable names with callee parameter names. Pass an object and let the callee choose what to read.

## 5. Lifecycle, Hide, Close, And Focus

Why this UX is required:

Users need predictable screen behavior: initialize once, show many times, block navigation when needed, clean up when hidden or destroyed, and react to focus changes.

Lifecycle meaning:

- `onLoad(args)`: constructor-like setup, once per instance.
- `onShow()`: after a component becomes visible.
- `onBeforeHide()`: cancellable pre-hide gate. Return `false` to stop hide/navigation.
- `onHide()`: after a component is actually hidden/replaced.
- `onClose()`: before the instance is destroyed.
- `onFocus()`: when user interaction makes this component focused.
- `onLostFocus()`: when focus moves away from this component or the focused instance is destroyed.

What must be handled carefully:

- `onBeforeHide` must run before any visible state is changed.
- `onHide` must not be used as a cancellation point.
- `onClose` is not the same as `onHide`; hidden components may still exist.
- Async hooks must be awaited where their result controls navigation.
- Focus events must not fire repeatedly for the same current component.

Required protection:

- Test open replacement, inject replacement, declarative replacement, and popup close separately.
- Keep hooks optional. Components that do not define them must behave as before.

## 6. Delete APIs And Memory Cleanup

Why this UX is required:

Users need to remove one component, one component type, or all components in a
container without leaving hidden DOM, event handlers, timers, store
subscriptions, UI listeners, or stale refs active.

Delete API meaning:

- `ms.deleteInstance(ref)`: destroy only the component represented by that ref.
- `ms.deleteType(container, component)`: destroy all matching component
  instances inside the container.
- `ms.deleteContainer(container)`: destroy all MS component instances inside the
  container and preserve non-MS DOM.
- `ms.deleteContainer(container, true)`: destroy all MS component instances and
  then clear the remaining DOM content in the container.

What must be handled carefully:

- Visual removal must happen through the instance host, not by only clearing an
  internal shadow root.
- Descendant components must be destroyed before their parent.
- `onBeforeHide()` remains the cancellable gate. If it blocks deletion, no
  target should be partially deleted.
- `onClose()` must run for every destroyed instance.
- Store subscriptions, event bus listeners, UI listeners, native cleanups,
  timers, observers, and scoped module cleanup must be released.
- Current focus, current screen, last interaction, error popup instance, and
  execution stack entries must not keep references to destroyed components.

Required protection:

- Test standalone and menu-injected deletion paths.
- Include nested components in tests so parent deletion proves child cleanup and
  visual removal.

## 7. Bootstrap And Standalone Mode

Why this UX is required:

The same `.html` component should work when opened directly in a browser and when loaded through MS from a menu or another component.

What must be handled carefully:

- Direct browser load must create an MS-managed root and instance.
- Existing visible body content must be moved into the component root without losing styles, scripts, import maps, or declarative child placeholders.
- `<ms-public>` must be parsed, then removed from visible DOM.
- Script tags must not be double-executed when MS manages module lifecycle/public functions.
- Default CSS must be applied before component startup code observes final styles.
- Declarative child component files should be preloaded early, especially in standalone components.

Technical notes:

- `__ms_bootstrap()` creates the standalone host/root and registers an instance.
- Standalone bootstrap must wait for configuration and default CSS before managed component module code runs.
- Standalone module capture must be selective. General pages and regression harnesses must not be blocked by a component-only lifecycle bridge.

Required protection:

- Test standalone and menu/injected mode after bootstrap changes.
- Test both normal pages that use MS as a library and real MS standalone components.

## 7. Declarative Components

Why this UX is required:

Users should be able to write:

```html
<ms-com id="salesGrid" src="./salesGrid.html" params='{"val":8}'></ms-com>
```

without writing manual `ms.inject` code.

What must be handled carefully:

- Only `<ms-com>` is the supported declarative component tag.
- Declarative components should preload child component files in parallel.
- Display/mounting may remain ordered, but downloading should avoid unnecessary sequential delays.
- `ms.com("id")` must return a safe deferred ref even if the child is still loading.
- Nested declarative children must not be treated as top-level children of the parent.

Required protection:

- Keep `<ms-component>` removed/unsupported if the agreed UX is only `<ms-com>`.
- Test a page with more than one slow child to confirm parallel request timing.

## 8. Injection, Open, Popup, And Deep Navigation

Why this UX is required:

MS has a simple mental model:

- `ms.inject(...)`: put a component into a caller-selected place.
- `ms.open(...)`: open a component in the main screen area.
- `ms.popup(...)`: open a component in a popup.

All three should return refs that allow public function/class calls.

What must be handled carefully:

- Argument overloads must remain backward compatible.
- Parent/child ownership must be preserved for runtime access governance.
- `append`, `top`, replacement, and nested inject behavior must not corrupt context.
- `ms.open` has no user-specified container, but public APIs must work the same as `ms.inject`.
- Popup chrome is isolated from application and component CSS. The configured `popup` CSS styles the window frame and title bar without entering the popup component's own shadow root.
- A popup with no local `style` receives configured popup CSS automatically. When the caller selects `popup` or `*` in `<default-css>`, configured popup CSS replaces local `popup.style`; `none` disables global popup CSS.
- Local popup CSS variables such as `--ms-popup-title-background` and `--ms-popup-title-color` must work even when governance excludes the configured popup stylesheet.
- `popup.top` and `popup.left` accept CSS lengths or numbers. Numbers mean pixels. A popup with neither value is centered and can be dragged by its title bar.
- `popup.closeOnEsc` controls Escape-key closing and defaults to `true`.
- `popup.closeOnBackdrop` defaults to `false` regardless of `popup.modal`. A component must explicitly set it to `true` to close when the backdrop is clicked.
- `popup.minimizable` defaults to `true`. Minimize keeps the popup at its current position as a compact draggable title bar; the same control restores its prior size. Popups do not have a Maximize control.
- Popups are mouse-resizable from every edge and corner by default and cannot shrink below `220 x 120px`. `popup.autoShrink` defaults to `true` and keeps the popup inside the viewport.
- `popup.contentMargin` controls inner spacing and defaults to `8px 0 0 8px`. `popup.contentCenter = true` centers natural-size content and intentionally ignores `contentMargin`.
- Popup component loading uses the caller's normal loading-animation settings, including target and full-screen modes.

Required protection:

- Deep injection tests must include function calls, class/public calls, nested containers, append/top ordering, and repeated navigation.
- Do not optimize by changing mount order unless the behavior is explicitly tested.

## 8A. Layout Ref Contract

Why this UX is required:

`ms.layout()` is intended to hide layout CSS complexity from normal component authors while preserving the full MS component model. Users should be able to inject more components into layout regions later without remembering an internal `slots` object.

Expected user-facing pattern:

```js
const layout = ms.layout();
layout.content.src = "GridComp";

const layoutRefs = await ms.insert(layout, "host");

await ms.inject("SummaryCard", layoutRefs.content, { append: true });
```

What must be handled carefully:

- `layoutRefs.header`, `layoutRefs.left`, `layoutRefs.content`, `layoutRefs.right`, and `layoutRefs.footer` must always be slot/container refs.
- Initial component refs created by `layout.header.src`, `layout.content.src`, etc. must live under `layoutRefs.components`.
- Do not overwrite `layoutRefs.content` with the component ref injected into the `content` slot.
- Slot `text` or `html` must be able to render in the same slot as `src`; the static content should be added before the injected component.
- `slot.style` styles the slot/container. `slot.textStyle` styles the generated text element. Inherited CSS such as `color` may naturally affect text, but engine behavior should not depend on `slot.style` being copied into the text node.
- Layout default CSS must follow the same governance rule as form controls: no local style means configured layout CSS may apply automatically; local layout style is overridden only when `<default-css>` contains `layout` or `*`. Empty `<default-css></default-css>` must not override local layout styling.
- `layoutRefs.slots.*` may remain only as an internal/transition alias. New examples and generated components should use direct refs such as `layoutRefs.content`.
- Later component ordering inside a slot must use normal inject rules: `{ append: true, top: true/false }`.

Technical notes:

```js
layoutRefs.content              // slot/container ref
layoutRefs.components.content   // initial component ref injected into content

layout.header.text = "ERP Dashboard";
layout.header.textStyle = { color: "white", fontWeight: "600" };
layout.header.src = "HeaderComp";
layout.content.cardType = true;
```

Layout governance example:

```html
<ms-public>
  <default-css>layout</default-css>
</ms-public>
```

Required protection:

- Test standalone and menu/injected mode after changing layout refs.
- Verify that later `ms.inject("X", layoutRefs.content, { append: true })` still works.
- Verify that public APIs of initial slot components are still reachable through `layoutRefs.components.*`.
- Verify that `msCSS/LayoutDefault.css` is loaded from `GlobalConfig.json` only inside the active component scope.

## 9. Public API And `<ms-public>`

Why this UX is required:

MS components are isolated by default, but callers still need controlled access to selected functions/classes.

Allowed tags:

- `<functions>`
- `<classes>`
- `<containers>`
- `<default-css>`
- `<store>`
- `<events>`
- `<access>`

What must be handled carefully:

- Wrong tags such as `<elements>`, `<divs>`, and `<allow>` must not silently become public policy.
- Public functions must be top-level functions in the component module.
- `<functions>` and `<classes>` policy entries are case-insensitive. `SetVal`, `setval`, and `SETVAL` refer to the same public member name.
- Public member ambiguity is component-wide. A duplicate such as `setVal` in one script and `SetVal` in another script in the same component must be rejected.
- Missing public declarations should block external access with a clear error.
- Public refs must bind calls to the original component instance context.

Required protection:

- Test public calls through `ms.inject`, `ms.open`, `ms.com`, and popup refs.
- Keep public API failures explicit. Silent fallback to globals is unsafe.

## 10. Access Governance

Why this UX is required:

Micro frontend teams and closed-source/vendor components need policy controls. One component may expose services to others while preventing its own internal code from loading unauthorized components.

Policy meaning:

```html
<ms-public>
  <access>block out, block in, ./Folder1/a, ./Folder2/, *</access>
</ms-public>
```

- `./Folder1/a`, `./Folder2/`, and `*` describe who may access this component.
- `block out` restricts what this component may access outside its own folder.
- `block in` restricts what this component may access inside its own folder.
- `block in` plus `block out` means the component cannot issue internal `ms.inject` or `ms.open` calls.

What must be handled carefully:

- Governance must be enforced at build time and runtime.
- Runtime enforcement is mandatory because dynamic code can bypass static scanning.
- Access checks need accurate source component and target component paths.
- Missing or empty `<access>` means no inject/open access restrictions, but other `<ms-public>` sections still apply.

Required protection:

- Do not treat inbound access and outbound restrictions as the same concept.
- Do not invent new tag names or policy names.
- Runtime access errors should use clear MS error handling, not generic JavaScript failures.

## 11. Common JS, Common CSS, And Default CSS

Why this UX is required:

Different micro frontend teams may reference the same library or style file from different paths. MS needs central governance to avoid duplicate downloads, version conflicts, and inconsistent visuals.

What must be handled carefully:

- Common JS/CSS lookup is name-based and config-controlled.
- If a file name is listed in GlobalConfig, load the configured path, not the component path.
- If a configured global path is wrong, fail clearly; do not silently load a different component path.
- If a component has a local style and `<default-css>` does not request override, do not override it.
- If an element/control has no local style, global default style may be applied automatically.
- Inline styles normally win unless the global CSS uses `!important`.

Required protection:

- Avoid flicker by deciding style policy before applying local/global styles.
- Test standalone and injected style behavior.
- Test native HTML elements and MS form controls separately.

## 12. Third-Party Libraries And Rendered Output

Why this UX is required:

MS should support charts, 3D, SVG, canvas, maps, and other rich components without adding vendor-specific engine code.

What must be handled carefully:

- The engine must not contain product-specific logic such as special cases for one chart library.
- Component authors should pass real component DOM elements, not string IDs, to third-party libraries.
- SVG/CSS custom property behavior can differ inside Shadow DOM and may require general rendered-output refresh handling.
- Libraries that use bare module imports need import maps or CommonJS/CommonCSS governance.

Required protection:

- Keep fixes generic: DOM element passing, import map rewriting, scoped document/window, and rendered-output refresh.
- Test at least one chart/visual component standalone and through menu/injection.

## 13. Error System

Why this UX is required:

MS errors should help developers find the failed component and reason quickly, especially when the failure happens through a menu or deep navigation path.

What must be handled carefully:

- Errors should include component name, operation/origin, and useful message.
- Access denial, missing ID, public API not found, duplicate/ambiguous ID, failed script load, and governance violations should be explicit.
- Engine-halting errors should not leave partial instances active.

Required protection:

- Avoid swallowing errors only to keep rendering going.
- Avoid generic "undefined is not a function" where MS can provide a policy/context explanation.

## 14. Testing And Regression

Why this UX is required:

MS bugs often appear only in one mode: standalone, menu, injected, open, popup, declarative, IIS, Live Server, or nested navigation.

What must be handled carefully:

- Every engine change should be tested standalone and through `menu.html` where relevant.
- Regression output should stay low-noise: pass/fail plus compact state details.
- Visual tests should include both screenshots and DOM/state assertions where practical.
- Long or flaky tests should be isolated so they do not block the whole harness.

Critical areas that should be represented in test summaries:

- Injection
- Declarative
- ID
- Emit
- Popup
- Grid
- Combo
- Input
- Dialog
- Error System
- Bootstrap
- Complex Navigation
- Performance
- MS Public
- Lifecycle Cleanup
- Store Data
- Common JS/CSS
- Style Governance
- Security Governance
- HTTP / Server Access
- Browser Server Matrix
- Other

## 15. Rules For Future Engine Changes

Before changing critical logic:

1. Identify which UX rule the change protects.
2. Check whether the issue is component-side, configuration-side, or engine-side.
3. Keep the change narrow and avoid product-specific code.
4. Preserve backward compatibility unless the user explicitly approves an API break.
5. Test standalone, injected/menu, and at least a few suspicious components.
6. Update this document or `MS_COMPONENT_RULES.md` if the change changes a rule.

Most dangerous changes:

- Changing ID lookup without running ID conflict tests.
- Changing context stack logic without deep inject and menu tests.
- Changing bootstrap without standalone and harness-page tests.
- Changing lifecycle order without hide/open/popup tests.
- Changing default CSS governance without standalone and injected style tests.
- Changing import/script execution without chart/3D/common JS tests.

## 16. HTTP And Server Access

Why this UX is required:

Components should call business services without knowing deployment hosts,
ports, credentials, or environment topology. A Sales component can use its
normal service with `ms.http.get("/orders")` and explicitly use another allowed
service with `ms.http.get("Inventory", "/items")`.

What must be handled carefully:

- `ComponentServices` selects a component's default service; it is routing, not
  authorization.
- Each service's `AllowedComponents` is the authorization boundary and must be
  checked for default and explicitly named service calls.
- Component identity must include its canonical component path. A standalone
  component may otherwise expose only a short logical name and miss a folder
  policy.
- The component-scoped HTTP facade must preserve normal JavaScript
  `try...catch`. It must not auto-report a rejection before user code can catch
  it.
- An unhandled HTTP rejection must enter the normal MS error system once and may
  be sent to `ErrorSettings.ErrorServerURL`. Error reporting must use native
  `fetch()` internally to avoid recursive `ms.http` failures.
- Bearer values come from governed `ms.store`; tokens and server origins must
  never be embedded in component source or configuration values intended as
  public data.
- Reject absolute component-provided URLs and parent-path escapes. Deployment
  origins must come only from configured services.

Required protection:

- Test standalone and menu-injected calls.
- Test default and explicit services, authorization denial, Bearer lookup,
  timeout, JSON writes, caught errors, and one unhandled server report.
- Keep the API a narrow wrapper over native `fetch()`; do not add retries,
  caching, or interceptors without a separate reviewed requirement.
