/* =========================================================
   🧩 BASE DOM REF
   ========================================================= */

export interface MSDomRef {
    el: Element;

    /**
   * ⚡ Attach event listener.
   *
   * Usage:
   * ms.id('btnSave').on('click', Save);
   * ms.id('btnSave').on('click', Save, 1, 2);
   *
   * @param {string} event
   * @param {Function} handler
   * @param {...any} args
   * @returns {MSDomRef}
   *
   * @example
   * ms.id('btn').on('click', Save);
   *
   * @example:
   * ms.id('btn').on('click', Save, 1, 2);
   */

    on(event: string, handler: Function, ...args: any[]): this;
    off(event: string, handler: Function): this;
}

type MSElement<T extends Element> = MSDomRef & T;

/* =========================================================
   🧠 CORE API
   ========================================================= */


/**
* 🧩 Component reference (returned by open / inject)
* Contains exported functions + element access via id.
*/
export type MSRef<T = any> = T & {
    ref: number;
    component: string;
};
export interface MS {

    /**
     * 🔥 Get element by id (universal resolver)
     * Works similar to JavaScript document.getElementById with extended support.
     *
     * Syntax :
     * 
     * ms.id(id: string).<property | method | event>
     *
     * @example
     * [1] ms.id('btnSave').onclick = Save;
     * [2] ms.id('btnSave').onclick = (e) => Save(e, 5, 10);
     * [3] ms.id('btnSave').on('click', Save, 5, 10);
     * [4] ms.id('txt').value = 'ABC';
     *
     * @param {string} id - Element id inside component or any instance
     * @returns {MSDomRef} Wrapped DOM element with full API
     *
     * Throws:
     * If element not found
     * If ms not ready
     *
     * Notes:
     * Searches active component first, then all instances.
     * May update CURRENT_SCREEN automatically.
     *
     * See:
     * ms.el.button
     * ms.q
     */
    id(id: string): MSElement<HTMLElement>;

    /**
     * 🧩 Typed element access helpers
     * Provides strongly-typed access to DOM elements using semantic shortcuts.
     * Ensures correct properties, methods, and events per element type.
     *
     * Works as a typed wrapper over ms.id() for improved IntelliSense and safety.
     *
     * Syntax :
     * 
     * ms.el.<element>(id: string).<property | method | event>
     *
     * @example:
     * [1] ms.el.button('btnSave').onclick = Save;
     * [2] ms.el.button('btnSave').onclick = (e) => Save(e, 5, 10);
     * [3] ms.el.button('btnSave').on('click', Save, 5, 10);
     * [4] ms.el.input('txt').value = 'ABC';
     *
     * @param {string} id - Element id inside component or any instance
     * @returns {MSDomRef} Wrapped DOM element with full API
     *
     * Throws:
     * If element not found
     * If ms not ready
     *
     * Notes:
     * Searches active component first, then all instances.
     * May update CURRENT_SCREEN automatically.
     *
     * See:
     * ms.el.button
     * ms.q
     */
    el: {

        /* =========================
           FORM & INPUT
        ========================= */

        button(id: string): MSElement<HTMLButtonElement>;
        input(id: string): MSElement<HTMLInputElement>;
        select(id: string): MSElement<HTMLSelectElement>;
        textarea(id: string): MSElement<HTMLTextAreaElement>;
        checkbox(id: string): MSElement<HTMLInputElement>;
        radio(id: string): MSElement<HTMLInputElement>;
        file(id: string): MSElement<HTMLInputElement>;
        password(id: string): MSElement<HTMLInputElement>;
        email(id: string): MSElement<HTMLInputElement>;
        number(id: string): MSElement<HTMLInputElement>;
        date(id: string): MSElement<HTMLInputElement>;
        time(id: string): MSElement<HTMLInputElement>;
        range(id: string): MSElement<HTMLInputElement>;
        color(id: string): MSElement<HTMLInputElement>;
        form(id: string): MSElement<HTMLFormElement>;
        label(id: string): MSElement<HTMLLabelElement>;
        fieldset(id: string): MSElement<HTMLFieldSetElement>;
        legend(id: string): MSElement<HTMLLegendElement>;
        output(id: string): MSElement<HTMLOutputElement>;

        /* =========================
           TEXT & CONTENT
        ========================= */

        div(id: string): MSElement<HTMLDivElement>;
        span(id: string): MSElement<HTMLSpanElement>;
        p(id: string): MSElement<HTMLParagraphElement>;
        h1(id: string): MSElement<HTMLHeadingElement>;
        h2(id: string): MSElement<HTMLHeadingElement>;
        h3(id: string): MSElement<HTMLHeadingElement>;
        h4(id: string): MSElement<HTMLHeadingElement>;
        h5(id: string): MSElement<HTMLHeadingElement>;
        h6(id: string): MSElement<HTMLHeadingElement>;
        strong(id: string): MSElement<HTMLElement>;
        em(id: string): MSElement<HTMLElement>;
        small(id: string): MSElement<HTMLElement>;
        mark(id: string): MSElement<HTMLElement>;
        timeTag(id: string): MSElement<HTMLTimeElement>;

        /* =========================
           MEDIA
        ========================= */

        img(id: string): MSElement<HTMLImageElement>;
        video(id: string): MSElement<HTMLVideoElement>;
        audio(id: string): MSElement<HTMLAudioElement>;
        canvas(id: string): MSElement<HTMLCanvasElement>;
        track(id: string): MSElement<HTMLTrackElement>;
        map(id: string): MSElement<HTMLMapElement>;
        area(id: string): MSElement<HTMLAreaElement>;

        /* =========================
           STRUCTURAL / LAYOUT
        ========================= */

        section(id: string): MSElement<HTMLElement>;
        article(id: string): MSElement<HTMLElement>;
        header(id: string): MSElement<HTMLElement>;
        footer(id: string): MSElement<HTMLElement>;
        nav(id: string): MSElement<HTMLElement>;
        main(id: string): MSElement<HTMLElement>;
        aside(id: string): MSElement<HTMLElement>;
        figure(id: string): MSElement<HTMLElement>;
        figcaption(id: string): MSElement<HTMLElement>;

        /* =========================
           LIST & TABLE
        ========================= */

        ul(id: string): MSElement<HTMLUListElement>;
        ol(id: string): MSElement<HTMLOListElement>;
        li(id: string): MSElement<HTMLLIElement>;

        table(id: string): MSElement<HTMLTableElement>;
        thead(id: string): MSElement<HTMLTableSectionElement>;
        tbody(id: string): MSElement<HTMLTableSectionElement>;
        tfoot(id: string): MSElement<HTMLTableSectionElement>;
        tr(id: string): MSElement<HTMLTableRowElement>;
        td(id: string): MSElement<HTMLTableCellElement>;
        th(id: string): MSElement<HTMLTableCellElement>;
        caption(id: string): MSElement<HTMLTableCaptionElement>;
        colgroup(id: string): MSElement<HTMLTableColElement>;
        col(id: string): MSElement<HTMLTableColElement>;

        /* =========================
           INTERACTIVE
        ========================= */

        a(id: string): MSElement<HTMLAnchorElement>;
        details(id: string): MSElement<HTMLDetailsElement>;
        summary(id: string): MSElement<HTMLElement>;
        dialog(id: string): MSElement<HTMLDialogElement>;
        iframe(id: string): MSElement<HTMLIFrameElement>;

        /* =========================
           META / UTILITY
        ========================= */

        progress(id: string): MSElement<HTMLProgressElement>;
        meter(id: string): MSElement<HTMLMeterElement>;

        /* =========================
           SVG
        ========================= */

        svg(id: string): MSElement<SVGElement>;

        /* =========================
           FALLBACK
        ========================= */

        custom(id: string): MSElement<HTMLElement>;
    };


    /**
    * ⚡ Call function of the event
    *
    * Syntax:
    * ms.call(fn, ...args)
    *
    * @example
    * ms.el.button('btnSave').onclick = ms.call(save, 10);
    *                          function Save (e, num) {..}
    */
    call(fn: Function, ...args: any[]): (e: Event) => any;


    /**
    * 🔍 Represents JavaScript QuerySelector
    *
    * Syntax :
    * 
    * await ms.q(..)
    *
    * @example
    * const screen = await ms.q('..');
    */
    q(selector: string): MSDomRef | null;


    /**
    * 🔍 Represents JavaScript QuerySelectorAll
    *
    * Syntax :
    * 
    * await ms.qa(..)
    *
    * @example
    * const screen = await ms.qa('..');
    */
    qa(selector: string): MSDomRef[];


    /**
    * 🚀 Open screen
    *
    * Syntax :
    * 
    * await ms.open(name)
    *
    * @example
    * const screen = await ms.open('Dashboard');
    * screen.loadData();
    */
    open(name: string): any;


   /**
   @remarks - 📦 Injects a graphical & functional component into container/s and returns reference to call methods inside component. 
   * 
   * Note : Component is just a HTML file (at the development time). This could have been linked with .JS, .MJS and .CSS Files.
   * Documentation:
   * https://manyset.com/docs/Component_Template
   * 
   * Possible container types:
   *
   * `div`, custom elements (e.g., `my-sales`), `section`, `article`, `figure`,
   * `main`, `aside`, `header`, `footer`, `nav`, `li`, `td`, `th`
   * 
   * @example
   * [1] const ref = await ms.inject('./sales/page1', 'div1'); // <div id='div1'></div>
   *     ref.calculateSale(1);
   * 
   * [2] await ms.inject('Cart', 'my-sales'); // <my-sales></my-sales>
   * 
   * [3] await ms.inject('Cart', ms.id('div1'));
   * 
   * [4] let product_ref1 = ms.inject('Product1', 'DivA', {append:true, top:false}); 
   * 
   * [5] Deep Injection :
   * 
   *     Here at component A, we inject B into A's DivA and again inject C into B's DivB
   *     let b = ms.inject('B', 'DivA');  
   *     let c = ms.inject('C', b.divB); 
   *     // Here, 'divB' belongs to comp B. 
   * 
   * Documentation:
   * https://manyset.com/docs/inject
   * 
   * @param component - Component name or path (HTML file or registered component) or raw HTML
   * @param container - Container id or an MSDomRef where the component will be injected
   * @param append - If true, append instead of replacing content
   * @param top - If true, insert at the top
   * @returns Reference to the injected component (type depends on component)
   */
    inject(component: string, container: string | MSDomRef,
        options?: { append?: boolean, top?: boolean }): any;
    // exactly keep above format, because it helps to auto type..


    /**
    * 📦📦 Inject multiple components
    * 
    * Injects a set of components parallelly into containers. 
    * 
    * Note : Component is a HTML file linked with .JS, .MJS and .css files.
    * 
    * Syntax :
    * 
    * const [a, b, ..] = await ms.injectMany( [component_1, container_1],  
    * [component_2, container_2, {append:true, top:false}], ..)
    *
    * Possible container types:
    *
    * `div`, custom elements (e.g., `my-sales`), `section`, `article`, `figure`,
    * `main`, `aside`, `header`, `footer`, `nav`, `li`, `td`, `th`
    * 
    * @example
    * const [a, b] = await ms.injectMany(
    *   ['Page1', 'div1'],
    *   ['Page2', 'div2']);
    * 
    * Documentation:
    * https://manyset.com/docs/injectMany
    */
    injectMany(
        ...items: [
            component: string,
            container: string | MSDomRef,
            options?: { append?: boolean, top?: boolean; }
        ][]
    ): any;


    /**
    * ⚡ Preloads a set of components parallely & faster. No Order. Suited for 2-6 components. 
    *
    * Syntax :
    * 
    * ms.preload('component1', 'component2', ..); 
    *
    * @example
    * let ref = await ms.preload('page1', 'page2', 'page3', ..);  
    */
    preload(...names: string[]): Promise<any>;


    /**
    * 📥 Preloads any large set of components sequentially (one by one). 
    *
    * Syntax :
    * 
    * ms.preloadQueue('A', 'B', ..); 
    *
    * @example
    * let ref = await ms.preloadQueue('A', 'B', 'C');  
    */
    preloadQueue(...names: string[]): void;


    /**
    * 📊 Indicates the state of a component whether it is has been started loading (=0), loading(=1) or loaded(=2). 
    *
    * Syntax :
    * 
    * let stat = ms.loadState('component'); 
    *
    * @example
    * let ref = await ms.loadState('Page1');  
    */
    loadState(name: string): number;


    /**
    * ⏳ Waits until ms engine ready. 
    *
    * Syntax :
    * 
    * await ms.ready(); 
    *
    * @example
    * await ms.ready();  
    */
    ready(): Promise<any>;


    /**
    * 🛑 Stops the execution of program logic. 
    *
    * Syntax :
    * 
    * await ms.stop(); 
    *
    * @example
    * await ms.stop();  
    */
    stop(): Promise<void>;


    /**
    * 📦 Picks values or fields from API data for grids, combos, inputs, labels,
    * and other controls.
    *
    * Syntax:
    *
    * ms.data(source)
    * ms.data(source, "field")
    * ms.data(source, "field1", "field2", ...)
    * ms.data("Service", "/endpoint", "rowsField", true)
    *
    * @example
    * grid.data = data;
    * grid.data = ms.data(data, "id", "name", "quantity");
    * combo.data = ms.data(data, "id", "name");
    * txtName.value = ms.data(customer, "name");
    * grid.data = ms.data("Inventory", "/itemsDataGrid", "items");
    */
    data(service: string, endpoint: string, rowsField?: string, loadOnce?: boolean): any;
    data(source: any, ...fields: string[]): any;


    /**
    * 🚫 Stops execution of current inbuilt error handling & error popup system. 
    *
    * Syntax :
    * 
    * await ms.ErrorClose(); 
    *
    * @example
    * await ms.ErrorClose();  
    */
    ErrorClose(): void;


    /**
    * 💾🔍 Store or Retrieve any value globally. 
    *
    * Syntax :
    * 
    * await ms.store.get(..)  
    * await ms.store.set(..) 
    *
    * @example
    * const session = ms.store.get('auth.session');
    */
    store: {
        transaction(cb: Function): Promise<any>;
        set(path: string, value: any): any;
        get(path: string): any;
        on(path: string, fn: Function): any;
        off(path: string, fn: Function): any;
    };

    db: any;
}

declare const ms: MS;
export default ms;
