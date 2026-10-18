// =========================================================
// MS FORM MODULE TYPES (Module Augmentation)
// =========================================================

import ms from "./ms.js";

declare module "./ms.js" {

  // =====================================================
  // Extend core MS interface
  // =====================================================

  interface MS {
    form: {
      /**
       * Create a new Grid instance
       */
      grid(): GridInstance;

      // future modules
      combo?: () => ComboInstance;
      autofill?: () => any;
    };
  }

  // =====================================================
  // FIELD DEFINITIONS (SCHEMA-FIRST DESIGN)
  // =====================================================

  /**
   * Recommended field definition (key-based schema)
   *
   * ✔ Example:
   * [
   *   { key: "Id", label: "ID.." },
   *   { key: "Name", label: "Name.." }
   * ]
   *
   * ⚠ Avoid:
   * ["Id", "Name"]  // index-based (fragile)
   */
  interface GridField {
    key: string;
    label?: string;
  }

  /**
   * Legacy support (index-based fields)
   * Not recommended for production usage
   */
  type GridFieldInput = string | GridField;

  // =====================================================
  // EDIT FIELD DSL
  // =====================================================

  /**
   * Field-level editing + validation configuration
   *
   * Keys MUST match fields[].key
   *
   * Example:
   * {
   *   Name: "text(30)",
   *   Weight: "decimal(10.5-80.5)",
   *   Age: "int(20-80)",
   *   Date: "date(01/01/20-31/12/25) optional"
   * }
   */
  type EditFieldConfig = {
    [field: string]: string;
  };

  // =====================================================
  // RECORD TYPE
  // =====================================================

  /**
   * Logical row representation (key-based access)
   */
  type GridRecord = Record<string, any>;

  interface ComboInstance {
    data: any;
    keyField?: string;
    textField?: string;
    multiSelect?: boolean;
    value: any;
  }

  // =====================================================
  // EVENT CONTEXTS
  // =====================================================

  interface GridTextLeaveContext {
    rowIndex: number;
    field: string;
    value: any;
    record: GridRecord;
    grid: GridInstance;
  }

  interface GridUpdateContext {
    rowIndex: number;
    data: any[];
    record: GridRecord;
    grid: GridInstance;
  }

  // =====================================================
  // GRID INSTANCE
  // =====================================================

  interface GridInstance {

    // -------------------------
    // BASIC CONFIG
    // -------------------------

    /**
     * Grid title
     */
    title?: string;

    /**
     * Defines grid schema (preferred: key-based)
     */
    fields?: GridFieldInput[];

    /**
     * Data rows
     *
     * ⚠ Must align with fields order OR internally mapped using keys
     *
     * ✔ Example:
     * [
     *   [1, "Car", 200],
     *   [2, "Van", 300]
     * ]
     *
     * g.data = [
     *   { Id: 1, Name: "A", Weight: 40.5, Age: 21, Total: 0, Date: "13/12/20" },
     *   { Id: 2, Name: "John", Weight: 50.6, Age: 22, Total: 0, Date: "13/12/20" }
     *   ]
     * 
     * 👉 Use value()/setValue() instead of direct index access
     */
    data: any;

    /** Add a local, separate-endpoint, or same-response relationship dataset. */
    dataJoin(source: any, relation: string): GridInstance;
    dataJoin(service: string, endpoint: string, relation: string): GridInstance;

    /** Attach a combo to its detected key field. */
    comboFields: Array<any> & {
      add(combo: any): any;
    };

    /** Reload the current server page. */
    refresh(options?: { reloadOnce?: boolean }): Promise<any[]>;

    // -------------------------
    // MODES
    // -------------------------

    multiSelect?: boolean;

    /**
     * Enables editing for all rows (no Edit button required)
     */
    bulkEdit?: boolean;

    /**
     * Edit mode behavior (engine-specific)
     */
    editModel?: number;

    // -------------------------
    // UI LABELS
    // -------------------------

    editLabel?: string;
    updateLabel?: string;

    // -------------------------
    // EDIT CONFIG
    // -------------------------

    editFields?: EditFieldConfig;

    // -------------------------
    // EVENTS
    // -------------------------

    /**
     * Triggered when user leaves a textbox (after validation)
     */
    onTextLeave?: (ctx: GridTextLeaveContext) => void;

    /**
     * Triggered on update action
     *
     * Return:
     * ✔ true OR { ok:true } → close edit mode
     * ❌ false → stay in edit mode
     */
    onUpdate?: (
      ctx: GridUpdateContext
    ) =>
      | boolean
      | { ok: boolean }
      | Promise<boolean | { ok: boolean }>;

    // -------------------------
    // LIFECYCLE
    // -------------------------

    mount(el: HTMLElement | any): void;

    // -------------------------
    // SELECTION
    // -------------------------

    /**
     * Returns selected row indexes
     */
    selectedRows(): number[];

    // -------------------------
    // VALUE ACCESS (UNIFORM API)
    // -------------------------

    /**
     * Get value from grid
     *
     * ✔ Recommended:
     * value(row, "Weight")
     *
     * ⚠ Avoid:
     * value(row, 2) (index fragile)
     *
     * Must return current visible value:
     * - textbox → input.value
     * - normal cell → cell value
     */
    value(row: number, field: string | number): any;

    /**
     * Set value into grid
     *
     * ✔ Updates:
     * - internal data
     * - UI (textbox or cell)
     *
     * ✔ Example:
     * setValue(row, "Total", 100)
     */
    setValue(row: number, field: string | number, value: any): void;

    // -------------------------
    // DATA HELPERS
    // -------------------------

    /**
     * Returns row as object (key-based)
     */
    record(row: number): GridRecord;

    /**
     * Returns raw row (array)
     */
    row(row: number): any[];

    /**
     * Update entire row using object
     */
    updateFromRecord(row: number, record: GridRecord): void;
  }
}
