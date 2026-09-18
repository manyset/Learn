Create a ManySet/MS-compatible HTML component.

Follow the rules exactly.
Keep the component simple.
Do not add <html>, <head>, or <body>.
Use MS-scoped DOM access.
The component must work standalone and when loaded by ms.inject(...) / ms.open(...).


# ManySet/MS Component Rules

Create this as a ManySet/MS-compatible HTML component. The component must work both standalone in the browser and when loaded by `ms.inject(...)` or `ms.open(...)`.

MS runs components in isolated component roots. Code should be written as if the component owns only its own root, not the whole page. The same IDs and function names may exist in other MS components without conflict.

1. Do not use `<html>`, `<head>`, or `<body>` tags inside the component.

2. Create one main root element:

   ```html
   <div id="compRoot" class="comp-root">
   ```

3. Put all visible UI inside the root element.

4. Use static `<ms-public>` only when outside code must call component functions or classes:

   ```html
   <ms-public>
     <functions>resetScene, loadData</functions>
     <classes>MyClass</classes>
   </ms-public>
   ```

5. Do not create `<ms-public>` dynamically in JavaScript.

6. Do not style `html`, `body`, or global `:root`.

7. Do not use global reset selectors such as:

   ```css
   * { margin: 0; padding: 0; }
   ```

   Use a scoped reset instead:

   ```css
   .comp-root * { box-sizing: border-box; }
   ```

8. Scope all CSS under the root class:

   ```css
   .comp-root { ... }
   .comp-root .title { ... }
   .comp-root #panel { ... }
   ```

9. Put component styles inside the component file. For best standalone compatibility, place `<style>` after the visible root markup, not as the first node.

10. If using `<script type="module">`, import MS and wait for it:

    ```js
    import ms from "./ms.js";
    await ms.ready();
    ```

11. Do not create another local variable named `ms`.

12. Get the component root using:

    ```js
    const root = ms.id("compRoot");
    ```

13. Use MS-scoped DOM lookup for component UI:

    ```js
    ms.id("x")
    ms.el.button("saveButton")
    ms.el.input("email")
    ms.q(".x")
    ms.qa(".x")
    root.querySelector(...)
    root.querySelectorAll(...)
    ```

14. ID lookup in MS is component-local. `ms.id("x")`, `ms.el.button("x")`, scoped `document.getElementById("x")`, returned-ref element access, and `ms.inject(..., "x")` search only inside the current component context or the intended owner component.

15. Prefer exact ID spelling in code:

    ```html
    <button id="btnLogin">Login</button>
    ```

    ```js
    ms.el.button("btnLogin").onclick = login;
    ```

    MS can tolerate casing mistakes such as `ms.el.button("BtnLogin")`, but generated code should still use the exact ID for readability.

16. IDs must be unique inside one component after ignoring case. This is invalid:

    ```html
    <div id="Div1"></div>
    <div id="div1"></div>
    ```

    MS must not silently choose one of them. The build/runtime should report an ambiguous ID. The same ID may exist safely in different MS components.

17. `ms.el.tagName(id)` is only a readable shortcut over `ms.id(id)`. It does not prove the real element tag. For example:

    ```js
    ms.el.button("btnLogin")
    ```

    means:

    ```js
    ms.id("btnLogin")
    ```

    Use the tag word only to make code easy to read.

18. `ms.q(...)`, `ms.qa(...)`, `root.querySelector(...)`, and `root.querySelectorAll(...)` are normal CSS selector APIs. They follow browser selector rules and may return the first matching element. Use IDs through `ms.id(...)` when the target must be exact and ambiguity-protected.

19. Custom tag injection such as:

    ```html
    <cus-panel></cus-panel>
    ```

    ```js
    ms.inject("Child", "cus-panel");
    ```

    may use the first matching custom tag. If there can be more than one target, give the target an ID and inject by ID instead.

20. Avoid global document lookup for component UI:

    ```js
    document.querySelector(...)
    document.querySelectorAll(...)
    document.currentScript
    document.body
    document.documentElement
    ```

    `document.getElementById(...)` is scoped by MS in component scripts, but still prefer `ms.id(...)` in generated components because it makes the MS component boundary obvious.

21. If creating elements dynamically, create and attach them inside the component:

    ```js
    const root = ms.id("compRoot");
    const doc = root.el.ownerDocument;

    const table = doc.createElement("table");
    ms.id("tableHost").el.appendChild(table);
    ```

22. Do not append component UI to global page locations:

    ```js
    document.body.appendChild(...)
    document.getElementById(...).appendChild(...)
    ```

23. After an element is found correctly, normal DOM methods are OK:

    ```js
    const root = ms.id("compRoot");

    root.querySelectorAll("button")
    root.addEventListener("click", handler)
    ```

24. `ms.id()`, `ms.el.*()`, `ms.q()`, and root references are MS wrappers. For browser APIs or third-party libraries, use `.el`:

    ```js
    resizeObserver.observe(container.el);
    getComputedStyle(root.el);
    container.el.appendChild(canvas);
    ```

    Do not pass string IDs to third-party libraries. Pass the real element:

    ```js
    const container = ms.id("container").el;
    SomeChartLibrary.chart(container, options);
    ```

    Do not use:

    ```js
    SomeChartLibrary.chart("container", options);
    ```

25. Do not use fake shortcuts like:

    ```js
    btnRow.qa("button")
    ```

    Use:

    ```js
    btnRow.querySelectorAll("button")
    ```

26. For canvas, SVG, Three.js, charts, maps, and other rendered visuals, append only into a component element:

    ```js
    const container = ms.id("canvas-container");
    container.el.appendChild(renderer.domElement);
    ```

27. Do not size renderers from `window.innerWidth` or `window.innerHeight`.

28. Size canvas/chart/3D renderers from the component container and use `ResizeObserver`:

    ```js
    const container = ms.id("canvas-container");

    function resize() {
      const w = container.el.clientWidth || 1;
      const h = container.el.clientHeight || 1;
      renderer.setSize(w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container.el);
    resize();
    ```

29. For pointer or mouse coordinates, calculate from the component element rectangle, not the whole window:

    ```js
    const rect = container.el.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    ```

30. For Three.js addons, use an import map and import by bare names:

    ```html
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    }
    </script>

    <script type="module">
      import * as THREE from "three";
      import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    </script>
    ```

31. Do not import Three.js addons directly from full CDN URLs if they internally import `"three"`.

32. Prefer module scripts for MS component logic. If a third-party library is needed, use the library's real ES module build:

    ```html
    <script type="module">
      import SomeLibrary from "https://example.com/library/esm/library.js";
    </script>
    ```

    Do not load a classic/global library URL as `type="module"` unless the library documentation says that URL is an ES module.

33. For chart/map/3D/render libraries, pass MS component elements with `.el`, not string IDs:

    ```js
    const container = ms.id("container").el;
    SomeLibrary.chart(container, options);
    ```

34. Lifecycle functions should be normal top-level functions inside the component module script:

    ```js
    function onLoad(args) {}
    function onShow() {}
    function onBeforeHide() { return true; }
    function onHide() {}
    function onClose() {}
    function onFocus() {}
    function onLostFocus() {}
    ```

    `export` is optional. Generated components should prefer the simpler form above.
    Declare each lifecycle function name only once.
    A function may have the same name as the component filename; that name has no lifecycle meaning. Only `onLoad(args)` is constructor-like.

35. Public functions listed in `<ms-public>` should also be normal top-level functions:

    ```html
    <ms-public>
      <functions>resetScene, loadData</functions>
    </ms-public>
    ```

    ```js
    function resetScene() {
      ...
    }
    ```

    Do not put lifecycle or public functions inside `if` blocks, callbacks, classes, or nested functions.

    MS matches names in `<functions>` and `<classes>` case-insensitively, but generated code should still use exact spelling for readability:

    ```html
    <ms-public>
      <functions>SetVal</functions>
    </ms-public>
    ```

    ```js
    function SetVal(value) {
      ...
    }
    ```

    Do not define two public names that differ only by case in the same component or its linked scripts:

    ```js
    function setVal() {}
    function SetVal() {} // invalid in MS public API
    ```

36. New MS components should keep MS logic in module scripts. Avoid mixing classic scripts and module scripts for component lifecycle or public API code.

37. If a classic/global third-party library is needed, reading it from `window` is OK:

    ```js
    const Highcharts = window.Highcharts;
    Highcharts.chart(ms.id("container").el, options);
    ```

    Do not store component state or public functions on `window`, and do not pass string IDs to the library.

38. Do not rely on `window.someFunction` as the MS public API.

39. Do not expose API functions by assigning them to the root element.

40. If a function must be called from outside, it must be available through MS:

    ```js
    const ref = await ms.inject("MyComp", "targetDiv");
    ref.resetScene();
    ```

    Returned component refs tolerate casing for public functions, classes, and element IDs, but generated code should still use the exact declared names:

    ```js
    ref.SetVal("abc");      // preferred
    ref.SETVAL("abc");      // tolerated by MS
    ref.txtAge.value;       // preferred
    ref.TXTAGE.value;       // tolerated by MS
    ```

41. Prefer root/container events over global `window` or `document` events.

42. For keyboard events, prefer root-level keyboard handling:

    ```js
    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", handler);
    ```

43. If global `window` or `document` events are truly needed, store the handler and remove it in cleanup.

44. For timers, intervals, animations, observers, WebGL, Three.js, and global events, provide cleanup with `onClose()`.

45. Cleanup examples:

    ```js
    clearInterval(timerId);
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    renderer.dispose();
    window.removeEventListener("resize", resizeHandler);
    ```

46. Do not add long prefixes to IDs only to avoid other components. Keep IDs simple and unique inside this component only.

47. The same function, class, and variable names may exist in other MS components. Do not add unnecessary prefixes only to avoid other components.

48. Do not use `iframe`, `eval`, `new Function`, `document.write`, or `document.currentScript`.

49. Do not use global CSS or JS tricks that depend on the whole page.

50. Keep JavaScript simple and readable.

51. Highlight MS usage clearly. Prefer obvious MS patterns over complex generic browser patterns.

52. Use short comments only where they help explain MS-specific behavior.

53. For AI-generated 3D/chart/visual components, the first visible screen must be the real working component, not a landing page or explanation page.

54. When using `ms.layout()`, direct layout refs are slot/container refs. Use them when injecting more components into a layout region:

    ```js
    const layout = ms.layout();

    layout.header.text = "ERP Dashboard";
    layout.header.textStyle = { color: "white", fontWeight: "600" };
    layout.content.cardType = true;
    layout.header.src = "HeaderComp";
    layout.content.src = "GridComp";
    layout.footer.src = "FooterComp";

    const layoutRefs = await ms.insert(layout, "layoutHost");

    await ms.inject("SummaryCard", layoutRefs.content, { append: true });
    await ms.inject("AlertCard", layoutRefs.content, { append: true, top: true });
    ```

    Do not use `layoutRefs.slots.content` in new components.

    If code must call a public function on the component initially loaded into a slot, use `layoutRefs.components`:

    ```js
    layoutRefs.components.content.refreshData();
    ```

    `layoutRefs.content` means the content slot itself. `layoutRefs.components.content` means the component initially injected into that slot.

55. In `ms.layout()`, `slot.style` styles the slot/container. `slot.textStyle` styles text created by `slot.text`:

    ```js
    layout.header.style = {
      backgroundColor: "#0f172a",
      padding: "10px"
    };

    layout.header.text = "ERP Dashboard";
    layout.header.textStyle = {
      color: "white",
      fontWeight: "600"
    };
    ```

    `slot.text` may be used together with `slot.src`; MS shows the text and then injects the component into the same slot.

56. To allow GlobalConfig layout styling to override local layout styling, state `layout` in `<default-css>`:

    ```html
    <ms-public>
      <default-css>layout</default-css>
    </ms-public>
    ```

    If a layout has no local style, the configured layout CSS can apply automatically. If the layout has local `style`, `textStyle`, or `cardType` styling, GlobalConfig overrides it only when `layout` or `*` is listed in `<default-css>`. Empty `<default-css></default-css>` protects local layout styling from GlobalConfig override.

57. Use `ms.http` for application server calls. Do not put deployment server
    names, ports, authentication tokens, or raw business API origins inside a
    component:

    ```javascript
    const customers = await ms.http.get("/customers");
    const stock = await ms.http.get("Inventory", "/stock/1001");
    await ms.http.post("/customers", customer);
    ```

58. The first form uses the service assigned to the component by
    `HttpSettings.ComponentServices`. Name another configured service explicitly
    only when the component intentionally calls that service.

59. Use `try...catch` only when the component can recover or show its own
    business message. Leave an unrecoverable HTTP error unhandled so the MS error
    system can report it through `ErrorSettings`.

60. For a non-paged grid that receives main, relationship, and lookup tables in
    one response, use the same `dataJoin()` API:

    ```javascript
    const data = await ms.http.get("Inventory", "/itemsData");

    grid.data = ms.data(data.items);
    grid.dataJoin(data.itemsCountry, "id=itemId");
    countryCombo.data = ms.data(data.countries);
    ```

    `dataJoin()` supports one relationship per grid. Every relationship field
    except the joined key is collected into an array on the main record. The
    alternative two-endpoint form is:

    ```javascript
    grid.data = ms.data("Inventory", "/items");
    grid.dataJoin("Inventory", "/itemsCountry", "id=itemId");
    ```

61. A server-paged grid can receive its page rows, one relationship table, and
    combo lookup data in the same HTTP response:

    ```javascript
    grid.data = ms.data("Inventory", "/itemsDataGrid", "items");
    grid.dataJoin("itemsCountry", "id=itemId");
    countryCombo.data = ms.data("Inventory", "/itemsDataGrid", "countries", true);
    grid.comboFields.add(countryCombo);
    ```

    The third `ms.data()` argument selects a JSON response node. For combo data,
    the optional fourth Boolean is `true` when that node should be loaded only
    once; its default is `false`. `g.fields` is optional for object records.
    MS infers columns and combo display labels when it is omitted. All named
    fields are matched case-insensitively, and one HTTP response is used for
    each requested page.
