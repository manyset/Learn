/**
 * @license ManySet
 * form.js
 *
 * Copyright (c) ManySet, Inc. and its affiliates.
 *
 * This source code is licensed under the Commercial Developer license found in the
 * LICENSE file in the root directory of this source tree.
 */


/* =========================================================
   FORM.JS 1.5 Original MODULE — CLEAN STABLE VERSION
   ========================================================= */


const ComboModule = {};
const GridModule = {};
const AutoFillModule = {};
const SectionModule = {};
const InputModule = {};
const CheckboxModule = {};
const RadioModule = {};
const ButtonModule = {};
const ButtonsModule = {};
const ImageModule = {};

const __MS_REMOTE_DATA_SOURCE__ = Symbol.for('ms.remoteDataSource');

function __ms_form_remote_data_source(value) {
  return value && typeof value === 'object'
    ? value[__MS_REMOTE_DATA_SOURCE__] || null
    : null;
}

function __ms_form_same_remote_data_source(left, right) {
  return !!left && !!right &&
    String(left.service).toLowerCase() === String(right.service).toLowerCase() &&
    left.url === right.url &&
    left.ownerInstance === right.ownerInstance;
}

function __ms_form_data_field(record, requested, context) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(record, requested)) {
    return requested;
  }

  const wanted = String(requested).toLowerCase();
  const matches = Object.keys(record)
    .filter(key => key.toLowerCase() === wanted);

  if (matches.length > 1) {
    throw new Error(`${context}: ambiguous field ${requested}`);
  }

  return matches[0] || null;
}

function __ms_form_data_join_key(value) {
  if (value == null) return null;

  if (typeof value === 'object') {
    throw new Error('ms.form.grid.dataJoin: join values must be scalar');
  }

  return String(value).trim();
}

function __ms_form_parse_data_join(expression) {
  const parts = String(expression || '')
    .split('=')
    .map(value => value.trim());

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      'ms.form.grid.dataJoin: relation must use "mainField=joinedField"'
    );
  }

  return {
    mainField: parts[0],
    joinedField: parts[1]
  };
}

const __MS_STYLE_CACHE__ = new Map();
const __MS_LOADED_CSS_PATHS__ = new Set();
let __MS_FORM_SCOPE_SEQ__ = 0;
const __MS_FORM_STYLE_ATTRS__ = [
  'data-ms',
  'data-ms-control-css',
  'data-ms-label-css',
  'data-ms-section-part-css'
];

function __ms_form_preserve_host_styles(root) {
  if (!root?.children) return [];

  const styles = [];
  for (const child of Array.from(root.children)) {
    if (child.tagName !== 'STYLE') continue;
    if (!__MS_FORM_STYLE_ATTRS__.some(attr => child.hasAttribute(attr))) continue;

    styles.push(child);
    child.remove();
  }

  return styles;
}

function __ms_form_restore_host_styles(root, styles) {
  if (!root || !styles?.length) return;

  for (const style of styles) {
    root.appendChild(style);
  }
}


/* ======================= STYLE SYSTEM ======================= */

ms.style = ms.style || {};

/**
 * Inject CSS into component safely (engine-compatible)
 */
ms.style.inject = async function (target, cssPath, theme) {

  if (!cssPath) return;

  let el;

  if (typeof target === 'string') {
    el = ms.id(target);
  }
  else if (target && target.el) {
    el = target.el;
  }
  else if (target instanceof HTMLElement) {
    el = target;
  }
  else {
    el = target;
  }

  if (!el) {
    console.warn('ms.style.inject: element not found →', target);
    return;
  }

  let css;

  if (__MS_STYLE_CACHE__.has(cssPath)) {
    css = __MS_STYLE_CACHE__.get(cssPath);
  } else {
    const r = await fetch(cssPath);
    css = await r.text();
    __MS_STYLE_CACHE__.set(cssPath, css);
  }

  let old = el.querySelector('style[data-ms]');
  if (old && old.getAttribute('data-path') === cssPath) {
    return; // already applied
  }
  if (old) old.remove();

  const style = document.createElement('style');
  style.setAttribute('data-ms', '1');
  style.setAttribute('data-path', cssPath);

  let scope;

  if (el.id) {
    scope = `[data-ms-id="${el.id}"]`;
  }
  else {
    scope = el.tagName.toLowerCase();
  }

  style.textContent = css
    .replaceAll('mscombo', scope)
    .replaceAll('msgrid', scope)
    .replaceAll('mssection', scope)
    .replaceAll('[data-ms-alias="mscombo"]', scope)
    .replaceAll('[data-ms-alias="msgrid"]', scope)
    .replaceAll('[data-ms-alias="mssection"]', scope);

  el.prepend(style);

  if (theme) el.classList.add(theme);

};

async function __ms_preload_css(path) {

  if (!path) return;

  if (__MS_LOADED_CSS_PATHS__.has(path)) return;

  let css;

  if (__MS_STYLE_CACHE__.has(path)) {
    css = __MS_STYLE_CACHE__.get(path);
  } else {
    const r = await fetch(path);
    css = await r.text();
    __MS_STYLE_CACHE__.set(path, css);
  }

  // inject once globally
  const style = document.createElement('style');
  style.setAttribute('data-ms-global', '1');
  style.textContent = css;
  document.head.appendChild(style);

  __MS_LOADED_CSS_PATHS__.add(path);
}


/* ======================= FORM ======================= */

ms.form = ms.form || {};
Object.assign(ms.form, {

  autoFill: async function (url, styleMap) {
    return AutoFillModule.autoFill.call(this, url, styleMap);
  },

  combo: function (cfg) {

    const c = ComboModule.createCombo(null, cfg || {});

    c.mount = function (el) {

      this._el = el?.el || el;

      if (this._el && this._el.id) {
        this._el.setAttribute('data-ms-id', this._el.id);
      }


      this._el.setAttribute('data-ms-alias', 'mscombo');

      if (!this._id && this._el && this._el.id) {
        this._id = this._el.id;
      }

      this.render();
      this.applyDefaultStyle();
    };

    return c;
  },

  grid: function () {
    return GridModule.create();
  },

  section: function (cfg) {
    return SectionModule.create(cfg || {});
  },

  input: function (cfg) {
    return InputModule.create(cfg || {});
  },

  checkbox: function (cfg) {
    return CheckboxModule.create(cfg || {});
  },

  radio: function (cfg) {
    return RadioModule.create(cfg || {});
  },

  button: function (cfg) {
    return ButtonModule.create(cfg || {});
  },

  buttons: function (cfg) {
    return ButtonsModule.create(cfg || {});
  },

  image: function (cfg) {
    return ImageModule.create(cfg || {});
  }

});

/* ========== SECTION / INPUT MODULES ========================= */

function __ms_form_to_camel(text) {
  const words = String(text || '')
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (!words.length) return '';

  return words
    .map((word, index) => {
      const lower = word.charAt(0).toLowerCase() + word.slice(1);
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function __ms_form_control_key(control) {
  if (!control) return null;

  if (control.name) return String(control.name).trim();
  if (control.field) return String(control.field).trim();
  if (control.id) return String(control.id).trim();

  if (control.__msFormKind === 'buttons' && !control.label) {
    return null;
  }

  return __ms_form_to_camel(control.label || control.text || '');
}

function __ms_form_prepare_section_mount_target(root) {
  if (!root?.style) return;

  root.style.containerType = 'inline-size';
  if (!root.style.display) root.style.display = 'block';

  const host = root.getRootNode?.()?.host;
  if (!(host instanceof HTMLElement)) return;

  const parent = host.parentElement;
  if (!parent) return;

  const parentDisplay = getComputedStyle(parent).display;
  if (parentDisplay !== 'flex' && parentDisplay !== 'inline-flex') return;

  if (!host.style.flex) host.style.flex = '1 1 auto';
  if (!host.style.minWidth) host.style.minWidth = '0';
}

function __ms_form_apply_style(el, style) {
  if (!el || !style) return;

  if (typeof style === 'string') {
    if (__ms_form_style_css_path(style)) return;
    el.style.cssText += ';' + style;
    return;
  }

  if (typeof style === 'object') {
    Object.entries(style).forEach(([key, value]) => {
      if (value != null) el.style[key] = value;
    });
  }
}

function __ms_form_style_css_path(style) {
  if (typeof style !== 'string') return null;

  const text = style.trim();
  if (!text) return null;

  if (/^https?:\/\/.+\.css(?:[?#].*)?$/i.test(text)) return text;
  if (/^\.{0,2}\//.test(text) && /\.css(?:[?#].*)?$/i.test(text)) return text;
  if (/^[^:;{}]+\.css(?:[?#].*)?$/i.test(text)) return text;

  return null;
}

function __ms_form_inline_style(style) {
  return __ms_form_style_css_path(style) ? null : style;
}

function __ms_form_apply_message_style(el, style) {
  if (!style) return;

  if (typeof style === 'string' && !style.includes(':')) {
    el.classList.add(style);
    return;
  }

  __ms_form_apply_style(el, style);
}

function __ms_form_px(value, fallback) {
  if (value == null || value === '') return fallback;
  return typeof value === 'number' ? `${value}px` : String(value);
}

function __ms_form_default_css_entries() {
  const cfg = window.MS_CONFIG || {};
  const entries =
    cfg.DefaultCSS ||
    cfg.defaultCSS ||
    cfg['Default-CSS'] ||
    cfg['default-css'];

  return entries && typeof entries === 'object' && !Array.isArray(entries)
    ? entries
    : {};
}

function __ms_form_default_css_url(name) {
  const engine = typeof ms !== 'undefined' ? ms : null;

  if (typeof engine?.__defaultCssUrl === 'function') {
    const fromEngine = engine.__defaultCssUrl(name);
    if (fromEngine) return fromEngine;
  }

  const wanted = String(name || '').trim().toLowerCase();

  for (const [key, value] of Object.entries(__ms_form_default_css_entries())) {
    if (String(key || '').trim().toLowerCase() === wanted) {
      return value;
    }
  }

  return null;
}

function __ms_form_default_or_legacy_css_url(name, legacyName) {
  const cfg = window.MS_CONFIG || {};
  return __ms_form_default_css_url(name) || cfg[legacyName] || null;
}

function __ms_form_default_css_policy() {
  const engine = typeof ms !== 'undefined' ? ms : null;

  if (typeof engine?.__defaultCssPolicy === 'function') {
    return engine.__defaultCssPolicy();
  }

  return undefined;
}

function __ms_form_owner_policy(owner) {
  if (owner && Object.prototype.hasOwnProperty.call(owner, '__msDefaultCssPolicy')) {
    return owner.__msDefaultCssPolicy;
  }

  return __ms_form_default_css_policy();
}

function __ms_form_policy_allows(policy, name) {
  if (!Array.isArray(policy)) return true;
  if (!policy.length) return false;
  if (policy.some(x => String(x || '').trim().toLowerCase() === '*')) return true;

  const engine = typeof ms !== 'undefined' ? ms : null;
  if (typeof engine?.__defaultCssKeysMatch === 'function') {
    return policy.some(x => engine.__defaultCssKeysMatch(x, name));
  }

  return policy.some(x => String(x || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
}

function __ms_form_policy_disabled(policy) {
  return Array.isArray(policy) && policy.length === 0;
}

function __ms_form_default_css_overrides_local(name, owner) {
  if (!name) return false;
  const policy = __ms_form_owner_policy(owner);
  return Array.isArray(policy) && __ms_form_policy_allows(policy, name);
}

function __ms_form_default_css_allowed(name, owner) {
  if (!name) return false;
  const policy = __ms_form_owner_policy(owner);
  if (policy !== undefined) return __ms_form_policy_allows(policy, name);

  const engine = typeof ms !== 'undefined' ? ms : null;

  if (typeof engine?.__defaultCssAllowed === 'function') {
    return engine.__defaultCssAllowed(name);
  }

  return true;
}

function __ms_form_default_css_disabled(owner) {
  const policy = __ms_form_owner_policy(owner);
  if (policy !== undefined) return __ms_form_policy_disabled(policy);

  const engine = typeof ms !== 'undefined' ? ms : null;

  if (typeof engine?.__defaultCssDisabled === 'function') {
    return engine.__defaultCssDisabled();
  }

  return false;
}

function __ms_form_default_css_for_control(name, hasLocalStyle, owner) {
  if (!name || __ms_form_default_css_disabled(owner)) return null;
  const url = __ms_form_default_css_url(name);
  if (!url) return null;

  if (!hasLocalStyle) return url;

  return __ms_form_default_css_overrides_local(name, owner)
    ? url
    : null;
}

function __ms_form_control_css_key(control) {
  if (!control) return '';

  if (control.__msFormKind === 'combo') return 'combo';
  if (control.__msFormKind === 'input') return 'input';
  if (control.__msFormKind === 'button') return 'button';
  if (control.__msFormKind === 'buttons') return 'button';
  if (control.__msFormKind === 'checkbox') return 'input';
  if (control.__msFormKind === 'radio') return 'input';
  if (control.__msFormKind === 'image') return 'image';
  if (control.__msFormKind === 'grid') return 'grid';
  if (control.__msFormKind === 'section') return 'section';
  if (control._selected instanceof Set && Array.isArray(control._items)) return 'combo';
  if (Array.isArray(control._fields) || Array.isArray(control.fields)) return 'grid';
  if (typeof control.mount === 'function') return 'grid';

  return '';
}

function __ms_form_selector_for_css(control, cell) {
  const field = cell?.dataset?.field || __ms_form_control_key(control) || '';
  const safe = globalThis.CSS?.escape
    ? CSS.escape(field)
    : String(field).replace(/([^\w-])/g, '\\$1');

  if (cell?.classList?.contains('ms-section-button-scope')) {
    return `.ms-section-button-scope[data-field="${safe}"]`;
  }

  return `[data-field="${safe}"]`;
}

function __ms_form_scope_selector_for_host(el) {
  if (!el) return '';

  const id = el.getAttribute?.('data-ms-id') || el.id;
  if (id) {
    const safe = globalThis.CSS?.escape
      ? CSS.escape(id)
      : String(id).replace(/([^\w-])/g, '\\$1');
    return `[data-ms-id="${safe}"]`;
  }

  const field = el.dataset?.field;
  if (field) {
    const safe = globalThis.CSS?.escape
      ? CSS.escape(field)
      : String(field).replace(/([^\w-])/g, '\\$1');
    return `[data-field="${safe}"]`;
  }

  const scope = el.dataset.msFormScope || `ms-form-scope-${++__MS_FORM_SCOPE_SEQ__}`;
  el.dataset.msFormScope = scope;
  return `[data-ms-form-scope="${scope}"]`;
}

function __ms_form_prefix_css(css, scopeSelector, tagName) {
  const text = String(css || '');
  const tag = String(tagName || '').toLowerCase();
  const tagMatcher = tag
    ? new RegExp(`(^|[\\s>+~,(])${tag}(?=$|[\\s.#:\\[>+~,)])`, 'ig')
    : null;
  const msAliasTagStart = /^(mscombo|msgrid|mssection)(?=$|[\s.#:\[>+~,)])/i;
  const msAliasAttrStart = /^\[data-ms-alias\s*=\s*(['"]?)(mscombo|msgrid|mssection)\1\s*\](?=$|[\s.#:\[>+~,)])/i;

  return text.replace(/([^{}@][^{}]*)\{/g, (full, selectorText) => {
    const selectors = selectorText
      .split(',')
      .map(sel => sel.trim())
      .filter(Boolean)
      .map(sel => {
        if (msAliasTagStart.test(sel)) {
          return sel.replace(msAliasTagStart, scopeSelector);
        }

        if (msAliasAttrStart.test(sel)) {
          return sel.replace(msAliasAttrStart, scopeSelector);
        }

        if (tagMatcher?.test(sel)) {
          tagMatcher.lastIndex = 0;
          return sel.replace(tagMatcher, `$1${scopeSelector} ${tag}`);
        }

        tagMatcher && (tagMatcher.lastIndex = 0);
        return `${scopeSelector} ${sel}`;
      });

    return selectors.length ? `${selectors.join(', ')} {` : full;
  });
}

function __ms_form_prefix_label_css(css, labelSelector) {
  const text = String(css || '');
  const labelMatcher = /(^|[\s>+~,(])label(?=$|[\s.#:\[>+~,)])|\.ms-section-label|\.ms-input-label|\[data-ms-form-label\]/i;
  const out = [];
  const ruleRe = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let match;

  while ((match = ruleRe.exec(text))) {
    const selectorText = match[1];
    const body = match[2];
    const selectors = selectorText
      .split(',')
      .map(sel => sel.trim())
      .filter(Boolean)
      .filter(sel => labelMatcher.test(sel));

    if (selectors.length) {
      out.push(`${labelSelector} {${body}}`);
    }
  }

  return out.join('\n');
}

async function __ms_form_apply_css_file(section, control, cell, cssPath, tagName) {
  if (!cssPath || (!section?._el && !cell)) return false;

  const field = cell?.dataset?.field || __ms_form_control_key(control) || __ms_form_control_css_key(control);
  if (cell && !cell.dataset.field && field) {
    cell.dataset.field = field;
  }

  const pathKey = String(cssPath);
  const styleKey = `${field}:${pathKey}`;
  const rootNode = section?._el || cell.getRootNode?.() || document;
  const styleHost = section?._el || (rootNode instanceof ShadowRoot ? rootNode : document.head);

  styleHost.__msFormControlCssKeys = styleHost.__msFormControlCssKeys || new Set();
  if (styleHost.__msFormControlCssKeys.has(styleKey)) return true;
  styleHost.__msFormControlCssKeys.add(styleKey);

  try {
    const r = await fetch(cssPath);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const css = await r.text();
    const style = document.createElement('style');
    style.setAttribute('data-ms-control-css', field);
    style.setAttribute('data-path', pathKey);
    style.textContent = __ms_form_prefix_css(css, __ms_form_selector_for_css(control, cell), tagName);
    styleHost.appendChild(style);
    return true;
  } catch (e) {
    styleHost.__msFormControlCssKeys.delete(styleKey);
    console.warn('ms.form control css failed:', cssPath, e?.message || e);
    return false;
  }
}

async function __ms_form_apply_label_css_file(section, control, label, cssPath) {
  if (!section?._el || !label || !cssPath) return false;

  const field = __ms_form_control_key(control) || '';
  const pathKey = String(cssPath);
  const styleKey = `label:${field}:${pathKey}`;
  section._labelCssKeys = section._labelCssKeys || new Set();
  if (section._labelCssKeys.has(styleKey)) return true;
  section._labelCssKeys.add(styleKey);

  try {
    const r = await fetch(cssPath);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const css = await r.text();
    const safe = globalThis.CSS?.escape
      ? CSS.escape(field)
      : String(field).replace(/([^\w-])/g, '\\$1');
    const text = __ms_form_prefix_label_css(css, `[data-ms-form-label-field="${safe}"]`);
    if (!text.trim()) {
      section._labelCssKeys.delete(styleKey);
      return false;
    }

    const style = document.createElement('style');
    style.setAttribute('data-ms-label-css', field);
    style.setAttribute('data-path', pathKey);
    style.textContent = text;
    section._el.appendChild(style);
    return true;
  } catch (e) {
    section._labelCssKeys.delete(styleKey);
    console.warn('ms.form label css failed:', cssPath, e?.message || e);
    return false;
  }
}

async function __ms_form_apply_section_part_css(section, key, cssPath, scopeSelector, tagName) {
  if (!section?._el || !cssPath || !key) return false;

  const pathKey = String(cssPath);
  const styleKey = `${key}:${pathKey}`;
  section._sectionCssKeys = section._sectionCssKeys || new Set();
  if (section._sectionCssKeys.has(styleKey)) return true;
  section._sectionCssKeys.add(styleKey);

  try {
    const r = await fetch(cssPath);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const css = await r.text();
    const style = document.createElement('style');
    style.setAttribute('data-ms-section-part-css', key);
    style.setAttribute('data-path', pathKey);
    style.textContent = __ms_form_prefix_css(css, scopeSelector, tagName);
    section._el.appendChild(style);
    return true;
  } catch (e) {
    section._sectionCssKeys.delete(styleKey);
    console.warn('ms.form section css failed:', cssPath, e?.message || e);
    return false;
  }
}

function __ms_form_apply_control_label_style(section, control, label) {
  if (!control || !label) return;

  const labelStyle = control.labelStyle ?? control.LabelStyle;
  const labelStyleCssPath = __ms_form_style_css_path(labelStyle);
  const controlStyleCssPath = __ms_form_style_css_path(control.style);
  const labelInlineStyle = __ms_form_inline_style(labelStyle);
  const localCssPath =
    control.labelCss ??
    control.LabelCSS ??
    labelStyleCssPath ??
    controlStyleCssPath ??
    control.css ??
    control.CSS;
  const cssKey = __ms_form_control_css_key(control);
  const defaultCss = __ms_form_default_css_for_control(cssKey, !!labelInlineStyle || !!localCssPath, control);

  if (labelInlineStyle) {
    __ms_form_apply_style(label, labelInlineStyle);
  }

  if (localCssPath) {
    (async () => {
      if (defaultCss && defaultCss !== localCssPath) {
        const applied = await __ms_form_apply_label_css_file(section, control, label, defaultCss);
        if (!applied) {
          await __ms_form_apply_label_css_file(section, control, label, localCssPath);
        }
        return;
      }

      await __ms_form_apply_label_css_file(section, control, label, localCssPath);
    })();
    return;
  }

  if (defaultCss) {
    __ms_form_apply_label_css_file(section, control, label, defaultCss);
  }
}

function __ms_form_apply_control_style(section, control, el, cell, tagName) {
  if (!control || !el) return;

  const styleCssPath = __ms_form_style_css_path(control.style);
  const cssPath = styleCssPath ?? control.css ?? control.CSS;
  const inlineStyle = __ms_form_inline_style(control.style);
  const hasLocalStyle = !!inlineStyle || !!cssPath;
  const cssKey = __ms_form_control_css_key(control);
  const defaultCss = __ms_form_default_css_for_control(cssKey, hasLocalStyle, control);

  if (inlineStyle) {
    __ms_form_apply_style(el, inlineStyle);
  }

  if (cssPath) {
    (async () => {
      if (defaultCss && defaultCss !== cssPath) {
        const applied = await __ms_form_apply_css_file(section, control, cell, defaultCss, tagName);
        if (!applied) {
          await __ms_form_apply_css_file(section, control, cell, cssPath, tagName);
        }
        return;
      }

      await __ms_form_apply_css_file(section, control, cell, cssPath, tagName);
    })();
    return;
  }

  if (defaultCss) {
    __ms_form_apply_css_file(section, control, cell, defaultCss, tagName);
  }
}

function __ms_form_decimal_places(control) {
  const direct =
    control.decimal ??
    control.decimals ??
    control.decimalPlaces ??
    control.scale;

  const directNumber = Number(direct);
  if (Number.isInteger(directNumber) && directNumber >= 0) return directNumber;

  if (typeof direct === 'string') {
    const formatDecimal = direct.match(/[.,](0+)/);
    if (formatDecimal) return formatDecimal[1].length;
  }

  const step = String(control.step || '').trim().toLowerCase();
  if (step && step !== 'any') {
    const decimal = step.match(/[.,](\d+)/);
    if (decimal) return decimal[1].length;
    if (/^\d+$/.test(step)) return 0;
  }

  const placeholder = String(control.placeholder || '');
  const placeholderDecimal = placeholder.match(/[.,](0+)/);
  if (placeholderDecimal) return placeholderDecimal[1].length;

  const type = String(control.type || 'text').toLowerCase();
  if (type === 'currency' || type === 'decimal') return 2;

  return 0;
}

function __ms_form_allows_negative(control) {
  const type = String(control.type || 'text').toLowerCase();
  if (type === 'currency') return false;

  if (control.min != null && control.min !== '') {
    const min = Number(control.min);
    if (Number.isFinite(min) && min >= 0) return false;
  }

  return !!control.allowNegative;
}

function __ms_form_sanitize_number(value, control, allowDecimal) {
  const maxDecimals = allowDecimal ? __ms_form_decimal_places(control) : 0;
  const allowNegative = __ms_form_allows_negative(control);
  const text = String(value || '').replace(/,/g, '.');
  let out = '';
  let hasDot = false;
  let decimals = 0;

  for (const ch of text) {
    if (/\d/.test(ch)) {
      if (hasDot && Number.isInteger(maxDecimals) && decimals >= maxDecimals) continue;
      out += ch;
      if (hasDot) decimals++;
      continue;
    }

    if (ch === '.' && allowDecimal && !hasDot) {
      out += ch;
      hasDot = true;
      continue;
    }

    if (ch === '-' && allowNegative && out === '') {
      out += ch;
    }
  }

  return out;
}

function __ms_form_apply_maxlength(value, control) {
  const raw =
    control.maxlength ??
    control.maxLength;

  const max = Number(raw);
  if (!Number.isInteger(max) || max < 0) return value;

  return String(value).slice(0, max);
}

function __ms_form_sanitize_value(value, control) {
  const type = String(control.type || 'text').toLowerCase();
  let text = String(value ?? '');

  if (type === 'alpha') {
    text = text.replace(/\d+/g, '');
  }
  else if (type === 'email') {
    text = text.replace(/[\s\x00-\x1f\x7f]+/g, '');
  }
  else if (type === 'int' || type === 'integer') {
    text = __ms_form_sanitize_number(text, control, false);
  }
  else if (type === 'number') {
    text = __ms_form_sanitize_number(text, control, __ms_form_decimal_places(control) > 0);
  }
  else if (type === 'decimal' || type === 'currency') {
    text = __ms_form_sanitize_number(text, control, true);
  }

  return __ms_form_apply_maxlength(text, control);
}

function __ms_form_input_dom_type(control) {
  const type = String(control.type || 'text').toLowerCase();

  if (type === 'email') return 'email';
  if (type === 'date') return 'date';
  if (type === 'password') return 'password';
  if (type === 'tel') return 'tel';

  return 'text';
}

function __ms_form_input_mode(control) {
  const type = String(control.type || 'text').toLowerCase();

  if (type === 'int' || type === 'integer') return 'numeric';
  if (type === 'number') return __ms_form_decimal_places(control) > 0 ? 'decimal' : 'numeric';
  if (type === 'decimal' || type === 'currency') return 'decimal';

  return control.inputmode || control.inputMode || '';
}

function __ms_form_set_attrs(el, attrs) {
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === false || value == null || value === '') return;
    if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  });
}

function __ms_form_control_value(control) {
  if (control?.__msFormKind === 'image') {
    return control.path || control.src || control.url || '';
  }

  return control && 'value' in control ? control.value : null;
}

function __ms_form_is_empty_value(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function __ms_form_default_message(control, code) {
  if (control.message) return control.message;

  const label = control.label || control.name || control.field || 'Value';

  if (code === 'required') return `${label} is required.`;
  if (code === 'email') return `Enter a valid ${label}.`;
  if (code === 'min') return control.minMessage || `${label} must be at least ${control.min}.`;
  if (code === 'max') return control.maxMessage || `${label} must be at most ${control.max}.`;
  if (code === 'number') return `${label} must be a number.`;

  return `${label} is invalid.`;
}

function __ms_form_validate_control(control) {
  if (!control || control.__msFormKind === 'buttons' || control.__msFormKind === 'button' || control.__msFormKind === 'image') {
    return { ok: true, message: '' };
  }

  const value = __ms_form_control_value(control);
  const type = String(control.type || '').toLowerCase();

  if (control.required && __ms_form_is_empty_value(value)) {
    return { ok: false, message: __ms_form_default_message(control, 'required') };
  }

  if (__ms_form_is_empty_value(value)) {
    return { ok: true, message: '' };
  }

  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return { ok: false, message: __ms_form_default_message(control, 'email') };
  }

  if (['number', 'decimal', 'currency', 'int', 'integer'].includes(type)) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return { ok: false, message: __ms_form_default_message(control, 'number') };
    }

    if (control.min != null && control.min !== '' && n < Number(control.min)) {
      return { ok: false, message: control.message || __ms_form_default_message(control, 'min') };
    }

    if (control.max != null && control.max !== '' && n > Number(control.max)) {
      return { ok: false, message: control.message || __ms_form_default_message(control, 'max') };
    }
  }

  if (typeof control.validate === 'function') {
    const result = control.validate(value, control);

    if (result === false) {
      return { ok: false, message: __ms_form_default_message(control, 'custom') };
    }

    if (typeof result === 'string') {
      return { ok: false, message: result };
    }
  }

  return { ok: true, message: '' };
}

function __ms_form_create_input(control, section) {
  const input = document.createElement('input');
  const name = __ms_form_control_key(control);
  const type = String(control.type || 'text').toLowerCase();

  input.type = __ms_form_input_dom_type(control);
  if (name) input.id = control.id || name;
  if (name) input.name = name;

  __ms_form_set_attrs(input, {
    placeholder: control.placeholder,
    maxlength: control.maxlength ?? control.maxLength,
    size: control.size,
    min: control.min,
    max: control.max,
    step: control.step,
    required: control.required,
    readonly: control.readonly || control.readOnly,
    disabled: control.disabled,
    autocomplete: control.autocomplete,
    inputmode: __ms_form_input_mode(control)
  });

  if (control.size) {
    input.style.setProperty('width', `${control.size}ch`, 'important');
  }

  if (control.width) {
    input.style.width = typeof control.width === 'number' ? `${control.width}px` : control.width;
  }

  input.value = __ms_form_sanitize_value(control._value ?? '', control);
  control._el = input;
  control._value = input.value;

  const sync = () => {
    const old = input.value;
    const next = __ms_form_sanitize_value(old, control);
    const changed = next !== old;

    if (changed) {
      input.value = next;
      section?._showControlMessage(control, __ms_form_default_message(control, 'custom'));
    }

    control._value = input.value;
    if (!changed) {
      section?._validateControl(control);
    }
    control.onChange?.(control.value, control, section);
  };

  input.addEventListener('input', sync);

  input.addEventListener('blur', () => {
    if ((type === 'currency' || type === 'decimal') && input.value && !/[.-]$/.test(input.value)) {
      const n = Number(input.value);
      if (Number.isFinite(n)) {
        input.value = n.toFixed(__ms_form_decimal_places(control));
        control._value = input.value;
      }
    }

    section?._validateControl(control);
    control.onBlur?.(control.value, control, section);
  });

  input.addEventListener('focus', () => {
    control.onFocus?.(control.value, control, section);
  });

  return input;
}

function __ms_form_create_checkbox(control, section) {
  const box = document.createElement('input');
  const name = __ms_form_control_key(control);

  box.type = 'checkbox';
  if (name) box.id = control.id || name;
  if (name) box.name = name;
  box.checked = !!control._value;
  box.disabled = !!control.disabled;
  control._el = box;

  box.addEventListener('change', () => {
    control._value = box.checked;
    section?._validateControl(control);
    control.onChange?.(control.value, control, section);
  });

  return box;
}

function __ms_form_radio_items(control) {
  const items = control.items || control.options || [];

  return items.map(item => {
    if (typeof item === 'object') {
      return {
        value: item.value ?? item.id ?? item.key ?? item.label ?? item.text,
        label: item.label ?? item.text ?? item.value ?? item.id ?? item.key
      };
    }

    return {
      value: item,
      label: item
    };
  });
}

function __ms_form_create_radio(control, section) {
  const wrap = document.createElement('div');
  const name = __ms_form_control_key(control) || ('radio_' + Math.random().toString(36).slice(2));

  wrap.className = 'ms-section-radio-group';
  control._el = wrap;

  __ms_form_radio_items(control).forEach(item => {
    const label = document.createElement('label');
    const radio = document.createElement('input');

    radio.type = 'radio';
    radio.name = name;
    radio.value = item.value;
    radio.checked = String(item.value) === String(control._value ?? '');
    radio.disabled = !!control.disabled;

    radio.addEventListener('change', () => {
      if (!radio.checked) return;

      control._value = item.value;
      section?._validateControl(control);
      control.onChange?.(control.value, control, section);
    });

    label.appendChild(radio);
    label.appendChild(document.createTextNode(' ' + item.label));
    wrap.appendChild(label);
  });

  return wrap;
}

function __ms_form_create_button(control, section) {
  const btn = document.createElement('button');

  btn.type = 'button';
  btn.textContent = control.text || control.label || control.name || 'Button';
  btn.disabled = !!control.disabled;
  control._el = btn;

  btn.addEventListener('click', event => {
    control.click?.call(control, {
      event,
      section,
      button: control
    });
  });

  return btn;
}

function __ms_form_bool(control, ...names) {
  for (const name of names) {
    if (control[name] != null) return !!control[name];
  }

  return false;
}

function __ms_form_image_show_mode(control) {
  const raw = control.showMode ?? control.ShowMode ?? control.mode ?? control.position;

  if (raw != null) {
    const mode = String(raw).trim().toLowerCase();
    if (mode === 'in' || mode === 'inside' || mode === 'inner') return 'inside';
    if (mode === 'top') return 'top';
    if (mode === 'right') return 'right';
  }

  if (__ms_form_bool(control, 'showInside', 'inside')) return 'inside';
  if (__ms_form_bool(control, 'showTop', 'top')) return 'top';
  if (__ms_form_bool(control, 'showRight', 'right')) return 'right';

  return 'inside';
}

function __ms_form_image_source(control) {
  return control.path || control.src || control.url || '';
}

function __ms_form_image_fit(control) {
  if (control.fit) return control.fit;
  if (control.objectFit) return control.objectFit;
  if (control.autoSize === false) return 'fill';
  if (control.autoSize === 'contain' || control.autoSize === 'cover' || control.autoSize === 'fill') {
    return control.autoSize;
  }

  return 'contain';
}

function __ms_form_create_image(control, section, place) {
  const frame = document.createElement('div');
  const img = document.createElement('img');
  const center = __ms_form_bool(control, 'Center', 'center');
  const placeWidth = control[`${place}Width`] ?? control.width;
  const placeHeight = control[`${place}Height`] ?? control.height;

  frame.className = `ms-section-image ms-section-image-${place}`;
  frame.dataset.field = __ms_form_control_key(control) || '';
  frame.style.boxSizing = 'border-box';
  frame.style.background = control.background || control.bg || 'transparent';
  frame.style.display = 'flex';
  frame.style.alignItems = center ? 'center' : 'stretch';
  frame.style.justifyContent = center ? 'center' : 'stretch';
  frame.style.overflow = 'hidden';
  frame.style.minWidth = '0';

  const radius = control.radius ?? control.borderRadius ?? control.round;
  if (radius != null) {
    frame.style.borderRadius = __ms_form_px(radius, '');
    img.style.borderRadius = __ms_form_px(radius, '');
  }

  if (control.shadow === true) {
    frame.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.22)';
  } else if (control.shadow) {
    frame.style.boxShadow = String(control.shadow);
  }

  img.src = __ms_form_image_source(control);
  img.alt = control.alt || control.label || '';
  img.style.display = 'block';
  img.style.objectFit = __ms_form_image_fit(control);
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';

  if (placeWidth) {
    frame.style.width = __ms_form_px(placeWidth, '');
    img.style.width = control.autoSize === false ? __ms_form_px(placeWidth, '') : '100%';
  } else {
    frame.style.width = place === 'right'
      ? __ms_form_px(control.rightWidth ?? control.panelWidth, '165px')
      : '100%';
    img.style.width = '100%';
  }

  if (placeHeight) {
    frame.style.height = __ms_form_px(placeHeight, '');
    img.style.height = control.autoSize === false ? __ms_form_px(placeHeight, '') : '100%';
  } else {
    frame.style.height = place === 'top'
      ? __ms_form_px(control.topHeight ?? control.panelHeight, '110px')
      : place === 'right'
        ? __ms_form_px(control.rightHeight ?? control.panelHeight, '285px')
        : 'auto';
    img.style.height = place === 'inside' ? 'auto' : '100%';
  }

  __ms_form_apply_style(frame, control.frameStyle);
  __ms_form_apply_style(img, __ms_form_inline_style(control.style));

  frame.appendChild(img);
  control._imageEls = control._imageEls || [];
  control._imageEls.push(img);
  control._el = img;

  return frame;
}

function __ms_form_create_buttons(control, section) {
  const wrap = document.createElement('div');

  wrap.className = 'ms-section-buttons';
  control._el = wrap;

  (control.items || []).forEach(item => {
    const btn = document.createElement('button');

    btn.type = 'button';
    btn.textContent = item.text || item.label || 'Button';
    btn.disabled = !!item.disabled;
    __ms_form_apply_style(btn, item.style);

    btn.addEventListener('click', event => {
      item.click?.call(control, {
        event,
        section,
        button: item
      });
    });

    wrap.appendChild(btn);
  });

  return wrap;
}

function __ms_form_render_control(control, cell, section) {
  let el;

  if (control.__msFormKind === 'input') {
    el = __ms_form_create_input(control, section);
    cell.appendChild(el);
    __ms_form_apply_control_style(section, control, el, cell, 'input');
    return;
  }

  if (control.__msFormKind === 'checkbox') {
    el = __ms_form_create_checkbox(control, section);
    cell.appendChild(el);
    __ms_form_apply_control_style(section, control, el, cell, 'input');
    return;
  }

  if (control.__msFormKind === 'radio') {
    el = __ms_form_create_radio(control, section);
    cell.appendChild(el);
    __ms_form_apply_control_style(section, control, el, cell, 'input');
    return;
  }

  if (control.__msFormKind === 'button') {
    el = __ms_form_create_button(control, section);
    if (cell?.classList?.contains('ms-section-button-row')) {
      const scope = document.createElement('span');
      const key = __ms_form_control_key(control);
      scope.className = 'ms-section-button-scope';
      if (key) scope.dataset.field = key;
      scope.style.display = 'contents';
      scope.appendChild(el);
      cell.appendChild(scope);
      __ms_form_apply_control_style(section, control, el, scope, 'button');
    } else {
      cell.appendChild(el);
      __ms_form_apply_control_style(section, control, el, cell, 'button');
    }
    return;
  }

  if (control.__msFormKind === 'image') {
    el = __ms_form_create_image(control, section, 'inside');
    cell.appendChild(el);
    __ms_form_apply_control_style(section, control, el, cell, 'img');
    return;
  }

  if (control.__msFormKind === 'combo') {
    const host = document.createElement('div');
    cell.appendChild(host);
    control.mount(host);
    __ms_form_apply_control_style(section, control, host, cell, 'div');
    return;
  }

  if (control.__msFormKind === 'buttons') {
    el = __ms_form_create_buttons(control, section);
    cell.appendChild(el);
    __ms_form_apply_control_style(section, control, el, cell, 'button');
    return;
  }

  if (typeof control.mount === 'function') {
    const host = document.createElement('div');
    cell.appendChild(host);
    control.mount(host);
    __ms_form_apply_control_style(section, control, host, cell, 'div');
    return;
  }

  const span = document.createElement('span');
  span.textContent = __ms_form_control_value(control) ?? '';
  cell.appendChild(span);
}

function __ms_form_create_control(kind, cfg) {
  const c = {
    ...cfg,
    __msFormKind: kind,
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    _el: null,
    _value: cfg.value ?? (kind === 'checkbox' ? false : ''),

    get value() {
      if (this.__msFormKind === 'checkbox') {
        return this._el ? this._el.checked : !!this._value;
      }

      if (this._el && this._el.tagName === 'INPUT') {
        return this._el.value;
      }

      return this._value;
    },

    set value(v) {
      if (this.__msFormKind === 'checkbox') {
        this._value = !!v;
        if (this._el) this._el.checked = this._value;
        return;
      }

      this._value = __ms_form_sanitize_value(v ?? '', this);
      if (this._el && this._el.tagName === 'INPUT') {
        this._el.value = this._value;
      }
    },

    mount(el) {
      const host = el?.el || el;
      if (!host) return;

      host.innerHTML = '';
      __ms_form_render_control(this, host, null);
    }
  };

  if (cfg.field && !c.name) c.name = cfg.field;
  if (cfg.name && !c.field) c.field = cfg.name;

  return c;
}

InputModule.create = function (cfg) {
  return __ms_form_create_control('input', cfg || {});
};

CheckboxModule.create = function (cfg) {
  return __ms_form_create_control('checkbox', cfg || {});
};

RadioModule.create = function (cfg) {
  const c = __ms_form_create_control('radio', cfg || {});
  c.items = cfg.items || cfg.options || [];
  return c;
};

ButtonModule.create = function (cfg) {
  const c = {
    ...(cfg || {}),
    __msFormKind: 'button',
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    _el: null,
    value: null,

    mount(el) {
      const host = el?.el || el;
      if (!host) return;

      host.innerHTML = '';
      const key = __ms_form_control_key(this);
      if (key) host.dataset.field = key;
      const btn = __ms_form_create_button(this, this.section);
      host.appendChild(btn);
      __ms_form_apply_control_style(this.section || null, this, btn, host, 'button');
    }
  };

  return c;
};

ButtonsModule.create = function (cfg) {
  const c = {
    ...cfg,
    __msFormKind: 'buttons',
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    items: cfg.items ? [...cfg.items] : [],
    _el: null,
    value: null,

    add(text, click, options) {
      const item = typeof text === 'object'
        ? text
        : { ...(options || {}), text, click };

      this.items.push(item);

      if (this._el) {
        const host = this._el;
        host.innerHTML = '';
        this._el = host;
        (this.items || []).forEach(item => {
          const btn = document.createElement('button');

          btn.type = 'button';
          btn.textContent = item.text || item.label || 'Button';
          btn.disabled = !!item.disabled;
          __ms_form_apply_style(btn, item.style);

          btn.addEventListener('click', event => {
            item.click?.call(this, {
              event,
              section: this.section,
              button: item
            });
          });

          host.appendChild(btn);
        });
      }

      return item;
    },

    mount(el) {
      const host = el?.el || el;
      if (!host) return;

      host.innerHTML = '';
      const key = __ms_form_control_key(this);
      if (key) host.dataset.field = key;
      const wrap = __ms_form_create_buttons(this, this.section);
      host.appendChild(wrap);
      __ms_form_apply_control_style(this.section || null, this, wrap, host, 'button');
    }
  };

  return c;
};

ImageModule.create = function (cfg) {
  const c = {
    ...(cfg || {}),
    __msFormKind: 'image',
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    _el: null,
    _imageEls: [],

    get value() {
      return __ms_form_image_source(this);
    },

    set value(v) {
      this.path = v;
      for (const img of this._imageEls || []) {
        img.src = __ms_form_image_source(this);
      }
    },

    mount(el) {
      const host = el?.el || el;
      if (!host) return;

      host.innerHTML = '';
      const key = __ms_form_control_key(this);
      if (key) host.dataset.field = key;
      const frame = __ms_form_create_image(this, this.section, 'inside');
      host.appendChild(frame);
      __ms_form_apply_control_style(this.section || null, this, frame, host, 'img');
    }
  };

  return c;
};

SectionModule.create = function (cfg) {
  const s = {
    _el: null,
    _controls: [],
    _byName: new Map(),
    _fieldMessages: new Map(),
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    title: cfg.title || '',
    css: cfg.css || null,
    style: cfg.style || null,
    labelWidth: cfg.labelWidth ?? null,
    controlWidth: cfg.controlWidth ?? null,
    maxLabelWidth: cfg.maxLabelWidth ?? cfg.MaxLabelWidth ?? cfg.labelWidth ?? 160,
    gap: cfg.gap ?? 7,
    rowGap: cfg.rowGap ?? cfg.verticalGap ?? cfg.gap ?? 7,
    buttonGap: cfg.buttonGap ?? 8,
    marginLeft: cfg.marginLeft ?? 10,
    marginTop: cfg.marginTop ?? 8,
    marginRight: cfg.marginRight ?? 10,
    marginBottom: cfg.marginBottom ?? 8,
    layout: cfg.layout || 'label-left',
    messageMode: cfg.messageMode || 'field',
    messagePosition: cfg.messagePosition || 'bottom-right',
    messageStyle: cfg.messageStyle || null,

    add(control, options = {}) {
      return this.insert(control, options);
    },

    insert(control, options = {}) {
      if (!control) {
        throw new Error('ms.form.section.insert: control is required');
      }

      const key = __ms_form_control_key(control);
      if (!Object.prototype.hasOwnProperty.call(control, '__msDefaultCssPolicy') ||
        control.__msDefaultCssPolicy === undefined) {
        control.__msDefaultCssPolicy = this.__msDefaultCssPolicy;
      }

      if (key) {
        if (this._byName.has(key)) {
          throw new Error(`ms.form.section: duplicate field name ${key}`);
        }

        if (key in this) {
          throw new Error(`ms.form.section: field name conflicts with section API ${key}`);
        }

        this._byName.set(key, control);
        control.name = control.name || key;
        control.field = control.field || key;

        Object.defineProperty(this, key, {
          configurable: true,
          enumerable: true,
          get: () => __ms_form_control_value(control),
          set: value => {
            control.value = value;
            this._validateControl(control);
          }
        });
      }

      control.section = this;
      if (options?.top === true) {
        this._controls.unshift(control);
      } else {
        this._controls.push(control);
      }

      if (this._el) this.render();

      return control;
    },

    control(name) {
      return this._byName.get(name) || null;
    },

    values() {
      const out = {};

      for (const [key, control] of this._byName) {
        out[key] = __ms_form_control_value(control);
      }

      return out;
    },

    setValues(values) {
      if (!values) return;

      Object.entries(values).forEach(([key, value]) => {
        const control = this.control(key);
        if (control) control.value = value;
      });

      this.validate();
    },

    valid() {
      return this.validate().ok;
    },

    validate() {
      const errors = [];

      for (const control of this._controls) {
        const result = this._validateControl(control, { collectOnly: true });

        if (!result.ok) {
          errors.push({
            name: __ms_form_control_key(control),
            message: result.message,
            control
          });
        }
      }

      this._applyValidationMessages(errors);

      return {
        ok: errors.length === 0,
        errors
      };
    },

    mount(el) {
      this._el = el?.el || el;
      if (!this._el) return;

      if (this._el.id) {
        this._el.setAttribute('data-ms-id', this._el.id);
      }

      this._el.setAttribute('data-ms-alias', 'mssection');
      this.render();
      this.applyDefaultStyle();
    },

    render() {
      const root = this._el;
      if (!root) return;

      for (const control of this._controls) {
        control.__msDefaultCssPolicy = this.__msDefaultCssPolicy;
      }

      __ms_form_prepare_section_mount_target(root);
      const existingStyles = __ms_form_preserve_host_styles(root);
      root.innerHTML = '';
      __ms_form_restore_host_styles(root, existingStyles);

      const layoutStyle = document.createElement('style');
      layoutStyle.setAttribute('data-ms-section-layout', '1');
      layoutStyle.textContent = `
        @container (max-width: 460px) {
          .ms-section .ms-section-body {
            flex-direction: column !important;
            gap: ${__ms_form_px(this.rowGap, '7px')} !important;
          }
          .ms-section .ms-section-left,
          .ms-section .ms-section-right-images {
            width: 100% !important;
          }
          .ms-section .ms-section-rows {
            grid-template-columns: minmax(0, 1fr) !important;
            row-gap: 4px !important;
          }
          .ms-section .ms-section-label,
          .ms-section .ms-section-control,
          .ms-section .ms-section-field-message,
          .ms-section .ms-section-full-row {
            grid-column: 1 !important;
          }
          .ms-section .ms-section-control {
            margin-bottom: ${__ms_form_px(this.rowGap, '7px')};
          }
          .ms-section .ms-section-button-row {
            display: flex !important;
          }
          .ms-section input,
          .ms-section select,
          .ms-section textarea {
            max-width: 100% !important;
          }
          .ms-section .ms-section-top-images,
          .ms-section .ms-section-right-images {
            flex-direction: row !important;
            flex-wrap: wrap !important;
          }
        }
      `;
      root.appendChild(layoutStyle);

      const panel = document.createElement('div');
      panel.className = 'ms-section';
      panel.style.position = 'relative';
      panel.style.display = 'inline-block';
      panel.style.boxSizing = 'border-box';
      panel.style.maxWidth = '100%';
      panel.style.paddingTop = __ms_form_px(this.marginTop, '8px');
      panel.style.paddingRight = __ms_form_px(this.marginRight, '10px');
      panel.style.paddingBottom = __ms_form_px(this.marginBottom, '8px');
      panel.style.paddingLeft = __ms_form_px(this.marginLeft, '10px');
      panel.style.background = '#f2f2f2';
      panel.style.font = '13px Arial, sans-serif';
      panel.style.color = '#111827';
      __ms_form_apply_style(panel, this.style);

      if (this.title) {
        const title = document.createElement('div');
        title.className = 'ms-section-title';
        title.textContent = this.title;
        title.style.fontWeight = '600';
        title.style.marginBottom = '8px';
        panel.appendChild(title);
      }

      const topImages = this._controls.filter(control =>
        control.__msFormKind === 'image' &&
        __ms_form_image_show_mode(control) === 'top'
      );
      const rightImages = this._controls.filter(control =>
        control.__msFormKind === 'image' &&
        __ms_form_image_show_mode(control) === 'right'
      );
      const body = document.createElement('div');
      const leftStack = document.createElement('div');
      const rightRail = document.createElement('div');

      body.className = 'ms-section-body';
      body.style.display = 'flex';
      body.style.alignItems = 'flex-start';
      body.style.gap = __ms_form_px(this.rightGap ?? 32, '32px');
      body.style.maxWidth = '100%';

      leftStack.className = 'ms-section-left';
      leftStack.style.minWidth = '0';

      if (rightImages.length) {
        rightRail.className = 'ms-section-right-images';
        rightRail.style.display = 'flex';
        rightRail.style.flexDirection = 'column';
        rightRail.style.gap = __ms_form_px(this.imageGap ?? this.rowGap, '7px');
        rightRail.style.flex = '0 0 auto';
      }

      if (topImages.length) {
        const topArea = document.createElement('div');
        topArea.className = 'ms-section-top-images';
        topArea.style.display = 'flex';
        topArea.style.flexDirection = 'row';
        topArea.style.flexWrap = 'wrap';
        topArea.style.alignItems = 'flex-start';
        topArea.style.gap = __ms_form_px(this.imageGap ?? this.rowGap, '7px');
        topArea.style.marginBottom = __ms_form_px(this.rowGap, '7px');

        for (const imgControl of topImages) {
          const topFrame = __ms_form_create_image(imgControl, this, 'top');
          topArea.appendChild(topFrame);
          __ms_form_apply_control_style(this, imgControl, topFrame, topFrame, 'img');
        }

        leftStack.appendChild(topArea);
      }

      const rows = document.createElement('div');
      rows.className = 'ms-section-rows';
      const labelColumn = this.labelWidth == null
        ? `minmax(0, ${__ms_form_px(this.maxLabelWidth, '160px')})`
        : __ms_form_px(this.labelWidth, '125px');
      const controlColumn = this.controlWidth == null
        ? 'minmax(0, max-content)'
        : `minmax(0, ${__ms_form_px(this.controlWidth, '220px')})`;

      rows.style.display = 'grid';
      rows.style.gridTemplateColumns =
        `${labelColumn} ` +
        `${controlColumn} ` +
        'minmax(0, auto)';
      rows.style.columnGap = '12px';
      rows.style.rowGap = __ms_form_px(this.rowGap, '7px');
      rows.style.alignItems = 'center';

      this._fieldMessages.clear();

      for (let i = 0; i < this._controls.length; i++) {
        const control = this._controls[i];
        const key = __ms_form_control_key(control) || '';

        if (control.__msFormKind === 'image' &&
          __ms_form_image_show_mode(control) !== 'inside') {
          continue;
        }

        if (control.__msFormKind === 'grid') {
          const gridCell = document.createElement('div');
          gridCell.className = 'ms-section-control ms-section-full-row';
          gridCell.dataset.field = key;
          gridCell.style.gridColumn = '1 / 4';
          gridCell.style.justifySelf = 'stretch';
          gridCell.style.width = '100%';
          __ms_form_render_control(control, gridCell, this);
          rows.appendChild(gridCell);
          continue;
        }

        if (control.__msFormKind === 'button') {
          const label = document.createElement('label');
          label.className = 'ms-section-label';
          label.style.gridColumn = '1';

          const cell = document.createElement('div');
          cell.className = 'ms-section-control ms-section-button-row';
          cell.dataset.field = key;
          cell.style.gridColumn = '2';
          cell.style.display = 'flex';
          cell.style.flexWrap = 'wrap';
          cell.style.gap = __ms_form_px(this.buttonGap ?? 8, '8px');

          while (this._controls[i]?.__msFormKind === 'button') {
            __ms_form_render_control(this._controls[i], cell, this);
            i++;
          }
          i--;

          const msg = document.createElement('div');
          msg.className = 'ms-section-field-message';
          msg.style.gridColumn = '3';
          msg.style.visibility = 'hidden';

          rows.appendChild(label);
          rows.appendChild(cell);
          rows.appendChild(msg);
          continue;
        }

        const label = document.createElement('label');
        label.className = 'ms-section-label';
        label.textContent = control.label || '';
        label.dataset.field = key;
        label.setAttribute('data-ms-form-label', '1');
        label.setAttribute('data-ms-form-label-field', key);
        label.style.whiteSpace = 'normal';
        label.style.overflowWrap = 'anywhere';
        label.style.minWidth = '0';
        label.style.maxWidth = __ms_form_px(this.maxLabelWidth, '160px');
        label.style.alignSelf = 'center';
        label.style.gridColumn = '1';

        const cell = document.createElement('div');
        cell.className = 'ms-section-control';
        cell.dataset.field = key;
        cell.style.gridColumn = '2';

        const msg = document.createElement('div');
        msg.className = 'ms-section-field-message';
        msg.dataset.field = key;
        msg.style.gridColumn = '3';
        msg.style.visibility = 'hidden';
        msg.style.minHeight = '1em';
        msg.style.color = '#b42318';
        msg.style.fontSize = '12px';
        msg.style.lineHeight = '1.25';
        __ms_form_apply_message_style(msg, control.messageStyle || this.messageStyle);
        __ms_form_apply_control_label_style(this, control, label);

        if (control.messageLocation === 'bottom') {
          msg.style.gridColumn = '2 / 4';
        }

        __ms_form_render_control(control, cell, this);

        rows.appendChild(label);
        rows.appendChild(cell);
        rows.appendChild(msg);

        this._fieldMessages.set(key, msg);
      }

      leftStack.appendChild(rows);

      for (const imgControl of rightImages) {
        const rightFrame = __ms_form_create_image(imgControl, this, 'right');
        rightRail.appendChild(rightFrame);
        __ms_form_apply_control_style(this, imgControl, rightFrame, rightFrame, 'img');
      }

      body.appendChild(leftStack);
      if (rightImages.length) body.appendChild(rightRail);
      panel.appendChild(body);

      const panelMessage = document.createElement('div');
      panelMessage.className = 'ms-section-panel-message';
      panelMessage.style.display = 'none';
      panelMessage.style.position = 'absolute';
      panelMessage.style.right = '8px';
      panelMessage.style.maxWidth = '45%';
      panelMessage.style.padding = '5px 8px';
      panelMessage.style.border = '1px solid #f5a3a3';
      panelMessage.style.background = '#fff1f2';
      panelMessage.style.color = '#b42318';
      panelMessage.style.fontSize = '12px';
      panelMessage.style.lineHeight = '1.25';
      panelMessage.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.10)';
      panelMessage.style.zIndex = '2';

      if (this.messagePosition === 'top-right') {
        panelMessage.style.top = '8px';
      } else {
        panelMessage.style.bottom = '8px';
      }

      __ms_form_apply_message_style(panelMessage, this.messageStyle);
      panel.appendChild(panelMessage);
      this._panelMessage = panelMessage;

      root.appendChild(panel);
      this.validate();
    },

    _showControlMessage(control, message) {
      const key = __ms_form_control_key(control);
      if (!key) return;

      if (this.messageMode === 'panel') {
        if (this._panelMessage) {
          this._panelMessage.textContent = message || '';
          this._panelMessage.style.display = message ? 'block' : 'none';
        }
        return;
      }

      const msg = this._fieldMessages.get(key);
      if (!msg) return;

      msg.textContent = message || '';
      msg.style.visibility = message ? 'visible' : 'hidden';
    },

    _validateControl(control, options) {
      const result = __ms_form_validate_control(control);

      if (!options?.collectOnly) {
        this._showControlMessage(control, result.ok ? '' : result.message);
      }

      return result;
    },

    _applyValidationMessages(errors) {
      if (this.messageMode === 'panel') {
        if (this._panelMessage) {
          this._panelMessage.textContent = errors[0]?.message || '';
          this._panelMessage.style.display = errors.length ? 'block' : 'none';
        }

        for (const msg of this._fieldMessages.values()) {
          msg.textContent = '';
          msg.style.visibility = 'hidden';
        }

        return;
      }

      const byName = new Map(errors.map(e => [e.name, e.message]));

      for (const [name, msg] of this._fieldMessages) {
        const text = byName.get(name) || '';
        msg.textContent = text;
        msg.style.visibility = text ? 'visible' : 'hidden';
      }
    },

    async applyDefaultStyle() {
      const cfg = window.MS_CONFIG || {};
      const styleCssPath = __ms_form_style_css_path(this.style);
      const inlineStyle = __ms_form_inline_style(this.style);
      const localCss = styleCssPath || this.css;
      const hasLocalStyle = !!inlineStyle || !!localCss;
      const defaultCss = __ms_form_default_css_for_control('section', hasLocalStyle, this);
      const configCss = !hasLocalStyle && !defaultCss && !__ms_form_default_css_disabled(this)
        ? cfg.Section_CSS
        : null;
      const css = defaultCss || localCss || configCss;
      const theme = cfg.Section_Theme;

      if (!css) return;

      const scope = __ms_form_scope_selector_for_host(this._el);
      if (defaultCss && defaultCss !== localCss) {
        const applied = await __ms_form_apply_section_part_css(this, 'section-default', defaultCss, scope, '');
        if (!applied && localCss) {
          await __ms_form_apply_section_part_css(this, 'section-local', localCss, scope, '');
        }
      } else if (localCss) {
        await __ms_form_apply_section_part_css(this, 'section-local', localCss, scope, '');
      } else if (configCss) {
        await __ms_form_apply_section_part_css(this, 'section-config', configCss, scope, '');
      }

      if (theme) this._el.classList.add(theme);
    }
  };

  return s;
};


/* ========= AUTO FILL ===== (Inputs , Combo And Grid are inside) ================== */

AutoFillModule.autoFill = async function (url, styleMap) {

  if (!url) {
    return;
  }

  let json;

  const cfg = window.MS_CONFIG || {};

  let gridCss;
  let comboCss;

  try {
    const r = await fetch(url);

    if (!r.ok) {
      throw new Error(`HTTP ${r.status} - ${r.statusText}`);
    }

    const contentType = r.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("Response is not JSON");
    }

    json = await r.json();

    gridCss = (styleMap && styleMap.grid !== undefined)
      ? styleMap.grid
      : __ms_form_default_or_legacy_css_url('grid', 'Grid_CSS');
    comboCss = styleMap?.combo || __ms_form_default_or_legacy_css_url('combo', 'Combo_CSS');

    // NON-BLOCKING preload
    Promise.all([
      __ms_preload_css(gridCss),
      __ms_preload_css(comboCss)
    ]);

  } catch (e) {
    console.warn('autoFill error:', e.message);
    return;
  }

  /* ================= INPUTs in autoFill  ================= */

  for (const item of json) {

    if (!item.msInput) continue;

    let el;

    try {
      el = ms.id(item.msInput);
    } catch {
      continue;
    }

    const dom = el?.el || el;

    if (!dom) continue;

    if (dom.tagName === 'INPUT' || dom.tagName === 'TEXTAREA') {
      dom.value = item.data ?? '';
    }
  }

  /* === Combo in autoFill ================================== */


  for (const item of json) {

    if (!item.msCombo) continue;

    const id = item.msCombo;

    let el;

    try {
      el = ms.id(id);
    } catch {
      continue;
    }

    const dom = el?.el || el;

    if (!dom) continue;

    let c = ComboModule.registry[id] || null;

    dom.setAttribute('data-ms-alias', 'mscombo');

    if (!c) {
      c = ComboModule.createCombo(el, {});
      if (c._el && c._el.id) {
        ComboModule.registry[c._el.id] = c;
      }
    }

    let items = [];

    if (Array.isArray(item.data) && Array.isArray(item.fields)) {
      items = item.data.map(row => {
        const obj = {};
        item.fields.forEach((f, i) => obj[f] = row[i]);
        return obj;
      });
    }

    c.data = items;
    c._selected.clear();

    if (Array.isArray(item.value)) {

      item.value.forEach(row => {
        if (Array.isArray(row)) {
          c._selected.add(row[0]);
        } else {
          c._selected.add(row);
        }
      });

      c.multiSelect = true;

    } else if (item.value != null) {

      if (Array.isArray(item.value)) {
        c._selected.add(item.value[0]);
      } else {
        c._selected.add(item.value);
      }

      c.multiSelect = false;
    }

    c.render();
    c.applyDefaultStyle();
  }

  /* ======= GRID IN autoFill ======================= */

  for (const item of json) {

    if (!item.msGrid) continue;

    let el;

    try {
      el = ms.id(item.msGrid);
    } catch {
      continue;
    }

    const dom = el?.el || el;
    if (!dom) continue;

    const g = ms.form.grid();

    g._cssPath = gridCss;

    g.title = item.title || "";
    g.fields = item.fields || [];
    g.fieldTypes = item.fieldTypes || [];
    g.data = item.data || [];

    g.mount(dom);
  }
}


/* ============ COMBO MODULE ======================= */
// ms.form.combo

ComboModule.registry = window.__MS_COMBO__ || {};
window.__MS_COMBO__ = ComboModule.registry;

ComboModule.renderCombo = function (el, cfg) {

  el.innerHTML = "";

  const c = ComboModule.createCombo(el, cfg);

  if (el.id) {
    ComboModule.registry[el.id] = c;
  }
};

ComboModule.createCombo = function (el, cfg) {

  if (el && el.id) {
    el.setAttribute('data-ms-id', el.id);
  }

  const c = {

    __msFormKind: 'combo',
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    _id: el?.id || null,
    _el: el || null,
    _selected: new Set(),

    searchText: '',
    isOpen: false,
    sessionItems: null,
    onChange: null,

    _items: [],
    _itemsSource: null,
    _itemsSourceLoaded: false,
    multiSelect: Array.isArray(cfg.value),

    // Optional component-specific CSS
    css: cfg.css || null,
    style: cfg.style || null,

    // Fixed collapsed width
    width: cfg.width || null,

    // Auto-detected from items
    keyField: null,
    textField: null,


    /* ================= INIT ================= */

    init() {

      this.data = cfg.data || [];

      if (this.multiSelect) {
        (cfg.value || []).forEach(v => this._selected.add(v));
      }
      else if (cfg.value != null) {
        this._selected.add(cfg.value);
      }

      if (this._el) {
        this.render();
        this.applyDefaultStyle();
      }
    },

    mount(el) {
      this._el = el?.el || el;
      if (!this._el) return;

      if (this._el.id) {
        this._el.setAttribute('data-ms-id', this._el.id);
      }
      this._el.setAttribute('data-ms-alias', 'mscombo');

      this.render();
      this.applyDefaultStyle();
    },

    /* ================= RENDER ================= */

    render() {

      const root = this._el;
      if (!root) return;

      const existingStyles = __ms_form_preserve_host_styles(root);

      root.style.position = 'relative';
      root.style.display = 'inline-block';
      __ms_form_apply_style(root, __ms_form_inline_style(this.style));

      if (this.width) {
        root.style.width = this.width + 'ch';
      }

      root.innerHTML = "";
      __ms_form_restore_host_styles(root, existingStyles);

      // COLLAPSED HEADER
      const header = document.createElement('div');

      header.className = 'ms-combo-header';

      header.innerHTML =
        '<span>' +
        this.displayText() +
        '</span>' +
        '<span style="float:right;font-size:18px;line-height:14px;padding-left:6px">&#9662;</span>';

      header.style.cursor = 'pointer';
      header.style.whiteSpace = 'nowrap';
      header.style.overflow = 'hidden';
      header.style.textOverflow = 'ellipsis';

      root.appendChild(header);

      // TOGGLE OPEN
      header.onclick = (e) => {

        e.stopPropagation();

        // OPENING
        if (!this.isOpen) {

          this.isOpen = true;

          // build stable session order
          const selectedSet =
            new Set(
              Array.from(this._selected)
                .map(x => String(x))
            );


          const items = [...this._items];

          items.sort((a, b) => {

            const aVal = String(a[this.keyField]);
            const bVal = String(b[this.keyField]);

            const aText =
              String(a[this.textField] || '')
                .toLowerCase();

            const bText =
              String(b[this.textField] || '')
                .toLowerCase();

            const aSelected = selectedSet.has(aVal);
            const bSelected = selectedSet.has(bVal);

            // selected first
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            // matched next
            const aMatch = aText.includes(
              (this.searchText || '')
                .trim()
                .toLowerCase()
            );

            const bMatch = bText.includes(
              (this.searchText || '')
                .trim()
                .toLowerCase()
            );

            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;

            return 0;
          });

          this.sessionItems = items;
        }

        // CLOSING
        else {

          this.isOpen = false;
        }

        this.render();
      };

      // CLOSED MODE
      if (!this.isOpen) {
        return;
      }

      // DROPDOWN
      const panel = document.createElement('div');

      panel.className = 'ms-combo-panel';

      panel.style.position = 'absolute';
      panel.style.background = '#fff';
      panel.style.border = '1px solid #ccc';
      panel.style.zIndex = '9999';

      panel.style.minWidth = '100%';
      panel.style.width = 'max-content';
      panel.style.maxHeight = 'none';
      panel.style.overflowX = 'hidden';
      panel.style.overflowY = 'hidden';

      panel.onmouseleave = () => {

        this.isOpen = false;

        // rebuild ordering next open
        this.sessionItems = null;

        this.render();
      };

      root.appendChild(panel);

      // SEARCH
      // SEARCH AREA (FIXED)
      const q =
        (this.searchText || '')
          .trim()
          .toLowerCase();

      const searchWrap =
        document.createElement('div');

      searchWrap.style.position = 'sticky';
      searchWrap.style.top = '0';
      searchWrap.style.background = '#fff';
      searchWrap.style.zIndex = '2';
      searchWrap.style.padding = '2px';

      const search =
        document.createElement('input');

      search.type = 'text';

      search.placeholder = 'Search...';

      search.value = this.searchText || '';

      search.style.width = '100%';
      search.style.boxSizing = 'border-box';

      searchWrap.appendChild(search);

      panel.appendChild(searchWrap);

      // SCROLLABLE ITEM AREA
      const list =
        document.createElement('div');

      list.className = 'ms-combo-list';
      list.style.maxHeight = '220px';
      list.style.boxSizing = 'border-box';
      list.style.overflowX = 'hidden';
      list.style.overflowY = 'auto';

      panel.appendChild(list);

      search.focus();

      search.oninput = () => {

        this.searchText = search.value;

        const pos = search.selectionStart;

        // remember focus source
        this._restoreSearchFocus = true;

        this.render();

        requestAnimationFrame(() => {

          if (!this._restoreSearchFocus) return;

          const s =
            root.querySelector('input[type="text"]');

          if (!s) return;

          s.focus();

          s.setSelectionRange(pos, pos);

          this._restoreSearchFocus = false;
        });
      };

      search.onclick = (e) => {
        e.stopPropagation();
      };

      // SORTING

      const baseItems =
        this.isOpen && this.sessionItems
          ? this.sessionItems
          : this._items;

      let items = [...baseItems];

      // SEARCH REORDER ONLY
      if (q) {

        items.sort((a, b) => {

          const aVal =
            String(a[this.keyField]);

          const bVal =
            String(b[this.keyField]);

          const aSelected =
            this.sessionItems
              ?.slice(
                0,
                Array.from(this._selected).length
              )
              .some(x =>
                String(x[this.keyField]) === aVal
              );

          const bSelected =
            this.sessionItems
              ?.slice(
                0,
                Array.from(this._selected).length
              )
              .some(x =>
                String(x[this.keyField]) === bVal
              );

          // keep selected block fixed
          if (aSelected && !bSelected) return -1;
          if (!aSelected && bSelected) return 1;

          const aText =
            String(a[this.textField] || '')
              .toLowerCase();

          const bText =
            String(b[this.textField] || '')
              .toLowerCase();

          const aMatch = aText.includes(q);
          const bMatch = bText.includes(q);

          // reorder ONLY inside same selected-group
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;

          return 0;
        });
      };

      // ITEMS
      items.forEach(item => {

        const row = document.createElement('div');

        row.className = 'ms-combo-row';

        const val = item[this.keyField];

        const text = item[this.textField];

        const isMatched =
          q &&
          text.toLowerCase().includes(q);

        // checkbox
        if (this.multiSelect) {

          const chk = document.createElement('input');

          chk.type = 'checkbox';

          chk.checked =
            Array.from(this._selected)
              .some(x => String(x) === String(val));

          chk.onchange = () => {

            chk.checked
              ? this._selected.add(val)
              : this._selected.delete(val);

            this.onChange?.(this.value);

            // update header ONLY
            const h =
              root.querySelector('.ms-combo-header span');

            if (h) {
              h.innerText = this.displayText();
            }
          };

          row.appendChild(chk);
        }

        // text
        const span = document.createElement('span');

        span.innerText = text;

        span.style.fontWeight =
          isMatched ? 'bold' : 'normal';

        row.appendChild(span);

        // single select
        row.onclick = () => {

          // MULTI SELECT
          if (this.multiSelect) {

            if (this._selected.has(val)) {
              this._selected.delete(val);
            }
            else {
              this._selected.add(val);
            }

            this.onChange?.(this.value);

            // update checkbox visually
            const chk =
              row.querySelector('input[type="checkbox"]');

            if (chk) {
              chk.checked =
                this._selected.has(val);
            }

            // update header ONLY
            const h =
              root.querySelector('.ms-combo-header span');

            if (h) {
              h.innerText = this.displayText();
            }

            return;
          }

          // SINGLE SELECT
          this._selected.clear();

          this._selected.add(val);

          this.isOpen = false;

          this.onChange?.(this.value);

          this.render();
        };

        list.appendChild(row);
      });
    },

    /* ================= DATA API ================= */

    get data() {
      return this._items;
    },

    set data(v) {

      const source = __ms_form_remote_data_source(v);

      if (source) {
        if (!source.rowsField) {
          throw new Error('ms.form.combo.data: remote data requires a JSON node');
        }

        this._itemsSource = source;
        this._itemsSourceLoaded = false;
        this.__setItems([], true);
        return;
      }

      this._itemsSource = null;
      this._itemsSourceLoaded = false;
      this.__setItems(v, true);
    },

    __setItems(v, render) {

      this._items = Array.isArray(v) ? v : [];

      // Auto-detect keyField and textField
      if (this._items.length > 0 && typeof this._items[0] === 'object') {

        const keys = Object.keys(this._items[0]);

        if (keys.length >= 1) {
          this.keyField = keys[0];
        }

        if (keys.length >= 2) {
          this.textField = keys[1];
        }
      }

      if (render && this._el) {
        this.render();
      }
    },

    __setRemoteItems(v) {
      this.__setItems(v, true);
      this._itemsSourceLoaded = true;
    },

    /* ================= VALUE API (FINAL) ================= */

    get value() {
      if (this._selected.size === 0) return null;
      if (this._selected.size === 1) return [...this._selected][0];
      return [...this._selected];
    },

    set value(v) {

      this._selected.clear();

      if (Array.isArray(v)) {

        v.forEach(x => this._selected.add(x));

        // auto multi ONLY if array has >1
        if (v.length > 1) {
          this.multiSelect = true;
        }
      }
      else if (v != null) {

        this._selected.add(v);
      }

      if (this._el) {
        this.render();
      }
    },

    /* ================= LOOKUP API ================= */

    getItem(key) {

      if (!this.keyField) return null;

      return (this._items || []).find(item =>
        String(item[this.keyField]) === String(key)
      ) || null;
    },

    getText(key) {

      const item = this.getItem(key);

      if (!item || !this.textField) return '';

      return item[this.textField] ?? '';
    },

    displayText() {

      const values = this.value;

      if (values == null) return 'Select';

      const arr = Array.isArray(values)
        ? values
        : [values];

      if (arr.length === 0) return 'Select';

      const firstText = this.getText(arr[0]);

      if (arr.length === 1) {
        return firstText;
      }

      return firstText + ' (+' + (arr.length - 1) + ' more..)';
    },

    /* ================= STYLE ================= */

    async applyDefaultStyle() {

      const cfg = window.MS_CONFIG || {};
      const styleCssPath = __ms_form_style_css_path(this.style);
      const inlineStyle = __ms_form_inline_style(this.style);
      const localCss = styleCssPath || this.css;
      const hasLocalStyle = !!inlineStyle || !!localCss;
      const defaultCss = __ms_form_default_css_for_control('combo', hasLocalStyle, this);
      const configCss = !hasLocalStyle && !defaultCss && !__ms_form_default_css_disabled(this)
        ? cfg.Combo_CSS
        : null;

      const css = defaultCss || localCss || configCss;

      const theme = cfg.Combo_Theme;

      if (!css) return;

      if (this.section) return;

      const scope = __ms_form_scope_selector_for_host(this._el);
      if (defaultCss && defaultCss !== localCss) {
        const applied = await __ms_form_apply_section_part_css(this, 'combo-default', defaultCss, scope, '');
        if (!applied && localCss) {
          await __ms_form_apply_section_part_css(this, 'combo-local', localCss, scope, '');
        }
      } else if (localCss) {
        await __ms_form_apply_section_part_css(this, 'combo-local', localCss, scope, '');
      } else if (configCss) {
        await __ms_form_apply_section_part_css(this, 'combo-config', configCss, scope, '');
      }

      if (theme) this._el.classList.add(theme);
    }

  };

  c.init();
  return c;
};


/* ========== GRID MODULE ======================================== */

function __ms_createComboFields(items) {

  const list =
    Array.isArray(items)
      ? items
      : (items ? [items] : []);

  if (typeof list.add !== 'function') {
    Object.defineProperty(list, 'add', {
      value(combo) {
        if (combo) {
          this.push(combo);
        }

        return this;
      },
      enumerable: false,
      configurable: true
    });
  }

  return list;
}

function __ms_grid_start_hover_scroll(track, direction) {
  let timer = null;

  const step = () => {
    track.scrollLeft += direction * 14;
  };

  return {
    start() {
      step();
      if (timer) return;
      timer = setInterval(step, 24);
    },

    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
  };
}

GridModule.create = function () {


  const g = {

    __msFormKind: 'grid',
    __msDefaultCssPolicy: __ms_form_default_css_policy(),
    _el: null,
    title: "",
    fields: [],
    fieldTypes: [],

    multiSelect: true,

    editButton: "",
    updateButton: "Update",
    deleteButton: "Delete",
    addButton: "Add New",

    customButtonsOnTopBar: [],
    customButtonsOnTitleBar: [],
    customButtonsRight: [],
    cancelButton: "Cancel",
    systemButtonsTop: false,

    editFunction: null,
    updateFunction: null,
    deleteFunction: null,
    addFunction: null,
    onRowTick: null,
    onRowSingleClick: null,
    onRowDoubleClick: null,

    _data: [],
    _dataFields: [],
    _rawData: [],
    _serverSource: null,
    _remoteArraySource: null,
    _serverTotal: 0,
    _serverRequestSequence: 0,
    _serverAbortController: null,
    _serverLoading: false,
    _dataJoinDefinition: null,
    _dataJoinRows: null,
    _dataJoinOutputFields: [],
    _rowColors: {},
    _cellColors: {},
    _buttonStripCleanups: [],
    _pendingGridScroll: null,

    bulkEdit: false,

    editFields: null,
    _editMeta: null,
    onTextLeave: null,
    onTextFocus: null,

    textLeave: null,
    textFocus: null,

    _textEventInput: null,

    _inTextEvent: false,
    _editRowIndex: null,

    hiddenFields: "",

    _comboFields: __ms_createComboFields(),

    get comboFields() {
      return this._comboFields;
    },

    set comboFields(v) {
      this._comboFields = __ms_createComboFields(v);

      if (this._rawData) {
        this.__assignGridRows(this._rawData);
      }
    },

    searchCustomMode: false,

    searchFields: "",

    sortFields: "",

    phonetic: false,

    _pageSize: 20,

    get pageSize() {
      return this._pageSize;
    },

    set pageSize(value) {
      const size = Math.max(1, Math.floor(Number(value) || 20));
      this._pageSize = size;

      if (this.state) {
        this.state.pageSize = size;
        this.state.page = 1;
      }
    },
    css: null,

    autoHeight: false,

    get data() {
      return this._data;
    },

    getRow(
      a,
      b
    ) {

      let rowIndex;
      let field;

      if (
        typeof a === 'string'
      ) {

        rowIndex =
          this.state.lastClicked;

        field = a;
      }
      else {

        rowIndex = a;
        field = b;
      }

      if (
        rowIndex == null
      ) {

        rowIndex =
          this.state.lastClicked;
      }

      if (
        rowIndex == null
      ) {
        return null;
      }

      const rec =
        this.toRecord(
          this._data[rowIndex]
        );

      if (!field)
        return rec;

      const k =
        Object.keys(rec)
          .find(x =>
            x.toLowerCase()
            ===
            String(field)
              .toLowerCase()
          );

      return k
        ? rec[k]
        : undefined;
    },

    getRowIndex() {

      return this.state.lastClicked;
    },

    setRowColor(
      a,
      b
    ) {

      let rowIndex;
      let color;

      if (
        b === undefined
      ) {

        rowIndex =
          this.state.lastClicked;

        color =
          a;
      }
      else {

        rowIndex = a;
        color = b;
      }

      if (
        rowIndex == null
      ) {
        return;
      }

      this._rowColors[rowIndex] =
        color;

      this.render();
    },

    setCellColor(
      a,
      b,
      c
    ) {

      let rowIndex;
      let field;
      let color;

      if (
        c === undefined
      ) {

        rowIndex =
          this.state.lastClicked;

        field =
          a;

        color =
          b;
      }
      else {

        rowIndex =
          a;

        field =
          b;

        color =
          c;
      }

      if (
        rowIndex == null
      ) {
        return;
      }

      const key =
        rowIndex +
        '|' +
        String(field)
          .toLowerCase();

      this._cellColors[key] =
        color;

      if (
        this._inTextEvent
      ) {

        if (
          this._textEventInput
        ) {

          this._textEventInput
            .style.background =
            color;
        }

        return;
      }

      this.render();
    },

    addRow(record) {

      const fields =
        this.__gridDataFields();

      const row =
        fields.map(f => {

          const key =
            this._getFieldKey(f);

          const k =
            Object.keys(record)
              .find(x =>
                x.toLowerCase()
                ===
                key.toLowerCase()
              );

          return k
            ? record[k]
            : '';
        });

      this._data.push(row);

      this.render();
    },
    insertRow(
      index,
      record
    ) {

      const fields =
        this.__gridDataFields();

      const row =
        fields.map(f => {

          const key =
            this._getFieldKey(f);

          const k =
            Object.keys(record)
              .find(x =>
                x.toLowerCase()
                ===
                key.toLowerCase()
              );

          return k
            ? record[k]
            : '';
        });

      this._data.splice(
        index,
        0,
        row
      );

      this.render();
    },

    removeRow(index) {

      if (
        index === undefined
      ) {

        index =
          this.state.lastClicked;
      }

      if (
        index == null
      ) {
        return;
      }

      this._data.splice(
        index,
        1
      );

      this.render();
    },

    removeTickedRows() {

      const rows =
        Array.from(
          this.state.selected
        )
          .sort(
            (a, b) => b - a
          );

      rows.forEach(i => {

        this._data.splice(
          i,
          1
        );
      });

      this.state.selected.clear();

      this.render();
    },

    setTick(
      index,
      tick = true
    ) {

      if (
        typeof index !== 'number'
      ) {

        tick =
          index ?? true;

        index =
          this.state.lastClicked;
      }

      if (
        index == null
      ) {
        return;
      }

      if (tick) {

        this.state.selected.add(
          index
        );
      }
      else {

        this.state.selected.delete(
          index
        );
      }

      this.render();
    },

    isTicked(index) {

      if (
        index === undefined
      ) {

        index =
          this.state.lastClicked;
      }

      if (
        index == null
      ) {
        return false;
      }

      return this.state.selected
        .has(index);
    },

    cloneRow(
      overrides = {}
    ) {

      const i =
        this.state.lastClicked;

      if (i == null)
        return;

      const rec =
        this.toRecord(
          this._data[i]
        );

      Object.keys(
        overrides
      ).forEach(k => {

        const real =
          Object.keys(rec)
            .find(x =>
              x.toLowerCase()
              ===
              k.toLowerCase()
            );

        if (real) {

          rec[real] =
            overrides[k];
        }
      });

      this.insertRow(
        i + 1,
        rec
      );
    },


    __assignGridRows(value) {
      const rows = Array.isArray(value) ? value : [];

      this._rawData = rows;
      this.__inferGridFields(rows);
      this._dataFields =
        this.__buildGridDataFields();

      if (rows.length === 0) {
        this._data = [];
        this._buildSearchCache();
        return;
      }

      const first = rows[0];

      if (Array.isArray(first)) {
        this._data = rows;
      }
      else if (typeof first === 'object') {
        const fields = this.__gridDataFields();

        if (!fields.length) {
          this._data = [];
          return;
        }

        this._data = rows.map(obj => {
          const keys = Object.keys(obj);

          return fields.map(f => {
            const key = this._getFieldKey(f);

            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              return obj[key];
            }

            const actual = keys.find(x =>
              x.toLowerCase() === String(key).toLowerCase()
            );

            return actual ? obj[actual] : undefined;
          });
        });
      }
      else {
        this._data = [];
      }

      this._buildSearchCache();
    },

    dataJoin(sourceOrService, endpointOrRelation, relation) {
      if (this._dataJoinDefinition) {
        throw new Error('ms.form.grid.dataJoin: only one join is supported');
      }

      let source = null;
      let joinedRows = null;
      let responseField = null;
      let relationText = relation;

      if (Array.isArray(sourceOrService)) {
        joinedRows = sourceOrService;
        relationText = endpointOrRelation;
      }
      else if (
        typeof sourceOrService === 'string' &&
        typeof endpointOrRelation === 'string' &&
        relation === undefined &&
        !endpointOrRelation.trim().startsWith('/') &&
        /(?:->|=)/.test(endpointOrRelation)
      ) {
        responseField = sourceOrService.trim();
        relationText = endpointOrRelation;

        if (!responseField) {
          throw new Error('ms.form.grid.dataJoin: response field is required');
        }
      }
      else {
        const sourceDescriptor = typeof this.__msCreateRemoteDataSource === 'function'
          ? this.__msCreateRemoteDataSource(sourceOrService, endpointOrRelation)
          : ms.data(sourceOrService, endpointOrRelation);
        source = __ms_form_remote_data_source(sourceDescriptor);

        if (!source) {
          throw new Error('ms.form.grid.dataJoin: invalid remote data source');
        }
      }

      this._dataJoinDefinition = {
        ...__ms_form_parse_data_join(relationText),
        source,
        responseField
      };
      this._dataJoinRows = joinedRows;

      if (this._el && (this._serverSource || this._remoteArraySource)) {
        void this.refresh();
      }
      else if (joinedRows && this._rawData.length) {
        this.__assignGridRows(
          this.__applyDataJoin(this._rawData, joinedRows)
        );

        if (this._el) this.render();
      }

      return this;
    },

    async __loadDataJoin(signal) {
      if (!this._dataJoinDefinition) return null;
      if (this._dataJoinRows) return this._dataJoinRows;
      if (this._dataJoinDefinition.responseField) return null;

      const response = await this._dataJoinDefinition.source.load({}, signal);
      const rows = Array.isArray(response)
        ? response
        : this.__serverResponseValue(response, 'rows');

      if (!Array.isArray(rows)) {
        throw new Error(
          'ms.form.grid.dataJoin: response must be an array or contain a rows array'
        );
      }

      this._dataJoinRows = rows;
      return rows;
    },

    __applyDataJoin(primaryRows, joinedRows) {
      if (!this._dataJoinDefinition) return primaryRows;

      const context = 'ms.form.grid.dataJoin';
      const { mainField, joinedField } = this._dataJoinDefinition;
      const relatedRows = Array.isArray(joinedRows) ? joinedRows : [];
      const outputFields = [];
      const outputNames = new Set();
      const groups = new Map();

      for (const related of relatedRows) {
        if (!related || typeof related !== 'object' || Array.isArray(related)) {
          throw new Error(`${context}: joined records must be objects`);
        }

        const relatedKey = __ms_form_data_field(
          related,
          joinedField,
          context
        );

        if (!relatedKey) {
          throw new Error(`${context}: joined field not found: ${joinedField}`);
        }

        for (const field of Object.keys(related)) {
          const normalized = field.toLowerCase();
          if (normalized === String(joinedField).toLowerCase()) continue;
          if (outputNames.has(normalized)) continue;

          outputNames.add(normalized);
          outputFields.push(field);
        }

        const key = __ms_form_data_join_key(related[relatedKey]);
        if (key == null) continue;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(related);
      }

      this._dataJoinOutputFields = outputFields;

      return primaryRows.map(primary => {
        if (!primary || typeof primary !== 'object' || Array.isArray(primary)) {
          throw new Error(`${context}: main records must be objects`);
        }

        const primaryKey = __ms_form_data_field(primary, mainField, context);
        if (!primaryKey) {
          throw new Error(`${context}: main field not found: ${mainField}`);
        }

        const result = { ...primary };
        const matches = groups.get(
          __ms_form_data_join_key(primary[primaryKey])
        ) || [];

        for (const outputField of outputFields) {
          const collision = __ms_form_data_field(result, outputField, context);
          if (collision) {
            throw new Error(
              `${context}: joined field conflicts with main field: ${outputField}`
            );
          }

          result[outputField] = matches.map(record => {
            const field = __ms_form_data_field(record, outputField, context);
            return field ? record[field] : null;
          });
        }

        return result;
      });
    },

    set data(value) {
      const serverSource = __ms_form_remote_data_source(value);

      if (serverSource) {
        if (serverSource.loadOnce) {
          throw new Error('ms.form.grid.data: the primary grid data cannot use load-once');
        }

        this._serverRequestSequence++;
        this._serverAbortController?.abort();
        this._serverSource = serverSource;
        this._remoteArraySource = null;
        this._serverTotal = 0;
        this.state.page = 1;
        this.state.pageCount = 1;
        this.state.filteredRows = null;
        this.__assignGridRows([]);

        if (this._el) {
          void this.refresh();
        }
        return;
      }

      this._serverRequestSequence++;
      this._serverAbortController?.abort();
      this._serverAbortController = null;
      this._serverSource = null;
      this._remoteArraySource = null;
      this._serverTotal = 0;
      this.__setServerBusy(false);
      this.__assignGridRows(
        this._dataJoinDefinition && this._dataJoinRows
          ? this.__applyDataJoin(value, this._dataJoinRows)
          : value
      );

      if (this._el) {
        this.render();
      }
    },

    __serverRequestParams() {
      const params = {
        page: this.state.page,
        pageSize: this.state.pageSize,
        searchMode: this.state.searchMode,
        sortDirection: this.state.sortDirection,
        phonetic: !!this.phonetic
      };

      if (this.state.searchMode === 1) {
        params.search = this.state.searchText || '';
        params.searchField = this.state.searchField || '';
      }
      else {
        const filters = {};

        for (const [field, value] of Object.entries(this.state.searchFieldsData || {})) {
          const text = String(value?.text || '').trim();
          if (text) filters[field] = text;
        }

        params.filters = JSON.stringify(filters);
      }

      if (this.state.sortField) {
        params.sortField = this.state.sortField;
      }

      const loadedOnce = [...new Set(
        (this.comboFields || [])
          .filter(combo =>
            combo?._itemsSource?.loadOnce &&
            combo._itemsSourceLoaded &&
            __ms_form_same_remote_data_source(combo._itemsSource, this._serverSource)
          )
          .map(combo => combo._itemsSource.rowsField)
          .filter(Boolean)
      )];

      if (loadedOnce.length) {
        params.msLoadedOnce = loadedOnce.join(',');
      }

      return params;
    },

    __serverResponseValue(response, field) {
      if (!response || typeof response !== 'object') return undefined;
      if (Object.prototype.hasOwnProperty.call(response, field)) return response[field];

      const wanted = String(field).toLowerCase();
      const key = Object.keys(response).find(name => name.toLowerCase() === wanted);
      return key ? response[key] : undefined;
    },

    __applyServerResponseComboItems(response) {
      for (const combo of this.comboFields || []) {
        const source = combo?._itemsSource;
        if (!source) continue;

        if (!__ms_form_same_remote_data_source(source, this._serverSource)) {
          throw new Error(
            'ms.form.grid.comboFields: remote combo data must use the same service and endpoint as the grid'
          );
        }

        const responseField = source.rowsField;

        const items = this.__serverResponseValue(response, responseField);
        if (items === undefined && source.loadOnce && combo._itemsSourceLoaded) {
          continue;
        }

        if (!Array.isArray(items)) {
          throw new Error(
            `Server grid response must contain a ${responseField} array`
          );
        }

        combo.__setRemoteItems(items);
      }
    },

    __resetLoadOnceComboItems() {
      for (const combo of this.comboFields || []) {
        if (combo?._itemsSource?.loadOnce) {
          combo._itemsSourceLoaded = false;
        }
      }
    },

    __setServerBusy(busy) {
      this._serverLoading = !!busy;
      if (!this._el) return;

      this._el.classList.toggle('ms-grid-loading', this._serverLoading);
      if (this._serverLoading) {
        this._el.setAttribute('aria-busy', 'true');
      }
      else {
        this._el.removeAttribute('aria-busy');
      }
    },

    async refresh(options = null) {
      const source = this._serverSource || this._remoteArraySource;

      if (!source) {
        if (this._el) this.render();
        return this._rawData;
      }

      const serverPaged = !!this._serverSource;

      if (options?.reloadOnce === true) {
        this.__resetLoadOnceComboItems();
      }

      const requestSequence = ++this._serverRequestSequence;
      this._serverAbortController?.abort();

      const controller = new AbortController();
      this._serverAbortController = controller;
      this.__setServerBusy(true);

      try {
        const [response, joinedRows] = await Promise.all([
          source.load(
            serverPaged ? this.__serverRequestParams() : {},
            controller.signal
          ),
          this.__loadDataJoin(controller.signal)
        ]);

        if (requestSequence !== this._serverRequestSequence) {
          return this._rawData;
        }

        if (Array.isArray(response)) {
          if ((this.comboFields || []).some(combo => combo?._itemsSource)) {
            throw new Error(
              'Server grid response must be an object when combo items use ms.data'
            );
          }

          this._remoteArraySource = source;
          this._serverSource = null;
          this._serverTotal = response.length;
          this.state.filteredRows = null;
          this.state.selected.clear();
          this.state.lastClicked = null;
          this.__assignGridRows(
            this.__applyDataJoin(response, joinedRows)
          );

          if (this._el) this.render();
          return this._rawData;
        }

        const rowsField = source.rowsField || 'rows';
        const rows = this.__serverResponseValue(response, rowsField);
        const totalValue = this.__serverResponseValue(response, 'total');
        const total = Number(totalValue);

        if (!Array.isArray(rows)) {
          throw new Error(`Server grid response must contain a ${rowsField} array`);
        }

        if (!Number.isFinite(total) || total < 0) {
          throw new Error('Server grid response must contain a non-negative total');
        }

        this._serverTotal = Math.floor(total);
        this.state.pageCount = Math.max(
          1,
          Math.ceil(this._serverTotal / this.state.pageSize)
        );

        if (this.state.page > this.state.pageCount) {
          this.state.page = this.state.pageCount;
          return this.refresh();
        }

        this.state.filteredRows = null;
        this.state.selected.clear();
        this.state.lastClicked = null;

        let responseJoinedRows = joinedRows;
        const joinResponseField = this._dataJoinDefinition?.responseField;
        if (joinResponseField) {
          responseJoinedRows = this.__serverResponseValue(response, joinResponseField);
          if (!Array.isArray(responseJoinedRows)) {
            throw new Error(
              `Server grid response must contain a ${joinResponseField} array`
            );
          }
        }

        this.__applyServerResponseComboItems(response);
        this.__assignGridRows(
          this.__applyDataJoin(rows, responseJoinedRows)
        );

        if (this._el) this.render();
        return this._rawData;
      }
      catch (error) {
        if (
          requestSequence !== this._serverRequestSequence &&
          (error?.name === 'AbortError' || error?.code === 'HTTP_ABORTED')
        ) {
          return this._rawData;
        }

        throw error;
      }
      finally {
        if (requestSequence === this._serverRequestSequence) {
          this._serverAbortController = null;
          this.__setServerBusy(false);
        }
      }
    },

    _fields: [],
    _fieldsExplicit: false,
    _colWidths: {},

    get fields() {
      return this._fields;
    },

    set fields(v) {
      this._fields = v || [];
      this._fieldsExplicit = Array.isArray(this._fields) && this._fields.length > 0;
      this._dataFields =
        this.__buildGridDataFields();

      if (this._rawData) {
        this.__assignGridRows(this._rawData);
      }
    },

    state: {

      selected: new Set(),

      lastClicked: null,

      page: 1,

      pageSize: 20,

      pageCount: 1,

      searchMode: 1,

      searchField: '',

      searchText: '',

      mode2: {},

      sortField: '',

      sortDirection: 'asc',

      searchFieldsData: {},

      filteredRows: null,

      searchTimer: null,

      updatedRows: new Set()

    },


    toRecord(row) {
      const fields = this.__gridDataFields();
      return fields.reduce((o, f, i) => {
        const key = this._getFieldKey(f);
        o[key] = row[i];
        return o;
      }, {});
    },

    getAllRows() {
      return (this._data || []).map(r => this.toRecord(r));
    },
    getRowCount() {

      return this._data.length;
    },
    getTickedRows() {
      return Array.from(this.state.selected)
        .map(i => this.toRecord(this._data[i]));
    },


    _getFieldKey(f) {

      return typeof f === 'object'
        ? (f.field || f.key)
        : f;
    },

    __sameFieldKey(a, b) {
      return String(a || '').toLowerCase() === String(b || '').toLowerCase();
    },

    __hiddenFieldList() {
      return (this.hiddenFields || "")
        .split(',')
        .map(x => x.trim())
        .filter(x => x);
    },

    __isHiddenFieldKey(key) {
      return this.__hiddenFieldList()
        .some(hidden => this.__sameFieldKey(hidden, key));
    },

    __gridDataFields() {
      return this._dataFields?.length
        ? this._dataFields
        : (this._fields || []);
    },

    __fieldIndex(field) {
      return this.__gridDataFields()
        .findIndex(f =>
          this.__sameFieldKey(
            this._getFieldKey(f),
            field
          )
        );
    },

    __fieldValue(row, field) {
      const index = this.__fieldIndex(field);
      if (index < 0) return undefined;
      return row?.[index];
    },

    __recordValue(record, field) {
      if (!record || typeof record !== 'object') return undefined;

      const key = Object.keys(record)
        .find(k => this.__sameFieldKey(k, field));

      return key ? record[key] : undefined;
    },

    __inferGridFields(rows) {
      if (this._fieldsExplicit || !Array.isArray(rows) || !rows.length) return;

      const sample = rows.find(row =>
        row && typeof row === 'object' && !Array.isArray(row)
      );

      if (!sample) return;

      this._fields = Object.keys(sample).map(key => {
        const combo = (this.comboFields || []).find(item =>
          item?.keyField && this.__sameFieldKey(item.keyField, key)
        );

        return {
          field: combo?.textField || key,
          label: combo?.textField || key
        };
      });

      const scalarKeys = this._fields
        .map(field => this._getFieldKey(field))
        .filter(key => {
          if (this.__isHiddenFieldKey(key)) return false;
          if ((this.comboFields || []).some(combo =>
            combo?.textField && this.__sameFieldKey(combo.textField, key)
          )) return false;
          const value = this.__recordValue(sample, key);
          return value == null || typeof value !== 'object';
        });

      if (!String(this.searchFields || '').trim()) {
        this.searchFields = scalarKeys.join(', ');
      }

      if (!String(this.sortFields || '').trim()) {
        this.sortFields = scalarKeys.join(', ');
      }
    },

    __buildGridDataFields() {
      const fields = [...(this._fields || [])];

      const addField = (field) => {
        const key = this._getFieldKey(field);
        if (!key) return;

        const exists =
          fields.some(f =>
            this.__sameFieldKey(
              this._getFieldKey(f),
              key
            )
          );

        if (!exists) {
          fields.push(field);
        }
      };

      this.__hiddenFieldList()
        .forEach(addField);

      (this.comboFields || [])
        .forEach(combo => {
          addField(combo?.keyField);
          addField(combo?.textField);
        });

      (this._dataJoinOutputFields || [])
        .forEach(addField);

      return fields;
    },

    mount(el) {

      if (!this.editFunction) {

        this.editFunction = () => {

          const row =
            this.state.lastClicked ??
            [...this.state.selected][0] ??
            0;

          this._editRowIndex = row;

          this.render();

          return true;
        };
      }

      this._el = el?.el || el;

      if (this._el && this._el.id) {
        this._el.setAttribute('data-ms-id', this._el.id);
        this._el.setAttribute('data-ms-alias', 'msgrid');
      }

      if (this.editFields) {
        this._editMeta = __ms_parseEditFields(this.editFields);
      }

      this.state.pageSize = this.pageSize;
      this.render();
      this.applyDefaultStyle();

      if (this._serverSource || this._remoteArraySource) {
        return this.refresh();
      }
    },

    _normalize(s) {

      return (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    },

    _soundex(text) {

      text = this._normalize(text);

      if (!text)
        return '';

      const map = {
        b: 1, f: 1, p: 1, v: 1,
        c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
        d: 3, t: 3,
        l: 4,
        m: 5, n: 5,
        r: 6
      };

      const first = text[0].toUpperCase();

      let prev = '';
      let out = first;

      for (let i = 1; i < text.length; i++) {

        const ch = text[i];

        const code = map[ch] || '';

        if (code !== prev) {

          out += code;
        }

        if (code)
          prev = code;
      }

      out =
        out.replace(/0/g, '');

      return (
        out + '0000'
      ).substring(0, 4);
    },

    _getSortValue(v) {

      if (v == null)
        return '';

      if (typeof v === 'number')
        return v;

      const s =
        String(v).trim();

      const n =
        Number(s);

      if (!isNaN(n))
        return n;

      const d =
        Date.parse(s);

      if (!isNaN(d))
        return d;

      return s.toLowerCase();
    },

    _applyPaging(rows) {

      if (this._serverSource) {
        return rows;
      }

      this.state.pageCount =
        Math.max(
          1,
          Math.ceil(
            rows.length /
            this.state.pageSize
          )
        );

      const start =
        (this.state.page - 1) *
        this.state.pageSize;

      return rows.slice(
        start,
        start + this.state.pageSize
      );
    },

    _buildRank(
      exact
    ) {

      if (!exact)
        return '';

      return '\u2605'.repeat(exact);
    },

    _buildSearchCache() {

      this._searchCache = [];

      if (
        !this.searchFields ||
        !this._data?.length
      )
        return;

      const fields =
        this.searchFields
          .split(',')
          .map(s => s.trim());

      for (
        let rowIndex = 0;
        rowIndex < this._data.length;
        rowIndex++
      ) {

        const row =
          this._data[rowIndex];

        const cacheRow = {

          rowIndex,

          fields: {}
        };

        for (const field of fields) {

          const colIndex =
            this._fields.findIndex(
              f =>
                this._getFieldKey(f)
                === field
            );

          if (colIndex < 0)
            continue;

          const raw =
            row[colIndex] == null
              ? ''
              : String(row[colIndex]);

          const norm =
            this._normalize(raw);

          cacheRow.fields[field] = {

            raw,

            norm,

            soundex:
              this._soundex(norm)
          };
        }

        this._searchCache.push(
          cacheRow
        );
      }
    },

    _searchMode1() {

      const text =
        this.state.searchText;

      if (!text) {

        this.state.filteredRows =
          null;

        return;
      }

      const words =
        text
          .trim()
          .split(/\s+/)
          .slice(0, 3)
          .map(w =>
            this._normalize(w)
          )
          .filter(Boolean);

      if (!words.length) {

        this.state.filteredRows =
          null;

        return;
      }

      const field =
        this.state.searchField;

      const map =
        new Map();

      for (const row of this._searchCache) {

        const data =
          row.fields[field];

        if (!data)
          continue;

        let exact = 0;

        let phonetic = 0;

        for (const word of words) {

          if (
            data.norm.includes(word)
          ) {

            exact++;

            continue;
          }

          if (
            this.phonetic &&
            data.soundex ===
            this._soundex(word)
          ) {

            phonetic++;
          }
        }

        const score =
          exact || phonetic;

        if (!score)
          continue;

        const existing =
          map.get(row.rowIndex);

        const result = {

          rowIndex:
            row.rowIndex,

          exact,

          phonetic:
            !exact && phonetic,

          rank:
            this._buildRank(
              exact || phonetic
            )
        };

        if (
          !existing ||
          existing.exact < exact
        ) {

          map.set(
            row.rowIndex,
            result
          );
        }
      }

      this.state.filteredRows =
        [...map.values()]
          .sort((a, b) => {

            if (
              a.phonetic !==
              b.phonetic
            ) {

              return a.phonetic
                ? 1
                : -1;
            }

            if (
              b.exact !== a.exact
            ) {

              return (
                b.exact -
                a.exact
              );
            }

            return (
              a.rowIndex -
              b.rowIndex
            );
          });
    },

    _searchMode2() {

      const fields =
        this.state.searchFieldsData;

      const results = [];

      for (const row of this._searchCache) {

        let ok = true;
        let exactCount = 0;
        let phoneticCount = 0;
        let hasPhonetic = false;

        for (const key in fields) {

          const cfg =
            fields[key];

          if (!cfg.text)
            continue;

          const search =
            this._normalize(
              cfg.text
            );

          const data =
            row.fields[key];

          if (!data) {

            ok = false;

            break;
          }

          const exact =
            data.norm.includes(
              search
            );

          const phonetic =
            this.phonetic &&
            !exact &&
            (
              data.soundex ===
              this._soundex(search)
            );

          if (
            !exact &&
            !phonetic
          ) {

            ok = false;

            break;
          }

          if (exact) {

            exactCount++;
          }
          else {

            phoneticCount++;
            hasPhonetic = true;
          }
        }

        if (ok) {

          results.push({

            rowIndex:
              row.rowIndex,

            exact:
              exactCount,

            phonetic:
              hasPhonetic,

            rank:
              this._buildRank(
                exactCount ||
                phoneticCount
              )
          });
        }
      }

      this.state.filteredRows =
        results
          .sort((a, b) => {

            if (
              a.phonetic !==
              b.phonetic
            ) {

              return a.phonetic
                ? 1
                : -1;
            }

            if (
              b.exact !== a.exact
            ) {

              return (
                b.exact -
                a.exact
              );
            }

            return (
              a.rowIndex -
              b.rowIndex
            );
          });
    },

    _executeSearch() {

      this.state.page = 1;

      if (this._serverSource) {
        this.state.filteredRows = null;
        return this.refresh();
      }

      if (
        this.searchCustomMode
      )
        return;

      if (
        this.state.searchMode == 1
      ) {

        this._searchMode1();
      }
      else {

        this._searchMode2();
      }

      this.render();
    },

    _applySort(rows) {

      if (this._serverSource) {
        return rows;
      }

      const field =
        this.state.sortField;

      if (!field)
        return rows;

      const colIndex =
        this._fields.findIndex(
          f =>
            this._getFieldKey(f)
            === field
        );

      if (colIndex < 0)
        return rows;

      const dir =
        this.state.sortDirection
          === 'asc'
          ? 1
          : -1;

      return [...rows].sort(
        (a, b) => {

          const av =
            this._getSortValue(
              a.row[colIndex]
            );

          const bv =
            this._getSortValue(
              b.row[colIndex]
            );

          if (av < bv)
            return -1 * dir;

          if (av > bv)
            return 1 * dir;

          return 0;
        }
      );
    },

    __applySystemButtonClass(button, label) {
      if (label === this.editButton) {
        button.classList.add('ms-grid-btn-edit');
      }

      if (label === this.updateButton) {
        button.classList.add('ms-grid-btn-update');
      }

      if (label === this.cancelButton) {
        button.classList.add('ms-grid-btn-cancel');
      }

      if (label === this.deleteButton) {
        button.classList.add('ms-grid-btn-delete');
      }
    },

    __buttonContext(rowIndex = null) {
      const row =
        rowIndex == null
          ? null
          : this._data[rowIndex];

      return {
        rowIndex,
        data: row,
        record: row ? this.toRecord(row) : null,
        selectedIndexes: Array.from(this.state.selected),
        selectedRecords: this.getTickedRows(),
        grid: this
      };
    },

    // Text inputs are browser elements until Update is pressed. Commit them
    // first so updateFunction receives the same values the user can see.
    __commitEditableRow(rowIndex) {
      const rowEl = this.__rowElementForIndex(rowIndex);
      const row = this._data[rowIndex];

      if (!rowEl || !Array.isArray(row)) return;

      const visibleFields = this.__gridDataFields()
        .filter(field =>
          !this.__isHiddenFieldKey(this._getFieldKey(field))
        );
      // Every row has a rank cell; multi-select adds its checkbox before it.
      const offset = this.multiSelect ? 2 : 1;

      visibleFields.forEach((field, visibleIndex) => {
        const key = this._getFieldKey(field);
        const isComboDisplayField = (this.comboFields || []).some(combo =>
          combo && this.__sameFieldKey(combo.textField, key)
        );

        // Combo clones commit their key value through onChange.
        if (isComboDisplayField) return;

        const cell = rowEl.querySelectorAll('td')[visibleIndex + offset];
        const input = cell?.querySelector('input, textarea, select');
        const columnIndex = this.__fieldIndex(key);

        if (input && columnIndex >= 0) {
          const previousValue = row[columnIndex];
          const numericValue = Number(input.value);

          row[columnIndex] =
            typeof previousValue === 'number' &&
              input.value.trim() !== '' &&
              Number.isFinite(numericValue)
              ? numericValue
              : input.value;
        }
      });
    },

    __rowElementForIndex(rowIndex) {
      const root = this._el;
      if (!root || rowIndex == null) return null;

      return [...root.querySelectorAll('tbody tr')]
        .find(row =>
          Number(row.dataset.msRowIndex) === Number(rowIndex)
        ) || null;
    },

    __activateCurrentRow(rowIndex, rowEl = null) {
      if (
        rowIndex == null ||
        rowIndex < 0 ||
        rowIndex >= this._data.length
      ) {
        return;
      }

      this.state.lastClicked = rowIndex;

      const root = this._el;
      if (!root) return;

      const activeRow =
        rowEl || this.__rowElementForIndex(rowIndex);

      root.querySelectorAll('tbody tr.ms-current-row')
        .forEach(row => {
          if (row !== activeRow) {
            row.classList.remove('ms-current-row');
          }
        });

      activeRow?.classList.add('ms-current-row');
    },

    __wireCurrentRowActivation(el, rowIndex, rowEl = null) {
      if (!el) return;

      const activate = () => {
        this.__activateCurrentRow(rowIndex, rowEl);
      };

      el.addEventListener('pointerdown', activate, true);
      el.addEventListener('focusin', activate);
    },

    __createCustomGridButton(btn) {
      if (!btn) return null;

      const b = document.createElement('button');

      if (btn.image) {
        b.style.backgroundImage =
          `url(${btn.image})`;
        b.style.backgroundSize =
          '16px 16px';
        b.style.backgroundRepeat =
          'no-repeat';
        b.style.backgroundPosition =
          '6px center';
        b.style.paddingLeft =
          '26px';
        b.innerText =
          btn.text || '';
      }
      else if (btn.icon) {
        b.innerText =
          btn.icon + ' ' +
          (btn.text || '');
      }
      else {
        b.innerText =
          btn.text || '';
      }

      if (btn.className) {
        b.className =
          btn.className;
      }

      b.onclick = (e) => {
        e.stopPropagation();
        btn.click?.(
          this.__buttonContext(
            this._editRowIndex != null
              ? this._editRowIndex
              : this.state.lastClicked
          )
        );
      };

      return b;
    },

    __createTopSystemButtons() {
      const buttons = [];
      const currentEditing =
        this._editRowIndex != null;

      const addSystemBtn =
        (label, fn, type) => {
          if (!label) return;

          const b =
            document.createElement('button');

          b.innerText =
            label;

          this.__applySystemButtonClass(
            b,
            label
          );

          b.onclick = (e) => {
            e.stopPropagation();

            const currentRow =
              this._editRowIndex != null
                ? this._editRowIndex
                : this.state.lastClicked;

            if (
              currentRow == null ||
              currentRow < 0 ||
              currentRow >= this._data.length
            ) {
              return;
            }

            if (type === 'edit') {
              this._originalEditRecord =
                JSON.parse(
                  JSON.stringify(
                    this._data[currentRow]
                  )
                );

              this._editRowIndex =
                currentRow;

              this.__renderPreservingGridScroll();
              return;
            }

            if (type === 'cancel') {
              this._data[currentRow] =
                JSON.parse(
                  JSON.stringify(
                    this._originalEditRecord
                  )
                );

              this._editRowIndex =
                null;

              this.__renderPreservingGridScroll();
              return;
            }

            if (type === 'update') {
              this.__commitEditableRow(currentRow);
            }

            const r =
              fn?.(
                this.__buttonContext(
                  currentRow
                )
              );

            Promise.resolve(r)
              .then(res => {
                const ok =
                  res === true ||
                  (
                    res &&
                    res.ok === true
                  );

                if (
                  ok &&
                  type === 'update'
                ) {
                  this.state.updatedRows
                    .add(currentRow);

                  this._editRowIndex =
                    null;

                  this.__renderPreservingGridScroll();
                }

                if (
                  ok &&
                  type === 'delete'
                ) {
                  this._data.splice(
                    currentRow,
                    1
                  );

                  this._editRowIndex =
                    null;

                  this.state.lastClicked =
                    null;

                  this.__renderPreservingGridScroll();
                }
              });
          };

          buttons.push(b);
        };

      if (!currentEditing && !this.bulkEdit) {
        addSystemBtn(
          this.editButton,
          this.editFunction,
          'edit'
        );
      }
      else {
        addSystemBtn(
          this.updateButton,
          this.updateFunction,
          'update'
        );

        addSystemBtn(
          this.cancelButton,
          null,
          'cancel'
        );
      }

      addSystemBtn(
        this.deleteButton,
        this.deleteFunction,
        'delete'
      );

      return buttons;
    },

    __createButtonStrip(buttons, className) {
      const items =
        (buttons || []).filter(Boolean);

      if (!items.length) return null;

      const wrap =
        document.createElement('span');

      wrap.className =
        `ms-grid-button-strip ${className || ''}`.trim();
      wrap.style.display =
        'inline-flex';
      wrap.style.alignItems =
        'center';
      wrap.style.gap =
        '3px';
      wrap.style.minWidth =
        '0';
      wrap.style.maxWidth =
        '100%';
      wrap.style.verticalAlign =
        'middle';
      wrap.style.whiteSpace =
        'nowrap';

      const left =
        document.createElement('button');
      left.type =
        'button';
      left.className =
        'ms-grid-button-strip-arrow';
      left.innerText =
        '<';

      const right =
        document.createElement('button');
      right.type =
        'button';
      right.className =
        'ms-grid-button-strip-arrow';
      right.innerText =
        '>';

      [left, right].forEach(arrow => {
        arrow.style.display =
          'none';
        arrow.style.alignItems =
          'center';
        arrow.style.justifyContent =
          'center';
        arrow.style.width =
          '18px';
        arrow.style.minWidth =
          '18px';
        arrow.style.padding =
          '0';
        arrow.style.lineHeight =
          '1';
      });

      const track =
        document.createElement('span');

      track.className =
        'ms-grid-button-strip-track';
      track.style.display =
        'inline-flex';
      track.style.alignItems =
        'center';
      track.style.gap =
        '4px';
      track.style.overflowX =
        'hidden';
      track.style.overflowY =
        'hidden';
      track.style.scrollbarWidth =
        'none';
      track.style.msOverflowStyle =
        'none';
      track.style.minWidth =
        '0';
      track.style.maxWidth =
        '100%';
      track.style.flex =
        '1 1 auto';
      track.style.whiteSpace =
        'nowrap';

      items.forEach(button =>
        track.appendChild(button)
      );

      const updateArrows = () => {
        const overflow =
          track.scrollWidth >
          track.clientWidth + 1;

        left.style.display =
          overflow
            ? 'inline-flex'
            : 'none';

        right.style.display =
          overflow
            ? 'inline-flex'
            : 'none';

        if (!overflow) return;

        left.style.visibility =
          track.scrollLeft > 0
            ? 'visible'
            : 'hidden';

        right.style.visibility =
          track.scrollLeft + track.clientWidth <
            track.scrollWidth - 1
            ? 'visible'
            : 'hidden';
      };

      const leftScroll =
        __ms_grid_start_hover_scroll(
          track,
          -1
        );

      const rightScroll =
        __ms_grid_start_hover_scroll(
          track,
          1
        );

      const stopAll = () => {
        leftScroll.stop();
        rightScroll.stop();
        updateArrows();
      };

      this._buttonStripCleanups =
        this._buttonStripCleanups || [];

      this._buttonStripCleanups.push(
        stopAll
      );

      left.addEventListener(
        'mouseenter',
        leftScroll.start
      );
      right.addEventListener(
        'mouseenter',
        rightScroll.start
      );

      left.addEventListener(
        'mouseleave',
        stopAll
      );
      right.addEventListener(
        'mouseleave',
        stopAll
      );

      left.addEventListener(
        'blur',
        stopAll
      );
      right.addEventListener(
        'blur',
        stopAll
      );

      left.onclick = (e) => {
        e.stopPropagation();
        track.scrollLeft -= 90;
        updateArrows();
      };

      right.onclick = (e) => {
        e.stopPropagation();
        track.scrollLeft += 90;
        updateArrows();
      };

      track.addEventListener(
        'scroll',
        updateArrows
      );

      wrap.appendChild(left);
      wrap.appendChild(track);
      wrap.appendChild(right);

      requestAnimationFrame(updateArrows);
      setTimeout(updateArrows, 60);

      if (typeof ResizeObserver !== 'undefined') {
        const observer =
          new ResizeObserver(updateArrows);

        observer.observe(track);
        observer.observe(wrap);

        this._buttonStripCleanups.push(
          () => observer.disconnect()
        );
      }

      return wrap;
    },

    __cleanupButtonStrips() {
      (this._buttonStripCleanups || [])
        .forEach(cleanup => {
          try {
            cleanup();
          } catch {
            // Ignore cleanup failures during render replacement.
          }
        });

      this._buttonStripCleanups = [];
    },

    __saveGridScrollForNextRender() {
      const scroll =
        this._el?.querySelector(
          '.ms-grid-scroll'
        );

      this._pendingGridScroll =
        scroll
          ? {
            top: scroll.scrollTop,
            left: scroll.scrollLeft
          }
          : null;
    },

    __restoreGridScrollAfterRender() {
      const saved =
        this._pendingGridScroll;

      this._pendingGridScroll =
        null;

      if (!saved) return;

      const scroll =
        this._el?.querySelector(
          '.ms-grid-scroll'
        );

      if (!scroll) return;

      const apply = () => {
        scroll.scrollTop =
          saved.top;
        scroll.scrollLeft =
          saved.left;
      };

      apply();

      requestAnimationFrame(apply);
    },

    __renderPreservingGridScroll() {
      this.__saveGridScrollForNextRender();
      this.render();
    },

    render() {

      const root = this._el;
      if (!root) return;
      this.__cleanupButtonStrips();

      this._buildSearchCache();

      const comboByKey =
        new Map();

      (this.comboFields || []).forEach(c => {

        if (c?.keyField) {
          comboByKey.set(
            String(c.keyField).toLowerCase(),
            c
          );
        }

        if (c?.textField) {
          comboByKey.set(
            String(c.textField).toLowerCase(),
            c
          );
        }
      });

      const existingStyles = __ms_form_preserve_host_styles(root);
      root.innerHTML = "";
      __ms_form_restore_host_styles(root, existingStyles);

      const container = document.createElement('div');
      container.className = 'ms-grid-root';
      if (this.autoHeight) {

        container.classList.add(
          'ms-grid-auto-height'
        );
      }

      if (this.autoHeight) {

        container.style.height =
          'auto';
      }
      else if (this.height) {

        container.style.height =
          this.height + 'px';
      }

      if (this.title) {

        const titleBar = document.createElement('div');
        titleBar.className = 'ms-grid-title';
        titleBar.style.display = 'flex';
        titleBar.style.alignItems = 'center';
        titleBar.style.gap = '8px';
        titleBar.style.minWidth = '0';

        const titleText = document.createElement('span');
        titleText.innerText = this.title;
        titleText.style.flex = '1 1 auto';
        titleText.style.minWidth = '0';
        titleText.style.overflow = 'hidden';
        titleText.style.textOverflow = 'ellipsis';
        titleText.style.whiteSpace = 'nowrap';

        titleBar.appendChild(titleText);

        const titleButtons =
          this.__createButtonStrip(
            (this.customButtonsOnTitleBar || [])
              .map(btn =>
                this.__createCustomGridButton(btn)
              ),
            'ms-grid-title-buttons'
          );

        if (titleButtons) {
          titleText.style.flex =
            '0 1 auto';
          titleText.style.maxWidth =
            '42%';
          titleButtons.style.flex =
            '1 1 0';
          titleButtons.style.maxWidth =
            'none';
          titleButtons.style.minWidth =
            '0';
          titleButtons.style.marginLeft =
            '0';
          titleBar.appendChild(
            titleButtons
          );
        }

        container.appendChild(titleBar);
      }


      const searchBar =
        document.createElement('div');

      searchBar.className =
        'ms-grid-searchbar';
      searchBar.style.display =
        'flex';
      searchBar.style.alignItems =
        'center';
      searchBar.style.gap =
        '8px';
      searchBar.style.minWidth =
        '0';
      searchBar.style.flexWrap =
        'wrap';

      const searchControls =
        document.createElement('span');

      searchControls.className =
        'ms-grid-search-controls';
      searchControls.style.display =
        'inline-flex';
      searchControls.style.alignItems =
        'center';
      searchControls.style.gap =
        '4px';
      searchControls.style.flex =
        '0 1 auto';
      searchControls.style.flexWrap =
        'wrap';
      searchControls.style.minWidth =
        '0';
      searchControls.style.maxWidth =
        '100%';

      if (!this.searchCustomMode) {
        const modeSel =
          document.createElement('select');

        modeSel.innerHTML = `
    <option value="1">Mode 1</option>
    <option value="2">Mode 2</option>
  `;

        modeSel.value =
          this.state.searchMode;

        modeSel.onchange = () => {

          this.state.searchMode =
            Number(modeSel.value);

          this.state.page = 1;

          if (this._serverSource) {
            void this.refresh();
          }
          else {
            this.render();
          }
        };

        const searchLbl =
          document.createElement('label');

        searchLbl.className =
          'ms-grid-label';

        searchLbl.innerText =
          'Search ';

        searchControls.appendChild(
          searchLbl
        );
        searchControls.appendChild(modeSel);

        if (this.state.searchMode === 2) {

          searchControls.appendChild(document.createTextNode('\u00A0\u00A0\u00A0'));

        }

        searchControls.appendChild(
          document.createTextNode(' ')
        );


        if (this.state.searchMode === 1) {

          const onLbl =
            document.createElement('label');

          onLbl.className =
            'ms-grid-label';

          onLbl.style.marginLeft =
            '8px';

          onLbl.innerText = ': ';

          searchControls.appendChild(onLbl);

          const fieldSel =
            document.createElement('select');

          const fields =
            this.searchFields
              .split(',')
              .map(s => s.trim());

          fields.forEach(key => {

            const f =
              this._fields.find(x =>
                this._getFieldKey(x) === key
              );

            const opt =
              document.createElement('option');

            opt.value = key;

            opt.innerText =
              f?.label || key;

            fieldSel.appendChild(opt);
          });

          this.state.searchField =
            this.state.searchField
            || fields[0];

          fieldSel.value =
            this.state.searchField;

          fieldSel.onchange = () => {

            this.state.searchField =
              fieldSel.value;

            this._executeSearch();
          };

          searchControls.appendChild(fieldSel);
          searchControls.appendChild(
            document.createTextNode('  \u279C  ')
          );

          const txt =
            document.createElement('input');

          txt.type = 'text';

          txt.placeholder =
            'Enter up to 3 partial words.';
          txt.style.width =
            '260px';

          txt.value =
            this.state.searchText;

          txt.oninput = () => {

            const words =
              txt.value
                .trim()
                .split(/\s+/);

            if (words.length > 3) {

              txt.value =
                words
                  .slice(0, 3)
                  .join(' ');
            }

            this.state.searchText =
              txt.value;

            clearTimeout(
              this.state.searchTimer
            );

            this.state.searchTimer =
              setTimeout(() => {

                const active =
                  document.activeElement;

                const start =
                  txt.selectionStart;

                const end =
                  txt.selectionEnd;

                Promise.resolve(this._executeSearch()).finally(() => {
                  requestAnimationFrame(() => {
                    const newTxt =
                      root.querySelector(
                        '.ms-grid-searchbar input[type="text"]'
                      );

                    if (!newTxt)
                      return;

                    newTxt.focus();

                    newTxt.setSelectionRange(
                      start,
                      end
                    );
                  });
                });

              }, 250);
          };

          searchControls.appendChild(txt);
        }

        else {

          const fields =
            this.searchFields
              .split(',')
              .map(s => s.trim());

          fields.forEach(key => {

            const state =
              this.state.searchFieldsData[key]
              || {
                text: ''
              };

            const wrap =
              document.createElement('span');

            wrap.style.display =
              'inline-flex';
            wrap.style.alignItems =
              'center';
            wrap.style.gap =
              '4px';
            wrap.style.whiteSpace =
              'nowrap';
            wrap.style.flex =
              '0 0 auto';
            wrap.style.marginRight =
              '12px';

            const f =
              this._fields.find(x =>
                this._getFieldKey(x)
                === key
              );

            const lbl =
              document.createElement('label');

            lbl.className =
              'ms-grid-label';

            // lbl.innerText = (f?.label || key)  + ' \u25D0';  // ◐
            lbl.innerText = (f?.label || key)
            wrap.appendChild(lbl);

            const txt =
              document.createElement('input');

            txt.type = 'text';

            txt.value =
              state.text || '';

            txt.style.width =
              '110px';

            txt.oninput = () => {

              state.text =
                txt.value;

              this.state
                .searchFieldsData[key]
                = state;

              clearTimeout(
                this.state.searchTimer
              );

              this.state.searchTimer =
                setTimeout(() => {

                  const start =
                    txt.selectionStart;

                  const end =
                    txt.selectionEnd;

                  Promise.resolve(this._executeSearch()).finally(() => {
                    requestAnimationFrame(() => {
                      const inputs =
                        root.querySelectorAll(
                          '.ms-grid-searchbar input[type="text"]'
                        );

                      for (const i of inputs) {
                        if (
                          i.value === txt.value
                        ) {
                          i.focus();

                          i.setSelectionRange(
                            start,
                            end
                          );

                          break;
                        }
                      }
                    });
                  });

                }, 250);
            };

            wrap.appendChild(txt);

            if (
              key !==
              fields[fields.length - 1]
            ) {

              const andLbl =
                document.createElement('label');

              andLbl.className =
                'ms-grid-label';

              andLbl.style.margin =
                '0 10px';

              andLbl.innerText =
                ' And';

              wrap.appendChild(andLbl);
            }

            searchControls.appendChild(wrap);
          });
        }

      }

      searchBar.appendChild(
        searchControls
      );

      const topButtons = [
        ...(
          this.systemButtonsTop
            ? this.__createTopSystemButtons()
            : []
        ),
        ...(this.customButtonsOnTopBar || [])
          .map(btn =>
            this.__createCustomGridButton(btn)
          )
      ];

      const topButtonStrip =
        this.__createButtonStrip(
          topButtons,
          'ms-grid-top-buttons'
        );

      if (topButtonStrip) {
        topButtonStrip.style.flex =
          '1 1 180px';
        topButtonStrip.style.maxWidth =
          'none';
        topButtonStrip.style.minWidth =
          'min(100%, 160px)';
        topButtonStrip.style.marginLeft =
          '0';
        searchBar.appendChild(
          topButtonStrip
        );
      }

      container.appendChild(searchBar);


      const scroll =
        document.createElement('div');

      scroll.className =
        'ms-grid-scroll';

      const table =
        document.createElement('table');

      table.className =
        'ms-grid-table';

      const thead =
        document.createElement('thead');

      const header =
        document.createElement('tr');
      if (this.multiSelect) {
        const cell =
          document.createElement('th');
        header.appendChild(cell);
      }

      const rankHeader =
        document.createElement('th');

      rankHeader.style.width =
        '55px';

      rankHeader.innerText = '';

      header.appendChild(rankHeader);

      (this.fields || []).forEach(f => {

        const key = this._getFieldKey(f);

        if (this.__isHiddenFieldKey(key)) return;

        const label = typeof f === 'object'
          ? (f.label || f.field || f.key)
          : f;

        const cell =
          document.createElement('th');
        cell.innerText = label;

        const sortFields =
          (this.sortFields || '')
            .split(',')
            .map(s => s.trim());

        if (
          sortFields.includes(key)
        ) {

          const arrow =
            document.createElement('span');

          arrow.style.float =
            'right';

          arrow.style.marginLeft =
            '6px';

          arrow.innerText =
            this.state.sortField === key
              ? (
                this.state.sortDirection === 'asc'
                  ? '\u25B2'
                  : '\u25BC'
              )
              : '\u2195';   // '▼'  '▲'  '↕'

          cell.appendChild(arrow);

          cell.style.cursor =
            'pointer';

          cell.onclick = () => {

            if (
              this.state.sortField === key
            ) {

              this.state.sortDirection =
                this.state.sortDirection === 'asc'
                  ? 'desc'
                  : 'asc';
            }
            else {

              this.state.sortField = key;

              this.state.sortDirection = 'asc';
            }

            this.state.page = 1;

            if (this._serverSource) {
              void this.refresh();
            }
            else {
              this.__renderPreservingGridScroll();
            }
          };
        }

        header.appendChild(cell);
      });

      const hasActions =

        !!this.customButtonsRight?.length ||

        (
          !this.systemButtonsTop &&
          (
            this.deleteButton ||
            (
              !this.bulkEdit &&
              (
                this.editButton ||
                this.updateButton ||
                this.cancelButton
              )
            )
          )
        );

      if (hasActions) {
        const cell =
          document.createElement('th');

        cell.innerText = "Actions";

        cell.style.whiteSpace = 'nowrap';
        cell.style.width = '1%';

        header.appendChild(cell);
      }

      thead.appendChild(header);

      table.appendChild(thead);

      const body =
        document.createElement('tbody');

      let allRows;

      if (
        this.state.filteredRows
      ) {

        allRows =
          this.state.filteredRows
            .map(r => ({

              row:
                this._data[
                r.rowIndex
                ],

              rank:
                r.rank,

              rowIndex:
                r.rowIndex
            }));
      }
      else {

        allRows =
          this._data.map(
            (row, rowIndex) => ({

              row,

              rank: '',

              rowIndex
            })
          );
      }

      allRows =
        this._applySort(
          allRows
        );


      let rows =
        this._applyPaging(
          allRows
        );

      rows.forEach((row, visualIndex) => {

        const rowIndex =
          row.rowIndex;

        const rowDiv =
          document.createElement('tr');

        rowDiv.dataset.msRowIndex =
          String(rowIndex);
        if (
          this._rowColors &&
          this._rowColors[rowIndex]
        ) {

          rowDiv.style.background =
            this._rowColors[rowIndex];
        }

        if (
          this.state.updatedRows.has(
            rowIndex
          )
        ) {

          rowDiv.classList.add(
            'ms-updated-row'
          );
        }

        if (
          this.state.selected.has(
            rowIndex
          )
        ) {

          rowDiv.classList.add(
            'selected'
          );
        }

        if (
          this.state.lastClicked === rowIndex ||
          this._editRowIndex === rowIndex
        ) {

          rowDiv.classList.add(
            'ms-current-row'
          );
        }

        // ✔ SELECT (row click)
        rowDiv.onclick = () => {

          this.__activateCurrentRow(rowIndex, rowDiv);

          this.onRowSingleClick?.({
            rowIndex,
            data: row.row,
            record: this.toRecord(row.row),
            selectedIndexes: Array.from(this.state.selected),
            selectedRecords: this.getTickedRows(),
            grid: this
          });

          if (this.multiSelect) {

            return;
          }
          else {

            this.state.selected.clear();

            // remove all highlights
            root.querySelectorAll('tbody tr.selected')
              .forEach(r => r.classList.remove('selected'));

            this.state.selected.add(rowIndex);
            rowDiv.classList.add('selected');
          }

          this.onRowTick?.({
            rowIndex,
            data: row.row,
            record: this.toRecord(row.row),
            selectedIndexes: Array.from(this.state.selected),
            selectedRecords: this.getTickedRows(),
            grid: this
          });
        };

        // ✔ DOUBLE CLICK
        rowDiv.ondblclick = () => {
          this.onRowDoubleClick?.({
            rowIndex,
            data: row.row,
            record: this.toRecord(row.row),
            grid: this
          });
        };


        if (this.multiSelect) {

          const chkCell =
            document.createElement('td');


          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = this.state.selected.has(rowIndex);

          chk.onclick = (e) => {
            e.stopPropagation();
            this.__activateCurrentRow(rowIndex, rowDiv);

            if (chk.checked) {

              this.state.selected.add(rowIndex);
              rowDiv.classList.add('selected');

            } else {
              this.state.selected.delete(rowIndex);
              rowDiv.classList.remove('selected');
            }

            this.render();

            this.onRowTick?.({
              rowIndex,
              data: row.row,
              record: this.toRecord(row.row),
              selectedIndexes: Array.from(this.state.selected),
              selectedRecords: this.getTickedRows(),
              grid: this
            });
          };

          chkCell.appendChild(chk);
          rowDiv.appendChild(chkCell);
        }
        const rankCell =
          document.createElement('td');

        rankCell.className =
          'ms-grid-rank';

        rankCell.innerText =
          row.rank || '';

        rowDiv.appendChild(rankCell);

        (this.fields || []).forEach((f) => {

          const key = this._getFieldKey(f);

          if (this.__isHiddenFieldKey(key)) return;

          const cell =
            document.createElement('td');

          const colorKey =
            rowIndex +
            '|' +
            String(key).toLowerCase();

          const cellColor =
            this._cellColors?.[colorKey];

          const label =
            typeof f === 'object'
              ? (f.label || f.field || f.key)
              : f;

          cell.setAttribute(
            'data-label',
            label
          );


          let val = Array.isArray(row.row)
            ? this.__fieldValue(row.row, key)
            : this.__recordValue(row.row, key);

          const editable =
            this.bulkEdit
              ? (
                !this._editMeta ||
                !!this._editMeta[key]
              )
              : (
                this._editRowIndex === rowIndex &&
                (
                  !this._editMeta ||
                  !!this._editMeta[key]
                )
              );

          const comboKey =
            this.__sameFieldKey(comboByKey.get(String(key).toLowerCase())?.keyField, key)
              ? comboByKey.get(String(key).toLowerCase())
              : null;

          const comboText =
            this.__sameFieldKey(comboByKey.get(String(key).toLowerCase())?.textField, key)
              ? comboByKey.get(String(key).toLowerCase())
              : null;

          // Combo UI belongs ONLY to second/display field
          const combo = comboText;


          // Combo display field support
          // Example:
          //   key = "Country"
          //   combo.keyField  = "CID"
          //   combo.textField = "Country"
          if (comboText) {


            const record = this.toRecord(row.row);

            // Read underlying key value from record.CID
            const storedValue =
              this.__recordValue(record, comboText.keyField);
            comboText.value = storedValue;
            val = comboText.displayText();
          }

          if (
            editable ||
            combo
          ) {

            let input = null;
            if (!combo) {

              input = document.createElement('input');

              input.type = 'text';

              input.value = val ?? '';
            }
            if (combo) {

              // REAL ms.form.combo() INSIDE GRID

              input = document.createElement('div');

              const comboClone =
                ms.form.combo();

              // inherit config
              comboClone.css =
                combo.css;

              comboClone.style =
                combo.style;

              comboClone.__msDefaultCssPolicy =
                this.__msDefaultCssPolicy;

              comboClone.multiSelect =
                combo.multiSelect;

              comboClone.data =
                combo.data;

              comboClone.width || 14;

              const record =
                this.toRecord(row.row);

              comboClone.value =
                this.__recordValue(record, combo.keyField);

              // update grid data
              comboClone.onChange = (v) => {

                this.setValue(
                  rowIndex,
                  combo.keyField,
                  v
                );
              };

              comboClone.mount(input);
            }

            this.__wireCurrentRowActivation(
              input,
              rowIndex,
              rowDiv
            );

            if (!combo) {

              input.onfocus = () => {

                this._textEventInput = input;

                this.textFocus =
                  key;

                this._inTextEvent =
                  true;

                try {

                  this.onTextFocus?.();

                } finally {

                  this._inTextEvent =
                    false;
                }
              };

              input.onblur = () => {

                this._textEventInput = input;
                this.textLeave = key;

                this._inTextEvent =
                  true;

                try {

                  this.onTextLeave?.();

                } finally {

                  this._inTextEvent =
                    false;
                }
              };
            }

            input.onkeydown = (e) => {

              if (e.key === "ArrowDown" || e.key === "ArrowUp") {

                e.preventDefault();

                const dir = e.key === "ArrowDown" ? 1 : -1;
                const nextRow = rowIndex + dir;

                if (nextRow >= 0 && nextRow < this._data.length) {

                  const nextRowEl =
                    root.querySelectorAll('tbody tr')[nextRow];

                  if (!nextRowEl) return;

                  const nextCells =
                    nextRowEl.querySelectorAll('td');

                  const offset =
                    this.multiSelect ? 1 : 0;

                  const next =
                    nextCells[colIndex + offset];

                  next?.querySelector('input')?.focus();

                }
              }
            };

            if (cellColor) {

              if (input) {

                input.style.background =
                  cellColor;
              }
            }
            cell.appendChild(input);

          } else {

            if (cellColor) {

              cell.style.background =
                cellColor;
            }

            cell.innerText =
              val ?? '';
          }

          rowDiv.appendChild(cell);
        });


        const hasActions =

          !!this.customButtonsRight?.length ||

          (
            !this.systemButtonsTop &&
            (
              this.deleteButton ||
              (
                !this.bulkEdit &&
                (
                  this.editButton ||
                  this.updateButton ||
                  this.cancelButton
                )
              )
            )
          );

        if (hasActions) {

          const actionCell =
            document.createElement('td');
          actionCell.className =
            'ms-grid-action-cell';

          this.__buildActionButtons(actionCell, rowIndex);

          rowDiv.appendChild(actionCell);
        }


        body.appendChild(rowDiv);

      });

      table.appendChild(body);

      scroll.appendChild(table);

      container.appendChild(scroll);

      if (!this.searchCustomMode) {

        const footer =
          document.createElement('div');

        footer.className =
          'ms-grid-footer';

        const sizeSel =
          document.createElement('select');

        [...new Set([10, 20, 50, 100, Number(this.state.pageSize)])]
          .filter(n => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b)
          .forEach(n => {
            const o =
              document.createElement('option');

            o.value = n;
            o.innerText = n;

            if (
              Number(this.state.pageSize) === n
            ) {
              o.selected = true;
            }

            sizeSel.appendChild(o);
          });

        sizeSel.onchange = () => {

          this.state.pageSize =
            Number(sizeSel.value);

          this._pageSize =
            this.state.pageSize;

          this.state.page = 1;

          if (this._serverSource) {
            void this.refresh();
          }
          else {
            this.render();
          }
        };

        footer.appendChild(
          document.createTextNode('Rows: ')
        );

        footer.appendChild(sizeSel);

        const btnFirst =
          document.createElement('button');

        btnFirst.innerText = '<<';

        btnFirst.onclick = () => {

          this.state.page = 1;

          if (this._serverSource) {
            void this.refresh();
          }
          else {
            this.render();
          }
        };

        footer.appendChild(btnFirst);

        const btnPrev =
          document.createElement('button');

        btnPrev.innerText = '<';

        btnPrev.onclick = () => {

          if (this.state.page > 1) {

            this.state.page--;

            if (this._serverSource) {
              void this.refresh();
            }
            else {
              this.render();
            }
          }
        };

        footer.appendChild(btnPrev);

        const info =
          document.createElement('span');

        info.className =
          'ms-grid-page-info';

        info.innerText =
          `${this.state.page} / ${this.state.pageCount}`;

        footer.appendChild(info);

        const btnNext =
          document.createElement('button');

        btnNext.innerText = '>';

        btnNext.onclick = () => {

          if (
            this.state.page <
            this.state.pageCount
          ) {

            this.state.page++;

            if (this._serverSource) {
              void this.refresh();
            }
            else {
              this.render();
            }
          }
        };

        footer.appendChild(btnNext);

        const btnLast =
          document.createElement('button');

        btnLast.innerText = '>>';

        btnLast.onclick = () => {

          this.state.page =
            this.state.pageCount;

          if (this._serverSource) {
            void this.refresh();
          }
          else {
            this.render();
          }
        };

        footer.appendChild(btnLast);

        container.appendChild(footer);
      }

      if (this.onAdd) {

        const footer = document.createElement('div');
        footer.className = 'ms-grid-footer';

        const btnAdd = document.createElement('button');
        btnAdd.innerText = this.addLabel;

        btnAdd.onclick = () => {
          this.onAdd({
            grid: this,
            addRow: (row) => {
              this._data.unshift(row);
              this.render();
            }
          });
        };

        footer.appendChild(btnAdd);
        container.appendChild(footer);
      }

      root.appendChild(container);

      this.__restoreGridScrollAfterRender();
    },

    async applyDefaultStyle() {

      const cfg =
        window.MS_CONFIG || {};
      const styleCssPath = __ms_form_style_css_path(this.style);
      const inlineStyle = __ms_form_inline_style(this.style);
      const localCss = this.css || this._cssPath || styleCssPath;
      const hasLocalStyle = !!inlineStyle || !!localCss;
      const defaultCss = __ms_form_default_css_for_control('grid', hasLocalStyle, this);
      const configCss = !hasLocalStyle && !defaultCss && !__ms_form_default_css_disabled(this)
        ? cfg.Grid_CSS
        : null;

      const css = defaultCss || localCss || configCss;

      if (!css) return;

      const scope = __ms_form_scope_selector_for_host(this._el);
      if (defaultCss && defaultCss !== localCss) {
        const applied = await __ms_form_apply_section_part_css(this, 'grid-default', defaultCss, scope, '');
        if (!applied && localCss) {
          await __ms_form_apply_section_part_css(this, 'grid-local', localCss, scope, '');
        }
      } else if (localCss) {
        await __ms_form_apply_section_part_css(this, 'grid-local', localCss, scope, '');
      } else if (configCss) {
        await __ms_form_apply_section_part_css(this, 'grid-config', configCss, scope, '');
      }
    },

    value(row, field) {

      const colIndex = typeof field === 'number'
        ? field
        : this.__gridDataFields().findIndex(f =>
          this.__sameFieldKey(this._getFieldKey(f), field)
        );

      if (colIndex === -1) return null;

      const storedValue =
        this._data[row]?.[colIndex];

      const rowEl = this._el.querySelectorAll('tbody tr')[row];
      if (!rowEl) return storedValue ?? null;


      const visibleFields = this.__gridDataFields().filter(f => {

        const k = this._getFieldKey(f);

        return !this.__isHiddenFieldKey(k);
      });

      const visibleIndex = visibleFields.findIndex(f =>
        this.__sameFieldKey(this._getFieldKey(f), field)
      );

      if (visibleIndex === -1) return storedValue ?? null;

      const offset = this.multiSelect ? 1 : 0;

      const cell =
        rowEl.querySelectorAll('td')[visibleIndex + offset];

      if (!cell) return storedValue ?? null;

      const input = cell.querySelector('input, select');

      if (input) return input.value;

      return storedValue;
    },

    setValue(row, field, value) {

      const colIndex = typeof field === 'number'
        ? field
        : this.__gridDataFields().findIndex(f =>
          this.__sameFieldKey(this._getFieldKey(f), field)
        );

      if (colIndex === -1) return;

      this._data[row][colIndex] = value;

      const rowEl = this._el.querySelectorAll('tbody tr')[row];
      if (!rowEl) return;

      const visibleFields = this.__gridDataFields().filter(f => {

        const k = this._getFieldKey(f);

        return !this.__isHiddenFieldKey(k);
      });

      const visibleIndex = visibleFields.findIndex(f =>
        this.__sameFieldKey(this._getFieldKey(f), field)
      );

      if (visibleIndex === -1) return;

      const offset = this.multiSelect ? 1 : 0;

      const cell =
        rowEl.querySelectorAll('td')[visibleIndex + offset];


      if (!cell) return;

      const input = cell.querySelector('input, select');

      if (input) {
        input.value = value;
      } else {
        const combo =
          (this.comboFields || []).find(c =>
            c && this.__sameFieldKey(c.textField, field)
          );

        if (combo) {

          combo.value =
            this.__recordValue(
              this.toRecord(this._data[row]),
              combo.keyField
            );

          value =
            combo.displayText();
        }
        cell.innerText = value;
      }
    },

    setCell(rowIndex, field, value) {

      const colIndex = this.__gridDataFields().findIndex(f =>
        this.__sameFieldKey(this._getFieldKey(f), field)
      );

      if (colIndex === -1) return;

      this._data[rowIndex][colIndex] = value;

      const rowEl = this._el.querySelectorAll('tbody tr')[rowIndex];
      if (!rowEl) return;

      const visibleFields = this.__gridDataFields().filter(f => {

        const k = this._getFieldKey(f);

        return !this.__isHiddenFieldKey(k);
      });

      const visibleIndex = visibleFields.findIndex(f =>
        this.__sameFieldKey(this._getFieldKey(f), field)
      );

      if (visibleIndex === -1) return;

      const offset = this.multiSelect ? 1 : 0;

      const cell =
        rowEl.querySelectorAll('td')[visibleIndex + offset];
      if (!cell) return;

      const input = cell.querySelector('input');

      if (input) {
        input.value = value;
      } else {
        const combo =
          (this.comboFields || []).find(c =>
            c && this.__sameFieldKey(c.textField, field)
          );

        if (combo) {

          combo.value =
            this.__recordValue(
              this.toRecord(this._data[rowIndex]),
              combo.keyField
            );

          value =
            combo.displayText();
        }
        cell.innerText = value;
      }
    },

    updateFromRecord(rowIndex, record) {
      for (const k in record) {
        this.setCell(rowIndex, k, record[k]);
      }
    },

    updateRow(
      a,
      b
    ) {

      let rowIndex;
      let values;

      if (
        b === undefined
      ) {

        rowIndex =
          this.state.lastClicked;

        values =
          a;
      }
      else {

        rowIndex =
          a;

        values =
          b;
      }

      if (
        rowIndex == null
      ) {
        return;
      }

      for (const key in values) {

        const actual =
          this.__gridDataFields().find(f =>
            this._getFieldKey(f)
              .toLowerCase()
            ===
            key.toLowerCase()
          );

        if (!actual)
          continue;

        this.setCell(
          rowIndex,
          this._getFieldKey(actual),
          values[key]
        );
      }
    },


    focusRow(rowIndex) {

      if (
        rowIndex == null ||
        rowIndex < 0 ||
        rowIndex >= this._data.length
      ) {
        return;
      }

      this.state.lastClicked =
        rowIndex;

      this.render();

      requestAnimationFrame(() => {

        const row =
          this._el?.querySelectorAll(
            'tbody tr'
          )[rowIndex];

        if (!row)
          return;

        row.classList.add(
          'ms-current-row'
        );

        row.scrollIntoView({
          block: 'nearest'
        });
      });
    },

    focusText(
      a,
      b
    ) {

      let rowIndex;
      let field;

      if (
        typeof a === 'string'
      ) {

        rowIndex =
          this.state.lastClicked;

        field =
          a;
      }
      else {

        rowIndex =
          a;

        field =
          b;
      }

      const rows =
        this._el.querySelectorAll(
          'tbody tr'
        );

      const row =
        rows[rowIndex];

      if (!row)
        return;

      const visibleFields =
        this.__gridDataFields().filter(f => {

          const k =
            this._getFieldKey(f);

          return !this.__isHiddenFieldKey(k);
        });

      const visibleIndex =
        visibleFields.findIndex(f =>

          this._getFieldKey(f)
            .toLowerCase()

          ===

          String(field)
            .toLowerCase()
        );

      if (visibleIndex < 0)
        return;

      const offset =
        this.multiSelect
          ? 2
          : 1;

      const cell =
        row.querySelectorAll('td')[
        visibleIndex + offset
        ];

      if (!cell)
        return;

      const input =
        cell.querySelector(
          'input,textarea,select'
        );

      input?.focus();
    },

    __buildActionButtons(container, rowIndex) {

      const buildCtx = () => {

        const row =
          rowIndex == null
            ? null
            : this._data[rowIndex];

        return {
          rowIndex,
          data: row,
          record: row ? this.toRecord(row) : null,
          selectedIndexes: Array.from(this.state.selected),
          selectedRecords: this.getTickedRows(),
          grid: this
        };
      };

      const addBtn = (label, fn) => {

        if (!label || !fn) return;

        const b = document.createElement('button');
        if (
          label === this.editButton
        ) {

          b.classList.add(
            'ms-grid-btn-edit'
          );
        }

        if (
          label === this.updateButton
        ) {

          b.classList.add(
            'ms-grid-btn-update'
          );
        }

        if (
          label === this.cancelButton
        ) {

          b.classList.add(
            'ms-grid-btn-cancel'
          );
        }

        if (
          label === this.deleteButton
        ) {

          b.classList.add(
            'ms-grid-btn-delete'
          );
        }
        b.innerText = label;

        this.__wireCurrentRowActivation(
          b,
          rowIndex
        );

        b.onclick = (e) => {
          e.stopPropagation();
          this.__activateCurrentRow(rowIndex);

          if (fn === '__cancel__') {

            this._data[rowIndex] =
              JSON.parse(
                JSON.stringify(
                  this._originalEditRecord
                )
              );

            this._editRowIndex = null;

            this.__renderPreservingGridScroll();

            return;
          }

          if (fn === this.editFunction) {

            this._editRowIndex = rowIndex;

            this._originalEditRecord =
              JSON.parse(
                JSON.stringify(
                  this._data[rowIndex]
                )
              );

            this.__renderPreservingGridScroll();

            return;
          }

          if (fn === this.updateFunction) {
            this.__commitEditableRow(rowIndex);
          }

          const r = fn(buildCtx());

          Promise.resolve(r).then(res => {

            const ok =
              res === true ||
              (res && res.ok === true);

            if (ok && fn === this.updateFunction) {

              this.state.updatedRows.add(
                rowIndex
              );

              this._editRowIndex = null;

              this.__renderPreservingGridScroll();
            }

            if (ok && fn === this.deleteFunction) {

              this._data.splice(
                rowIndex,
                1
              );

              this.__renderPreservingGridScroll();
            }
          });

        };

        container.appendChild(b);
      };

      const editing =
        rowIndex != null &&
        this._editRowIndex === rowIndex;

      if (!this.systemButtonsTop) {
        if (!editing && !this.bulkEdit) {

          if (this.editButton) {

            addBtn(
              this.editButton,
              this.editFunction
            );
          }
        }
        else {

          if (this.updateButton) {

            addBtn(
              this.updateButton,
              this.updateFunction
            );
          }

          if (this.cancelButton) {

            addBtn(
              this.cancelButton,
              '__cancel__'
            );
          }
        }
      }
      if (!this.systemButtonsTop) {

        addBtn(
          this.deleteButton,
          this.deleteFunction
        );
      }

      (this.customButtonsRight || [])
        .forEach(btn => {

          addBtn(
            btn.text,
            () => {

              btn.click?.(
                buildCtx()
              );
            }
          );
        });

    }

  };  // end of g = {..} object


  function __ms_parseEditFields(cfg) {

    const meta = {};

    for (const key in cfg) {

      const raw = (cfg[key] || '').trim();

      const optional = raw.includes('optional');

      const clean = raw.replace('optional', '').trim();

      const m = clean.match(/^(\w+)\((.+)\)$/);
      if (!m) continue;

      const type = m[1];
      const body = m[2];

      const obj = { type, required: !optional };

      if (type === 'text') {
        obj.max = parseInt(body);
      }
      else if (type === 'int') {
        const [min, max] = body.split('-').map(Number);
        obj.min = min;
        obj.max = max;
      }
      else if (type === 'decimal') {
        const [min, max] = body.split('-').map(Number);
        obj.min = min;
        obj.max = max;
      }
      else if (type === 'date') {
        const [min, max] = body.split('-');
        obj.min = new Date(min);
        obj.max = new Date(max);
      }

      meta[key] = obj;
    }

    return meta;
  }

  function __ms_validateField(meta, value) {

    if (!meta) return { ok: true };

    if (!value) {
      if (meta.required) return { ok: false, msg: 'Required' };
      return { ok: true };
    }

    switch (meta.type) {

      case 'text':
        if (value.length > meta.max)
          return { ok: false, msg: `Max ${meta.max}` };
        break;

      case 'int':

        if (!/^\d+$/.test(value.trim())) {
          return { ok: false, msg: 'Invalid number' };
        }

        const i = Number(value);

        if (i < meta.min || i > meta.max) {
          return { ok: false, msg: `${meta.min}-${meta.max}` };
        }

        break;

      case 'decimal':

        if (!/^\d+(\.\d+)?$/.test(value.trim())) {
          return { ok: false, msg: 'Invalid number' };
        }

        const d = Number(value);

        if (d < meta.min || d > meta.max) {
          return { ok: false, msg: `${meta.min}-${meta.max}` };
        }

        break;

      case 'date':
        const dt = new Date(value);
        if (isNaN(dt)) return { ok: false, msg: 'Invalid date' };
        if (dt < meta.min || dt > meta.max)
          return { ok: false, msg: 'Out of range' };
        break;
    }

    return { ok: true };
  }

  return g;
};


/* ======================= ACCESSOR ======================= */


ms.combo = function (id) {
  return ComboModule.registry[id] || null;
};
