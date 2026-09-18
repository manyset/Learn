/**
 * @license ManySet
 * ms.js
 *
 * Copyright (c) ManySet, Inc. and its affiliates.
 *
 * This source code is licensed under the Commercial Developer license found in the
 * LICENSE file in the root directory of this source tree.
 */


//# sourceURL=ms.js 
//   MS98.7 -HYBRID-STABLE (CORE EDITION)


const COMPONENT_CACHE = new Map();
const COMPONENT_NAME_EXACT = new Map();
const COMPONENT_NAME_LOWER = new Map();
const COMPONENT_NAME_CONFLICTS = new Map();


const COMPONENT_LOADING = new Map();

const INSTANCES = new Map();


const EVENT_BUS = new Map();    // event → Set<{instance, fn}>
const EVENT_LAST = new Map();   // event → last payload (for replay)


let REF_SEQ = 1;

let __MS_FORM_RAW__ = null;
let __MS_DB_CORE__ = null;
let __MS_DB_LOADING__ = null;

let SYSTEM_ROOT = null;
let CURRENT_SCREEN = null;

let MS_HALTED = false;
let MS_LAST_ERROR = null;
let MS_ERROR_MODAL = null;
let MS_ERROR_RETURN_TO_PARENT_ON_CLOSE = false;
let MS_ERROR_INSTANCE = null;

const ENG_DEBUG = false;

class __MS_STOP_EXECUTION__ extends Error { }

const GLOBAL_STORE = new Map();          // path → value
const STORE_SUBS = new Map();            // path → Set<{instance, fn}>
const STORE_OWNERS = new Map();          // root → componentName

let STORE_TX_ACTIVE = false;      // is a transaction running
let STORE_TX_OWNER = null;        // instance that owns it
let STORE_TX_BUFFER = new Map();  // path -> value
let STORE_TX_LOCK = false;        // global write lock

const PRELOAD_CACHE = new Set();      // already preloaded
const PRELOAD_PROMISES = new Map();   // prevent duplicate fetch

const PRELOAD_QUEUE = [];
let PRELOAD_RUNNING = false;

const IMAGE_PRELOAD_CACHE = new Map();

let MS_LOADING_COUNT = 0;
let MS_GLOBAL_LOADER = null;
let MS_LOADER_TIMER = null;
const MS_TARGET_LOADERS = new Map();

const SCRIPT_MODULE_CACHE = new Map();
const SCRIPT_BLOB_SOURCES = new Map();

const UI_LISTENERS = new Map();   // parentRef → Set<{fn, sourceRef}>
const UI_FN_META = new WeakMap(); // fn → {wrapped}
const HTML_TAG_NAMES = new Set([
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
    'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
    'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
    'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
    'em', 'embed',
    'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins',
    'kbd',
    'label', 'legend', 'li', 'link',
    'main', 'map', 'mark', 'menu', 'meta', 'meter',
    'nav', 'noscript',
    'object', 'ol', 'optgroup', 'option', 'output',
    'p', 'picture', 'pre', 'progress',
    'q',
    'rp', 'rt', 'ruby',
    's', 'samp', 'script', 'search', 'section', 'select', 'slot', 'small',
    'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead',
    'time', 'title', 'tr', 'track',
    'u', 'ul',
    'var', 'video',
    'wbr'
]);

function __ms_is_custom_tag_name(value) {
    if (typeof value !== 'string') return false;
    const tag = value.trim().toLowerCase();
    return /^[a-z][a-z0-9_-]*$/.test(tag) && !HTML_TAG_NAMES.has(tag);
}

const LIFECYCLE_HOOKS = [
    'onLoad',
    'onShow',
    'onBeforeHide',
    'onHide',
    'onClose',
    'onFocus',
    'onLostFocus'
];
const LIFECYCLE_CAPTURE_KEY = '__MS_LIFECYCLE_HOOKS__';

/* =========================================================
   2. EXECUTION CONTEXT (HYBR)
   ========================================================= */

const EXEC_STACK = [];
let CURRENT_EXEC_CONTEXT = null;
const DOM_LISTENER_WRAPPERS = new WeakMap();
const DOM_REF_LISTENERS = new WeakMap();
const DOM_REF_ON_HANDLERS = new WeakMap();
const SCOPED_MS_MODULES = new Map();
const GLOBAL_DOM_LISTENERS = new WeakMap();
const LOCAL_WINDOW_KEY_EVENTS = new Set(['keydown', 'keyup', 'keypress']);
const DECLARATIVE_COMPONENT_SELECTOR = 'ms-com';
const DECLARATIVE_COMPONENT_TASKS = new Set();
let NATIVE_CONTEXT_BRIDGES_INSTALLED = false;
let LOCAL_WINDOW_EVENT_BRIDGE_INSTALLED = false;
let LAST_INTERACTION_INSTANCE = null;
let FOCUSED_COMPONENT_INSTANCE = null;
const STANDALONE_NATIVE_READY_BLOCKER = new Promise(() => { });

function currentExecutionInstance() {
    return (
        (EXEC_STACK.length ? EXEC_STACK[EXEC_STACK.length - 1] : null) ||
        CURRENT_EXEC_CONTEXT
    );
}

function restoreExecutionContext(inst) {
    CURRENT_EXEC_CONTEXT =
        inst && INSTANCES.has(inst.refId)
            ? inst
            : null;
}

function withInstanceContext(instance, method, fn, thisArg = null, args = []) {
    if (!instance || !INSTANCES.has(instance.refId)) {
        return fn.apply(thisArg, args);
    }

    const previousContext = CURRENT_EXEC_CONTEXT;
    EXEC_STACK.push(instance);
    CURRENT_EXEC_CONTEXT = instance;

    try {
        const result = fn.apply(thisArg, args);

        if (result && typeof result.then === 'function') {
            return result
                .catch(e => {
                    const err = __ms_build_error(e, instance.name, method);
                    __ms_halt_engine(err);
                    throw e;
                })
                .finally(() => {
                    if (CURRENT_EXEC_CONTEXT === instance) {
                        restoreExecutionContext(previousContext);
                    }
                });
        }

        return result;
    }
    catch (e) {
        const err = __ms_build_error(e, instance.name, method);
        __ms_halt_engine(err);
        throw e;
    }
    finally {
        const idx = EXEC_STACK.lastIndexOf(instance);
        if (idx !== -1) {
            EXEC_STACK.splice(idx, 1);
        }
        CURRENT_EXEC_CONTEXT = previousContext;
    }
}

function registerInstanceCleanup(instance, cleanup) {
    if (!instance || typeof cleanup !== 'function') return;

    if (!instance.nativeCleanups) {
        instance.nativeCleanups = new Set();
    }

    instance.nativeCleanups.add(cleanup);
}

function removeInstanceCleanup(instance, cleanup) {
    if (!instance?.nativeCleanups || typeof cleanup !== 'function') return;
    instance.nativeCleanups.delete(cleanup);
}

function listenerCapture(options) {
    return typeof options === 'boolean'
        ? options
        : !!options?.capture;
}

function listenerBucket(target, type, listener, create) {
    let byTarget = DOM_LISTENER_WRAPPERS.get(target);
    if (!byTarget) {
        if (!create) return null;
        byTarget = new Map();
        DOM_LISTENER_WRAPPERS.set(target, byTarget);
    }

    let byType = byTarget.get(type);
    if (!byType) {
        if (!create) return null;
        byType = new Map();
        byTarget.set(type, byType);
    }

    let byListener = byType.get(listener);
    if (!byListener) {
        if (!create) return null;
        byListener = new Map();
        byType.set(listener, byListener);
    }

    return byListener;
}

function normalizeComponentRuleName(value) {
    return String(value || '')
        .replace(/\\/g, '/')
        .replace(/\.html$/i, '')
        .replace(/^\.\//, '');
}

function componentRuleMatches(rule, instanceName) {
    if (rule === '*') return true;
    if (!rule || !instanceName) return false;

    const normalizedRule = normalizeComponentRuleName(rule).toLowerCase();
    const normalizedName = normalizeComponentRuleName(instanceName).toLowerCase();

    if (normalizedRule === normalizedName) return true;

    if (String(rule).endsWith('/')) {
        return normalizedName.startsWith(normalizedRule.replace(/\/$/, '') + '/');
    }

    return false;
}

function listAllowsComponent(list, instanceName) {
    return Array.isArray(list) && list.some(rule => componentRuleMatches(rule, instanceName));
}

function componentFolderName(instanceOrName) {
    const name = typeof instanceOrName === 'string'
        ? instanceOrName
        : instanceOrName?.name;
    const normalized = normalizeComponentRuleName(name);
    const parts = normalized.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? parts.join('/') + '/' : '';
}

function accessTargetInsideSource(sourceInstance, targetName) {
    const folder = componentFolderName(sourceInstance);
    const target = normalizeComponentRuleName(targetName);
    return folder === ''
        ? !target.includes('/')
        : target.startsWith(folder);
}

function configuredDomEvents() {
    return Array.isArray(MS_CONFIG.GlobalDOMEvents)
        ? MS_CONFIG.GlobalDOMEvents
        : [];
}

function ruleEvents(rule) {
    if (Array.isArray(rule?.events)) return rule.events;
    if (rule?.event) return [rule.event];
    return [];
}

function domEventRuleMatchesEvent(rule, type) {
    const events = ruleEvents(rule);
    return events.includes('*') || events.includes(type);
}

function eventKeySignature(event) {
    if (!event || typeof event.key !== 'string') return '';

    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    return parts.join('+');
}

function domEventRuleAllowsKey(rule, event) {
    if (!Array.isArray(rule?.keys) || !rule.keys.length) return true;
    const key = eventKeySignature(event);
    return rule.keys.some(x => String(x).toUpperCase() === key.toUpperCase());
}

function findGlobalDomEventRule(instance, type, role, event = null) {
    if (!instance || !type) return null;

    for (const rule of configuredDomEvents()) {
        if (!rule || !domEventRuleMatchesEvent(rule, type)) continue;
        if (!domEventRuleAllowsKey(rule, event)) continue;

        const roleList =
            role === 'emit'
                ? (rule.emitters || rule.components)
                : (rule.listeners || rule.components);

        if (listAllowsComponent(roleList, instance.name)) {
            return rule;
        }
    }

    return null;
}

function localWindowEventTarget(instance) {
    if (!instance) return window;

    if (!instance.localWindowEvents) {
        instance.localWindowEvents = new EventTarget();
    }

    return instance.localWindowEvents;
}

function globalDomListenerBucket(instance, type, listener, create) {
    let byType = GLOBAL_DOM_LISTENERS.get(instance);
    if (!byType) {
        if (!create) return null;
        byType = new Map();
        GLOBAL_DOM_LISTENERS.set(instance, byType);
    }

    let byListener = byType.get(type);
    if (!byListener) {
        if (!create) return null;
        byListener = new Map();
        byType.set(type, byListener);
    }

    return byListener.get(listener) || (() => {
        if (!create) return null;
        const byCapture = new Map();
        byListener.set(listener, byCapture);
        return byCapture;
    })();
}

function addConfiguredGlobalDomListener(instance, type, listener, options, rule) {
    if (!instance || !listener) return window.addEventListener(type, listener, options);

    const capture = listenerCapture(options);
    const bucket = globalDomListenerBucket(instance, type, listener, true);
    let record = bucket.get(capture);

    if (!record) {
        const wrapper = typeof listener === 'function'
            ? function (...args) {
                if (!domEventRuleAllowsKey(rule, args[0])) return;
                return withInstanceContext(instance, type, listener, this, args);
            }
            : {
                handleEvent(...args) {
                    if (!domEventRuleAllowsKey(rule, args[0])) return;
                    return withInstanceContext(instance, type, listener.handleEvent, listener, args);
                }
            };

        record = {
            wrapper,
            cleanup: () => {
                window.removeEventListener(type, wrapper, capture);
                removeInstanceCleanup(instance, record.cleanup);
                bucket.delete(capture);
            }
        };

        bucket.set(capture, record);
        registerInstanceCleanup(instance, record.cleanup);
    }

    return window.addEventListener(type, record.wrapper, options);
}

function removeConfiguredGlobalDomListener(instance, type, listener, options) {
    const record = globalDomListenerBucket(instance, type, listener, false)
        ?.get(listenerCapture(options));

    if (record) {
        record.cleanup();
        return true;
    }

    return false;
}

function composedPathInstance(event) {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];

    for (const node of path) {
        const root = node?.getRootNode?.();
        const inst = root?.host?.__ms_instance;
        if (inst) return inst;
        if (node?.__ms_instance) return node.__ms_instance;
    }

    return null;
}

function focusedInstance() {
    let el = document.activeElement;

    while (el?.shadowRoot?.activeElement) {
        el = el.shadowRoot.activeElement;
    }

    const root = el?.getRootNode?.();
    return root?.host?.__ms_instance || el?.__ms_instance || null;
}

function targetInstanceForLocalWindowEvent(event) {
    return composedPathInstance(event) ||
        focusedInstance() ||
        LAST_INTERACTION_INSTANCE ||
        CURRENT_SCREEN;
}

function cloneWindowEvent(event) {
    if (typeof KeyboardEvent !== 'undefined' && event instanceof KeyboardEvent) {
        return new KeyboardEvent(event.type, {
            key: event.key,
            code: event.code,
            location: event.location,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            repeat: event.repeat,
            isComposing: event.isComposing,
            bubbles: false,
            cancelable: event.cancelable
        });
    }

    return new Event(event.type, {
        bubbles: false,
        cancelable: event.cancelable
    });
}

function installLocalWindowEventBridge() {
    if (LOCAL_WINDOW_EVENT_BRIDGE_INSTALLED || typeof window === 'undefined') return;
    LOCAL_WINDOW_EVENT_BRIDGE_INSTALLED = true;

    const rememberInstance = event => {
        const inst = composedPathInstance(event);
        if (inst) {
            LAST_INTERACTION_INSTANCE = inst;
            setFocusedComponentInstance(inst);
        }
    };

    ['pointerdown', 'mousedown', 'click', 'focusin'].forEach(type => {
        document.addEventListener(type, rememberInstance, true);
    });

    LOCAL_WINDOW_KEY_EVENTS.forEach(type => {
        window.addEventListener(type, event => {
            const inst = targetInstanceForLocalWindowEvent(event);
            if (!inst || !INSTANCES.has(inst.refId) || !inst.localWindowEvents) return;

            const localEvent = cloneWindowEvent(event);
            localWindowEventTarget(inst).dispatchEvent(localEvent);

            if (localEvent.defaultPrevented) {
                event.preventDefault();
            }
        }, true);
    });
}

function installNativeContextBridges() {
    if (NATIVE_CONTEXT_BRIDGES_INSTALLED || typeof window === 'undefined') return;
    NATIVE_CONTEXT_BRIDGES_INSTALLED = true;

    const nativeSetTimeout = window.setTimeout;
    const nativeClearTimeout = window.clearTimeout;
    const nativeSetInterval = window.setInterval;
    const nativeClearInterval = window.clearInterval;
    const nativeRequestAnimationFrame = window.requestAnimationFrame;
    const nativeCancelAnimationFrame = window.cancelAnimationFrame;

    window.setTimeout = function (handler, timeout, ...args) {
        const instance = currentExecutionInstance();
        if (!instance || typeof handler !== 'function') {
            return nativeSetTimeout.call(window, handler, timeout, ...args);
        }

        let cleanup = null;
        const id = nativeSetTimeout.call(window, function (...cbArgs) {
            try {
                return withInstanceContext(instance, 'setTimeout', handler, this, cbArgs);
            }
            finally {
                removeInstanceCleanup(instance, cleanup);
            }
        }, timeout, ...args);

        cleanup = () => nativeClearTimeout.call(window, id);
        registerInstanceCleanup(instance, cleanup);
        return id;
    };

    window.setInterval = function (handler, timeout, ...args) {
        const instance = currentExecutionInstance();
        if (!instance || typeof handler !== 'function') {
            return nativeSetInterval.call(window, handler, timeout, ...args);
        }

        const id = nativeSetInterval.call(window, function (...cbArgs) {
            return withInstanceContext(instance, 'setInterval', handler, this, cbArgs);
        }, timeout, ...args);

        const cleanup = () => nativeClearInterval.call(window, id);
        registerInstanceCleanup(instance, cleanup);
        return id;
    };

    window.requestAnimationFrame = function (handler) {
        const instance = currentExecutionInstance();
        if (!instance || typeof handler !== 'function' || typeof nativeRequestAnimationFrame !== 'function') {
            return nativeRequestAnimationFrame.call(window, handler);
        }

        let cleanup = null;
        const id = nativeRequestAnimationFrame.call(window, function (...cbArgs) {
            try {
                return withInstanceContext(instance, 'requestAnimationFrame', handler, this, cbArgs);
            }
            finally {
                removeInstanceCleanup(instance, cleanup);
            }
        });

        cleanup = () => nativeCancelAnimationFrame.call(window, id);
        registerInstanceCleanup(instance, cleanup);
        return id;
    };

    if (typeof EventTarget !== 'undefined') {
        const nativeAddEventListener = EventTarget.prototype.addEventListener;
        const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
            const instance = currentExecutionInstance();

            if (!instance || !listener ||
                (typeof listener !== 'function' && typeof listener.handleEvent !== 'function')) {
                return nativeAddEventListener.call(this, type, listener, options);
            }

            const capture = listenerCapture(options);
            const bucket = listenerBucket(this, type, listener, true);
            let record = bucket.get(capture);

            if (!record) {
                const wrapper = typeof listener === 'function'
                    ? function (...args) {
                        return withInstanceContext(instance, type, listener, this, args);
                    }
                    : {
                        handleEvent(...args) {
                            return withInstanceContext(instance, type, listener.handleEvent, listener, args);
                        }
                    };

                record = { instance, wrapper, cleanup: null };
                record.cleanup = () => {
                    nativeRemoveEventListener.call(this, type, wrapper, capture);
                    removeInstanceCleanup(instance, record.cleanup);
                    bucket.delete(capture);
                };
                bucket.set(capture, record);
                registerInstanceCleanup(instance, record.cleanup);
            }

            return nativeAddEventListener.call(this, type, record.wrapper, options);
        };

        EventTarget.prototype.removeEventListener = function (type, listener, options) {
            const bucket = listenerBucket(this, type, listener, false);
            const record = bucket?.get(listenerCapture(options));

            if (record) {
                record.cleanup();
                return;
            }

            return nativeRemoveEventListener.call(this, type, listener, options);
        };
    }
}

installNativeContextBridges();
installLocalWindowEventBridge();

function trackInstanceTask(instance, promise) {
    if (!instance) return promise;

    if (!instance.pendingTasks) {
        instance.pendingTasks = new Set();
    }

    instance.pendingTasks.add(promise);
    promise.then(
        () => instance.pendingTasks.delete(promise),
        () => instance.pendingTasks.delete(promise)
    );

    return promise;
}

async function waitForInstanceTasks(instance) {
    while (instance?.pendingTasks?.size) {
        await Promise.all([...instance.pendingTasks]);
    }
}

function __ms_prepare_replacement_host(host, container) {
    const rec = {
        oldPosition: host.style.position,
        oldInset: host.style.inset,
        oldZIndex: host.style.zIndex,
        oldOpacity: host.style.opacity,
        oldVisibility: host.style.visibility,
        oldPointerEvents: host.style.pointerEvents,
        oldContainerPosition: container?.style?.position || '',
        changedContainerPosition: false,
        container: container instanceof HTMLElement ? container : null
    };

    if (rec.container) {
        const computed = getComputedStyle(rec.container);
        rec.changedContainerPosition = computed.position === 'static';
        if (rec.changedContainerPosition) {
            rec.container.style.position = 'relative';
        }
    }

    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.zIndex = '0';
    host.style.opacity = '0';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.setAttribute('data-ms-pending-reveal', '');

    return rec;
}

function __ms_reveal_replacement_host(instance) {
    const rec = instance?.pendingReveal;
    if (!instance?.host || !rec) return;

    instance.host.style.position = rec.oldPosition;
    instance.host.style.inset = rec.oldInset;
    instance.host.style.zIndex = rec.oldZIndex;
    instance.host.style.opacity = rec.oldOpacity;
    instance.host.style.visibility = rec.oldVisibility;
    instance.host.style.pointerEvents = rec.oldPointerEvents;
    instance.host.removeAttribute('data-ms-pending-reveal');

    if (rec.changedContainerPosition && rec.container) {
        rec.container.style.position = rec.oldContainerPosition;
    }

    delete instance.pendingReveal;
}

function __ms_public_name_key(value) {
    return String(value || '').trim().toLowerCase();
}

function __ms_public_policy_values(ruleOrList) {
    const list = ruleOrList && typeof ruleOrList === 'object' && 'list' in ruleOrList
        ? ruleOrList.list
        : ruleOrList;
    if (!list) return [];
    return [...list]
        .map(x => String(x || '').trim())
        .filter(Boolean);
}

function __ms_public_policy_has_list_entries(rule) {
    return rule?.mode === 'list' && __ms_public_policy_values(rule).length > 0;
}

function __ms_unique_public_policy_values(ruleOrList) {
    const seen = new Set();
    const out = [];

    for (const value of __ms_public_policy_values(ruleOrList)) {
        const key = __ms_public_name_key(value);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(value);
    }

    return out;
}

function __ms_read_identifier_at(code, index) {
    const first = code[index];
    if (!/[A-Za-z_$]/.test(first || '')) return null;

    let end = index + 1;
    while (end < code.length && /[A-Za-z0-9_$]/.test(code[end])) {
        end++;
    }

    return {
        value: code.slice(index, end),
        end
    };
}

function __ms_skip_ws_and_comments(code, index) {
    let i = index;

    while (i < code.length) {
        const ch = code[i];
        const next = code[i + 1];

        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        if (ch === '/' && next === '/') {
            i += 2;
            while (i < code.length && code[i] !== '\n') i++;
            continue;
        }

        if (ch === '/' && next === '*') {
            i += 2;
            while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
            i += 2;
            continue;
        }

        break;
    }

    return i;
}

function __ms_skip_string_like(code, index, quote) {
    let i = index + 1;

    while (i < code.length) {
        const ch = code[i];

        if (ch === '\\') {
            i += 2;
            continue;
        }

        if (ch === quote) {
            return i + 1;
        }

        i++;
    }

    return i;
}

function __ms_read_decl_after_word(code, word, index) {
    let i = __ms_skip_ws_and_comments(code, index);

    if (word === 'export') {
        const next = __ms_read_identifier_at(code, i);
        if (!next) return null;

        let nextWord = next.value;
        i = next.end;

        if (nextWord === 'default') {
            i = __ms_skip_ws_and_comments(code, i);
            const afterDefault = __ms_read_identifier_at(code, i);
            if (!afterDefault) return null;
            nextWord = afterDefault.value;
            i = afterDefault.end;
        }

        return __ms_read_decl_after_word(code, nextWord, i);
    }

    if (word === 'async') {
        const next = __ms_read_identifier_at(code, i);
        if (!next || next.value !== 'function') return null;
        return __ms_read_decl_after_word(code, 'function', next.end);
    }

    if (word === 'function' || word === 'class') {
        const name = __ms_read_identifier_at(code, i);
        if (!name) return null;
        return {
            names: [{ name: name.value, kind: word }],
            end: name.end
        };
    }

    if (word !== 'const' && word !== 'let' && word !== 'var') {
        return null;
    }

    const names = [];
    let depth = 0;

    while (i < code.length) {
        i = __ms_skip_ws_and_comments(code, i);
        const name = __ms_read_identifier_at(code, i);
        if (name) {
            names.push({ name: name.value, kind: 'variable' });
            i = name.end;
        }

        while (i < code.length) {
            const ch = code[i];
            const next = code[i + 1];

            if (ch === '"' || ch === "'" || ch === '`') {
                i = __ms_skip_string_like(code, i, ch);
                continue;
            }

            if (ch === '/' && next === '/') {
                i = __ms_skip_ws_and_comments(code, i);
                continue;
            }

            if (ch === '/' && next === '*') {
                i = __ms_skip_ws_and_comments(code, i);
                continue;
            }

            if (ch === '(' || ch === '[' || ch === '{') {
                depth++;
                i++;
                continue;
            }

            if (ch === ')' || ch === ']' || ch === '}') {
                depth = Math.max(0, depth - 1);
                i++;
                continue;
            }

            if (depth === 0 && ch === ',') {
                i++;
                break;
            }

            if (depth === 0 && (ch === ';' || ch === '\n')) {
                return { names, end: i + 1 };
            }

            i++;
        }
    }

    return { names, end: i };
}

function __ms_scan_top_level_declarations(code) {
    const declarations = [];
    let depth = 0;
    let i = 0;

    while (i < code.length) {
        const ch = code[i];
        const next = code[i + 1];

        if (ch === '"' || ch === "'" || ch === '`') {
            i = __ms_skip_string_like(code, i, ch);
            continue;
        }

        if (ch === '/' && (next === '/' || next === '*')) {
            i = __ms_skip_ws_and_comments(code, i);
            continue;
        }

        if (ch === '{') {
            depth++;
            i++;
            continue;
        }

        if (ch === '}') {
            depth = Math.max(0, depth - 1);
            i++;
            continue;
        }

        if (depth === 0) {
            const word = __ms_read_identifier_at(code, i);
            if (word) {
                const decl = __ms_read_decl_after_word(code, word.value, word.end);
                if (decl?.names?.length) {
                    declarations.push(...decl.names);
                    i = Math.max(word.end, decl.end || word.end);
                    continue;
                }
                i = word.end;
                continue;
            }
        }

        i++;
    }

    return declarations;
}

function __ms_build_public_capture_lines(code, requestedNames, allowedKinds, label) {
    const declarations = __ms_scan_top_level_declarations(code);
    const lines = [];

    for (const requestedName of __ms_unique_public_policy_values(requestedNames)) {
        const requestedKey = __ms_public_name_key(requestedName);
        if (!requestedKey) continue;

        const candidates = declarations
            .filter(d =>
                allowedKinds.includes(d.kind) &&
                __ms_public_name_key(d.name) === requestedKey &&
                isIdentifierName(d.name)
            )
            .map(d => d.name);

        if (isIdentifierName(requestedName) && !candidates.includes(requestedName)) {
            candidates.push(requestedName);
        }

        const uniqueCandidates = [...new Set(candidates)];
        if (!uniqueCandidates.length) continue;

        const checks = uniqueCandidates
            .map(name => `if (typeof ${name} === 'function') __ms_matches.push([${JSON.stringify(name)}, ${name}]);`)
            .join('\n    ');

        lines.push(`{
    const __ms_matches = [];
    ${checks}
    if (__ms_matches.length > 1) {
      throw new Error("Ambiguous ms-public ${label}: ${requestedName}. Matches: " + __ms_matches.map(x => x[0]).join(', '));
    }
    if (__ms_matches.length === 1) {
      __ms_hooks[__ms_matches[0][0]] = __ms_matches[0][1];
    }
  }`);
    }

    return lines.join('\n  ');
}

function appendLifecycleCapture(code, refId, publicFunctions = [], publicClasses = []) {
    const capturePublicFunctions = __ms_build_public_capture_lines(
        code,
        publicFunctions,
        ['function', 'variable'],
        'function'
    );
    const capturePublicClasses = __ms_build_public_capture_lines(
        code,
        publicClasses,
        ['class', 'variable'],
        'class'
    );

    return code + `

;{
  const __ms_hooks = {};
  ${LIFECYCLE_HOOKS.map(name =>
        `if (typeof ${name} === 'function') __ms_hooks.${name} = ${name};`
    ).join('\n  ')}
  ${capturePublicFunctions}
  ${capturePublicClasses}

  globalThis.${LIFECYCLE_CAPTURE_KEY} =
    globalThis.${LIFECYCLE_CAPTURE_KEY} || new Map();

  const __ms_prev =
    globalThis.${LIFECYCLE_CAPTURE_KEY}.get(${refId}) || {};

  for (const __ms_key of Object.keys(__ms_hooks)) {
    const __ms_conflict = Object.keys(__ms_prev)
      .find(x => x !== __ms_key && x.toLowerCase() === __ms_key.toLowerCase());
    if (__ms_conflict) {
      throw new Error("Ambiguous ms-public member: " + __ms_key + ". Matches: " + __ms_conflict + ", " + __ms_key);
    }
  }

  globalThis.${LIFECYCLE_CAPTURE_KEY}.set(
    ${refId},
    Object.assign(__ms_prev, __ms_hooks)
  );
}
`;
}

function setInstanceLocal(instance, name, value) {
    if (!instance || typeof name !== 'string') return;

    const key = __ms_public_name_key(name);
    const conflict = Object.keys(instance.locals || {})
        .find(x => x !== name && __ms_public_name_key(x) === key);

    if (conflict) {
        throw new Error(
            `Ambiguous ms-public member: ${name}. Matches: ${conflict}, ${name}`
        );
    }

    instance.locals[name] = value;
}

function mergeModuleExports(instance, mod) {
    if (!mod) return;

    for (const [name, value] of Object.entries(mod)) {
        setInstanceLocal(instance, name, value);
    }
}

function collectLifecycleHooks(instance, mod) {
    const captured =
        globalThis[LIFECYCLE_CAPTURE_KEY]?.get(instance.refId) || {};

    if (globalThis[LIFECYCLE_CAPTURE_KEY]) {
        globalThis[LIFECYCLE_CAPTURE_KEY].delete(instance.refId);
    }

    for (const name of LIFECYCLE_HOOKS) {
        const fn = captured[name] || mod?.[name];
        if (typeof fn === 'function') {
            instance.lifecycle[name] = fn;
        }
    }

    mergeModuleExports(instance, mod);

    for (const [name, value] of Object.entries(captured)) {
        if (LIFECYCLE_HOOKS.includes(name)) continue;
        if (typeof value === 'function') {
            setInstanceLocal(instance, name, value);
        }
    }
}

function standaloneModuleNeedsMSCapture(tpl, policy) {
    const publicFunctions = policy?.functions;
    if (__ms_public_policy_has_list_entries(publicFunctions)) {
        return true;
    }

    const publicClasses = policy?.classes;
    if (__ms_public_policy_has_list_entries(publicClasses)) {
        return true;
    }

    const scripts = tpl?.content?.querySelectorAll?.('script') || [];
    for (const script of scripts) {
        const typeAttr = (script.getAttribute('type') || '').trim().toLowerCase();
        if (typeAttr && typeAttr !== 'module') continue;
        if (script.hasAttribute('src')) continue;

        const code = script.textContent || '';
        for (const name of LIFECYCLE_HOOKS) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(
                `\\b(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\b|\\b(?:const|let|var)\\s+${escaped}\\b`
            );
            if (pattern.test(code)) return true;
        }
    }

    return false;
}

async function callLifecycle(instance, name, ...args) {
    const fn = instance?.lifecycle?.[name];
    if (typeof fn !== 'function') return;

    return await withInstanceContext(
        instance,
        name,
        () => Promise.resolve(fn.call(createRef(instance), ...args))
    );
}

function callLifecycleDetached(instance, name, ...args) {
    if (!instance || !INSTANCES.has(instance.refId)) return;

    const task = Promise.resolve()
        .then(() => callLifecycle(instance, name, ...args))
        .catch(e => {
            const err = __ms_build_error(e, instance.name, name);
            __ms_halt_engine(err);
        });

    trackInstanceTask(instance, task);
}

function setFocusedComponentInstance(instance) {
    const next = instance && INSTANCES.has(instance.refId) ? instance : null;
    if (FOCUSED_COMPONENT_INSTANCE === next) return;

    const previous = FOCUSED_COMPONENT_INSTANCE;
    FOCUSED_COMPONENT_INSTANCE = next;

    if (previous && INSTANCES.has(previous.refId)) {
        callLifecycleDetached(previous, 'onLostFocus');
    }

    if (next) {
        callLifecycleDetached(next, 'onFocus');
    }
}

async function callOnLoad(instance) {
    if (!instance || instance.didLoad) return;
    instance.didLoad = true;
    await callLifecycle(instance, 'onLoad', instance.constructorParams);
}

async function canHideInstance(instance) {
    const result = await callLifecycle(instance, 'onBeforeHide');
    return result !== false;
}

function getVisibleInstancesToHide(container, except, options = {}) {
    const visible = [];

    for (const inst of INSTANCES.values()) {
        if (inst.container !== container) continue;
        if (inst === except) continue;
        if (options.preserveAppend && inst.appendMode) continue;

        if (inst.host.style.display !== 'none') {
            visible.push(inst);
        }
    }

    return visible;
}

async function canHideInstances(instances) {
    for (const inst of instances) {
        if (!await canHideInstance(inst)) {
            return false;
        }
    }

    return true;
}

function activeInstance() {
    if (EXEC_STACK.length)
        return EXEC_STACK[EXEC_STACK.length - 1];
    return CURRENT_SCREEN;
}

/* =========================================================
   3. GLOBAL CONFIG
   ========================================================= */

let MS_CONFIG = {
    ErrorPopup: true,
    ErrorWarning: "System error occured. Re try.",
    ErrorDetail: true,
    ErrorServerURL: null,
    ErrorConsole: true,
    DbReadComponents: ["*"],
    DbWriteComponents: ["*"],
    HttpSettings: {
        Defaults: {},
        ComponentServices: {},
        Services: {}
    },
    CommonJS: [],
    CommonCSS: []
};
let MS_CONFIG_BASE_URL = new URL('.', import.meta.url).href;
let MS_HTTP_CONFIG_CACHE = null;

const __MS_LOADED_CSS__ = new Set();
const RESOURCE_TEXT_CACHE = {
    js: new Map(),
    css: new Map(),
    html: new Map()
};
const COMMON_SCRIPT_MODULE_CACHE = new Map();

function __ms_apply_config(cfg) {
    const flat = { ...cfg };

    if (cfg?.ErrorSettings) {
        Object.assign(flat, cfg.ErrorSettings);
    }

    if (cfg?.DatabaseAccess) {
        Object.assign(flat, cfg.DatabaseAccess);
    }

    if (cfg?.LoadingAnimation?.CSS && !flat.Loading_CSS) {
        flat.Loading_CSS = cfg.LoadingAnimation.CSS;
    }

    MS_CONFIG = { ...MS_CONFIG, ...flat };
    MS_HTTP_CONFIG_CACHE = null;
}

class MSHttpError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'MSHttpError';
        this.code = code;
        this.service = details.service || null;
        this.method = details.method || null;
        this.url = details.url || null;
        this.status = details.status ?? null;
        this.statusText = details.statusText || null;
        this.data = details.data ?? null;
        this.__msHttp = {
            service: this.service,
            method: this.method,
            url: this.url,
            status: this.status,
            statusText: this.statusText
        };
    }
}

function __ms_http_config_error(message, details = {}) {
    return new MSHttpError('HTTP_CONFIG_ERROR', message, details);
}

function __ms_http_object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function __ms_http_normalize_config() {
    if (MS_HTTP_CONFIG_CACHE) return MS_HTTP_CONFIG_CACHE;

    const raw = __ms_http_object(MS_CONFIG.HttpSettings);
    const rawServices = __ms_http_object(raw.Services);
    const services = new Map();

    for (const [name, value] of Object.entries(rawServices)) {
        const logical = String(name || '').trim();
        const key = logical.toLowerCase();
        if (!logical) {
            throw __ms_http_config_error('HttpSettings contains an empty service name');
        }
        if (services.has(key)) {
            throw __ms_http_config_error(`Duplicate HTTP service name (case-insensitive): ${logical}`);
        }
        services.set(key, { name: logical, config: __ms_http_object(value) });
    }

    const mappings = [];
    const seenRules = new Map();
    for (const [rule, serviceName] of Object.entries(__ms_http_object(raw.ComponentServices))) {
        const normalizedRule = normalizeComponentRuleName(rule).toLowerCase();
        const serviceKey = String(serviceName || '').trim().toLowerCase();
        if (!normalizedRule || !serviceKey) {
            throw __ms_http_config_error('HttpSettings.ComponentServices contains an empty rule or service');
        }
        if (seenRules.has(normalizedRule)) {
            throw __ms_http_config_error(`Duplicate HTTP component mapping (case-insensitive): ${rule}`);
        }
        if (!services.has(serviceKey)) {
            throw __ms_http_config_error(`HTTP component mapping references unknown service: ${serviceName}`);
        }
        seenRules.set(normalizedRule, serviceKey);
        mappings.push({
            rule,
            normalizedRule,
            serviceKey,
            specificity: normalizedRule.replace(/\/$/, '').length
        });
    }

    mappings.sort((a, b) => b.specificity - a.specificity);
    MS_HTTP_CONFIG_CACHE = {
        defaults: __ms_http_object(raw.Defaults),
        services,
        mappings
    };
    return MS_HTTP_CONFIG_CACHE;
}

function __ms_http_component_identities(caller) {
    const values = new Set();
    for (const value of [caller?.name, caller?.publicName]) {
        const normalized = normalizeComponentRuleName(value);
        if (normalized) values.add(normalized);
    }
    if (caller?.url) {
        const normalized = normalizeComponentRuleName(logicalNameFromUrl(caller.url));
        if (normalized) values.add(normalized);
    }
    return [...values];
}

function __ms_http_rule_matches_caller(rule, caller) {
    const normalizedRule = normalizeComponentRuleName(rule).toLowerCase();
    const folderRule = String(rule || '').trim().replace(/\\/g, '/').endsWith('/');
    const comparableRule = normalizedRule.replace(/\/$/, '');
    if (!comparableRule) return false;

    return __ms_http_component_identities(caller).some(identity => {
        const normalizedIdentity = normalizeComponentRuleName(identity).toLowerCase();
        if (componentRuleMatches(rule, normalizedIdentity)) return true;
        if (folderRule) {
            return (`/${normalizedIdentity}/`).includes(`/${comparableRule}/`);
        }
        return normalizedIdentity === comparableRule ||
            normalizedIdentity.endsWith('/' + comparableRule);
    });
}

function __ms_http_service(serviceName, caller) {
    const cfg = __ms_http_normalize_config();
    let key = serviceName == null ? '' : String(serviceName).trim().toLowerCase();

    if (!key) {
        if (!caller?.name) {
            throw __ms_http_config_error('ms.http cannot determine the current component');
        }

        const matches = cfg.mappings.filter(item => __ms_http_rule_matches_caller(item.rule, caller));
        if (!matches.length) {
            throw __ms_http_config_error(
                `No default HTTP service is mapped for component: ${caller.name}`
            );
        }

        const best = matches[0];
        const ambiguous = matches.find(item =>
            item !== best &&
            item.specificity === best.specificity &&
            item.serviceKey !== best.serviceKey
        );
        if (ambiguous) {
            throw __ms_http_config_error(
                `Ambiguous default HTTP service mapping for component: ${caller.name}`
            );
        }
        key = best.serviceKey;
    }

    const service = cfg.services.get(key);
    if (!service) {
        throw __ms_http_config_error(`Unknown HTTP service: ${serviceName}`);
    }

    const allowed = service.config.AllowedComponents;
    if (Array.isArray(allowed) && allowed.length > 0) {
        if (!caller?.name || !allowed.some(rule => __ms_http_rule_matches_caller(rule, caller))) {
            throw new MSHttpError(
                'HTTP_ACCESS_DENIED',
                `Component ${caller?.name || '(unknown)'} is not allowed to access HTTP service ${service.name}`,
                { service: service.name }
            );
        }
    }

    return { ...service, defaults: cfg.defaults };
}

function __ms_http_build_url(baseUrl, endpoint, params, serviceName) {
    const rawEndpoint = String(endpoint ?? '').trim();
    if (!rawEndpoint) {
        throw __ms_http_config_error('ms.http requires a URL path', { service: serviceName });
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(rawEndpoint) || rawEndpoint.startsWith('//')) {
        throw new MSHttpError(
            'HTTP_ABSOLUTE_URL_DENIED',
            'Component HTTP URLs must be service-relative; configure the server in GlobalConfig.json',
            { service: serviceName }
        );
    }

    let decodedPath = rawEndpoint.split(/[?#]/, 1)[0];
    try { decodedPath = decodeURIComponent(decodedPath); } catch { }
    if (decodedPath.split(/[\\/]/).includes('..')) {
        throw new MSHttpError(
            'HTTP_PATH_ESCAPE_DENIED',
            `HTTP path cannot leave its configured service: ${rawEndpoint}`,
            { service: serviceName }
        );
    }

    const rawBase = String(baseUrl ?? '').trim();
    if (!rawBase) {
        throw __ms_http_config_error(`HTTP service ${serviceName} has no BaseURL`, { service: serviceName });
    }

    const base = new URL(rawBase, MS_CONFIG_BASE_URL || location.href);
    const baseText = base.href.replace(/\/+$/, '');
    const endpointText = rawEndpoint.replace(/^\/+/, '');
    const url = new URL(`${baseText}/${endpointText}`);

    if (params != null) {
        const input = params instanceof URLSearchParams
            ? params
            : new URLSearchParams();
        if (!(params instanceof URLSearchParams)) {
            for (const [key, value] of Object.entries(__ms_http_object(params))) {
                if (value == null) continue;
                const values = Array.isArray(value) ? value : [value];
                for (const item of values) {
                    input.append(key, item instanceof Date ? item.toISOString() : String(item));
                }
            }
        }
        input.forEach((value, key) => url.searchParams.append(key, value));
    }

    return url;
}

function __ms_http_origin_allowed(url, allowedOrigins, serviceName) {
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return;
    const allowed = allowedOrigins.some(value => {
        const rule = String(value || '').trim();
        if (rule.toLowerCase() === 'self') return url.origin === location.origin;
        try { return new URL(rule, location.href).origin === url.origin; }
        catch { return false; }
    });
    if (!allowed) {
        throw new MSHttpError(
            'HTTP_ORIGIN_DENIED',
            `HTTP service ${serviceName} resolves to an origin not allowed by GlobalConfig.json`,
            { service: serviceName, url: url.href }
        );
    }
}

function __ms_http_headers(defaults, serviceConfig, requestHeaders, authentication) {
    const headers = new Headers();
    for (const source of [defaults.Headers, serviceConfig.Headers, requestHeaders]) {
        if (!source) continue;
        new Headers(source).forEach((value, key) => headers.set(key, value));
    }

    const auth = authentication === null ? null : __ms_http_object(authentication);
    const type = String(auth?.Type || 'none').trim().toLowerCase();
    if (type === 'bearer') {
        const storeKey = String(auth.TokenStoreKey || '').trim();
        if (!storeKey) {
            throw __ms_http_config_error('Bearer authentication requires TokenStoreKey');
        }
        const token = GLOBAL_STORE.get(storeKey);
        if (token == null || token === '') {
            throw new MSHttpError(
                'HTTP_AUTH_TOKEN_MISSING',
                `Authentication token is missing from ms.store: ${storeKey}`
            );
        }
        headers.set('Authorization', `Bearer ${String(token)}`);
    }
    else if (type !== 'none' && type !== 'cookie') {
        throw __ms_http_config_error(`Unsupported HTTP authentication type: ${auth.Type}`);
    }

    return headers;
}

async function __ms_http_response_data(response, responseType, details) {
    if (responseType === 'response') return response;
    if (response.status === 204 || response.status === 205 || details.method === 'HEAD') return null;
    if (responseType === 'blob') return response.blob();
    if (responseType === 'arrayBuffer') return response.arrayBuffer();

    const text = await response.text();
    if (!text) return null;
    const contentType = response.headers.get('content-type') || '';
    const wantsJson = responseType === 'json' ||
        (responseType !== 'text' && /(?:application|text)\/(?:[^;]+\+)?json\b/i.test(contentType));

    if (!wantsJson) return text;
    try { return JSON.parse(text); }
    catch {
        throw new MSHttpError(
            'HTTP_RESPONSE_PARSE_ERROR',
            `Invalid JSON returned by ${details.method} ${details.path}`,
            details
        );
    }
}

async function __ms_http_request(rawOptions, ownerInstance = null) {
    await __MS_CONFIG_READY__;

    const options = __ms_http_object(rawOptions);
    const caller = ownerInstance || currentExecutionInstance() || activeInstance();
    const service = __ms_http_service(options.service, caller);
    const defaults = service.defaults;
    const serviceConfig = service.config;
    const method = String(options.method || 'GET').trim().toUpperCase();
    const path = options.url;
    const url = __ms_http_build_url(serviceConfig.BaseURL, path, options.params, service.name);
    const allowedOrigins = options.allowedOrigins || serviceConfig.AllowedOrigins || defaults.AllowedOrigins;
    __ms_http_origin_allowed(url, allowedOrigins, service.name);

    const authentication = Object.prototype.hasOwnProperty.call(serviceConfig, 'Authentication')
        ? serviceConfig.Authentication
        : defaults.Authentication;
    const headers = __ms_http_headers(defaults, serviceConfig, options.headers, authentication);
    const credentials = options.credentials || serviceConfig.Credentials || defaults.Credentials || 'same-origin';
    const timeoutValue = options.timeout ?? serviceConfig.Timeout ?? defaults.Timeout ?? 30000;
    const timeout = Math.max(0, Number(timeoutValue) || 0);
    const logging = options.logging ?? serviceConfig.Logging ?? defaults.Logging ?? false;

    let body = options.data;
    if (method === 'GET' || method === 'HEAD') {
        if (body != null) {
            throw new MSHttpError(
                'HTTP_BODY_NOT_ALLOWED',
                `${method} requests cannot contain data; use params for query values`,
                { service: service.name, method, url: url.href }
            );
        }
        body = undefined;
    }
    else if (body != null &&
        !(body instanceof FormData) &&
        !(body instanceof Blob) &&
        !(body instanceof URLSearchParams) &&
        typeof body !== 'string' &&
        !(body instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(body)) {
        body = JSON.stringify(body);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    let timedOut = false;
    let timer = null;
    const externalSignal = options.signal;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    if (externalSignal) {
        if (externalSignal.aborted) abortFromExternal();
        else externalSignal.addEventListener('abort', abortFromExternal, { once: true });
    }
    if (timeout > 0) {
        timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeout);
    }

    const started = performance.now();
    const details = { service: service.name, method, url: url.href, path: String(path || '') };
    try {
        const response = await fetch(url.href, {
            method,
            headers,
            body,
            credentials,
            signal: controller.signal,
            cache: options.cache,
            redirect: options.redirect
        });
        const data = await __ms_http_response_data(response, options.responseType || 'auto', {
            ...details,
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            throw new MSHttpError(
                'HTTP_STATUS_ERROR',
                `${method} ${path} failed with HTTP ${response.status} ${response.statusText}`.trim(),
                { ...details, status: response.status, statusText: response.statusText, data }
            );
        }

        if (logging) {
            console.info(`[MS HTTP] ${service.name} ${method} ${path} -> ${response.status} (${Math.round(performance.now() - started)}ms)`);
        }
        return data;
    }
    catch (error) {
        if (error instanceof MSHttpError) throw error;
        const code = timedOut
            ? 'HTTP_TIMEOUT'
            : controller.signal.aborted
                ? 'HTTP_ABORTED'
                : 'HTTP_NETWORK_ERROR';
        const message = timedOut
            ? `${method} ${path} timed out after ${timeout}ms`
            : controller.signal.aborted
                ? `${method} ${path} was aborted`
                : `${method} ${path} failed: ${error?.message || error}`;
        throw new MSHttpError(code, message, details);
    }
    finally {
        if (timer != null) clearTimeout(timer);
        externalSignal?.removeEventListener?.('abort', abortFromExternal);
    }
}

function __ms_http_endpoint_like(value) {
    return /^(?:[./?#]|https?:)/i.test(String(value || '').trim());
}

function __ms_http_read_call(args) {
    if (typeof args[1] === 'string') {
        return { service: args[0], url: args[1], options: __ms_http_object(args[2]) };
    }
    return { service: null, url: args[0], options: __ms_http_object(args[1]) };
}

function __ms_http_write_call(args) {
    const explicitService = args.length >= 3 &&
        typeof args[1] === 'string' &&
        !__ms_http_endpoint_like(args[0]);
    if (explicitService) {
        return {
            service: args[0],
            url: args[1],
            data: args[2],
            options: __ms_http_object(args[3])
        };
    }
    return {
        service: null,
        url: args[0],
        data: args[1],
        options: __ms_http_object(args[2])
    };
}

function __ms_create_http_api(ownerInstance = null) {
    const request = options => __ms_http_request(options, ownerInstance);
    const read = (method, args) => {
        const call = __ms_http_read_call(args);
        return request({ ...call.options, service: call.service, url: call.url, method });
    };
    const write = (method, args) => {
        const call = __ms_http_write_call(args);
        return request({
            ...call.options,
            service: call.service,
            url: call.url,
            method,
            data: call.data
        });
    };

    return Object.freeze({
        get(...args) { return read('GET', args); },
        post(...args) { return write('POST', args); },
        put(...args) { return write('PUT', args); },
        patch(...args) { return write('PATCH', args); },
        delete(...args) { return read('DELETE', args); },
        request(options) { return request(options); }
    });
}

function __ms_resource_entries(type) {
    const key =
        type === 'css' ? 'CommonCSS' :
            type === 'js' ? 'CommonJS' :
                null;
    if (!key) return [];

    const entries = MS_CONFIG[key];
    return Array.isArray(entries) ? entries : [];
}

function __ms_default_css_entries() {
    const entries =
        MS_CONFIG.DefaultCSS ||
        MS_CONFIG.defaultCSS ||
        MS_CONFIG['Default-CSS'] ||
        MS_CONFIG['default-css'];

    return entries && typeof entries === 'object' && !Array.isArray(entries)
        ? entries
        : {};
}

function __ms_normalize_default_css_key(value) {
    return String(value || '').trim().toLowerCase();
}

function __ms_default_css_key_aliases(value) {
    const key = __ms_normalize_default_css_key(value);

    if (key === 'select' || key === 'option' || key === 'options' || key === 'datalist' || key === 'native-select') {
        return ['select', 'option', 'options', 'datalist', 'native-select'];
    }

    if (key === 'section' || key === 'form.section' || key === 'ms.form.section' || key === 'mssection') {
        return ['section', 'form.section', 'ms.form.section', 'mssection'];
    }

    if (key === 'combo' || key === 'form.combo' || key === 'ms.form.combo' || key === 'mscombo') {
        return ['combo', 'form.combo', 'ms.form.combo', 'mscombo'];
    }

    if (key === 'grid' || key === 'form.grid' || key === 'ms.form.grid' || key === 'msgrid') {
        return ['grid', 'form.grid', 'ms.form.grid', 'msgrid'];
    }

    if (key === 'dialog' || key === 'ms.dialog' || key === 'msdialog') {
        return ['dialog', 'ms.dialog', 'msdialog'];
    }

    if (key === 'layout' || key === 'ms.layout' || key === 'mslayout') {
        return ['layout', 'ms.layout', 'mslayout'];
    }

    return [key];
}

function __ms_default_css_keys_match(a, b) {
    const left = __ms_default_css_key_aliases(a);
    const right = new Set(__ms_default_css_key_aliases(b));
    return left.some(x => right.has(x));
}

function __ms_default_css_url_for(name) {
    const entries = __ms_default_css_entries();
    const wanted = __ms_default_css_key_aliases(name);

    for (const [key, value] of Object.entries(entries)) {
        if (wanted.some(x => __ms_default_css_keys_match(key, x))) {
            return __ms_resolve_resource_url(value, MS_CONFIG_BASE_URL || location.href, 'css');
        }
    }

    return null;
}

function __ms_default_css_allowed_for_current(name) {
    const selected = (currentExecutionInstance() || activeInstance())?.security?.defaultCss;

    if (!Array.isArray(selected)) return true;
    if (!selected.length) return false;
    if (selected.some(x => __ms_normalize_default_css_key(x) === '*')) return true;

    return selected.some(x => __ms_default_css_keys_match(x, name));
}

function __ms_default_css_disabled_for_current() {
    const selected = (currentExecutionInstance() || activeInstance())?.security?.defaultCss;
    return Array.isArray(selected) && selected.length === 0;
}

function __ms_resource_url_of(entry) {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry.url === 'string') return entry.url;
    return null;
}

function __ms_resource_name(raw) {
    if (!raw) return '';

    try {
        const u = new URL(raw, location.href);
        return decodeURIComponent(u.pathname.split('/').pop() || '').toLowerCase();
    } catch {
        return String(raw).split(/[\\/]/).pop().toLowerCase();
    }
}

function __ms_resource_aliases(entry) {
    const url = __ms_resource_url_of(entry);
    if (!url) return [];

    if (typeof entry === 'string') {
        return [entry];
    }

    const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
    return [url, entry.name, ...aliases].filter(Boolean);
}

function __ms_common_resource_match(raw, baseUrl, type) {
    const absolute = new URL(raw, baseUrl || location.href).href;
    const name = __ms_resource_name(absolute);

    for (const entry of __ms_resource_entries(type)) {
        const url = __ms_resource_url_of(entry);
        if (!url) continue;

        const aliases = __ms_resource_aliases(entry);
        const found = aliases.some(alias => {
            try {
                if (new URL(alias, MS_CONFIG_BASE_URL || location.href).href === absolute) return true;
            } catch { }
            return __ms_resource_name(alias) === name;
        });

        if (found) {
            return new URL(url, MS_CONFIG_BASE_URL || location.href).href;
        }
    }

    return null;
}

function __ms_resolve_resource_url(raw, baseUrl, type) {
    return __ms_common_resource_match(raw, baseUrl, type) ||
        new URL(raw, baseUrl || location.href).href;
}

function __ms_is_common_resource_url(url, type) {
    return !!__ms_common_resource_match(url, location.href, type);
}

function __ms_load_text_resource(raw, baseUrl, type) {
    const url = __ms_resolve_resource_url(raw, baseUrl, type);
    const cache = RESOURCE_TEXT_CACHE[type];

    if (cache.has(url)) {
        return cache.get(url);
    }

    const p = fetch(url, { cache: 'no-cache' })
        .then(r => {
            if (!r.ok) {
                throw new Error(`Failed to load ${url}`);
            }
            return r.text();
        })
        .catch(e => {
            cache.delete(url);

            if (e?.message?.startsWith('Failed to load ')) {
                throw e;
            }

            throw new Error(`Failed to fetch ${url}: ${e?.message || e}`);
        });

    cache.set(url, p);
    return p;
}

async function __ms_load_original_html_source(url, fallbackHtml) {
    try {
        return await __ms_load_text_resource(url, location.href, 'html');
    }
    catch {
        return fallbackHtml;
    }
}

function __ms_load_css(url) {

    if (!url) return;

    url = __ms_resolve_resource_url(url, location.href, 'css');

    if (__MS_LOADED_CSS__.has(url)) return;

    __MS_LOADED_CSS__.add(url);

    __ms_load_text_resource(url, location.href, 'css')
        .then(css => {

            const style = document.createElement('style');
            style.setAttribute('data-ms-global-css', url);
            style.textContent = css;

            document.head.appendChild(style);

        });
}

function __ms_unique_urls(urls) {
    return [...new Set(urls.filter(Boolean))];
}

async function __ms_fetch_first_existing(urls, fileName) {
    const checked = [];

    for (const url of __ms_unique_urls(urls)) {
        checked.push(url);
        try {
            const r = await fetch(url, { cache: 'no-cache' });
            if (r.ok) {
                return { response: r, url, checked };
            }
        }
        catch {
            // Try the next candidate. If all fail, report the complete list.
        }
    }

    throw __ms_runtime_dependency_error(
        fileName,
        checked.join(' OR '),
        'No candidate path was found'
    );
}

let __MS_CONFIG_READY__ = (async function () {
    const candidates = [
        new URL('GlobalConfig.json', import.meta.url).href,
        new URL('../GlobalConfig.json', import.meta.url).href,
        new URL('GlobalConfig.json', location.href).href
    ];

    try {
        const { response: r, url } = await __ms_fetch_first_existing(candidates, 'GlobalConfig.json');
        MS_CONFIG_BASE_URL = new URL('.', url).href;

        const cfg = await r.json();

        __ms_apply_config(cfg);

        window.MS_CONFIG = MS_CONFIG;

    } catch (e) {
        if (e?.__msDependencyError) throw e;
        throw __ms_runtime_dependency_error(
            'GlobalConfig.json',
            __ms_unique_urls(candidates).join(' OR '),
            e?.message || String(e)
        );
    }
})();

let __MS_CALL_TREE_READY__ = (async function () {
    const candidates = [
        new URL('CallTree.json', import.meta.url).href,
        new URL('../CallTree.json', import.meta.url).href,
        new URL('CallTree.json', location.href).href
    ];

    try {
        const { response: r } = await __ms_fetch_first_existing(candidates, 'CallTree.json');
        if (!r.ok) return;

        const data = await r.json();
        __ms_register_call_tree_components(data?.m);
    }
    catch { }
})();

/* =========================================================
   4. READY
   ========================================================= */

let __ms_ready_resolve;
const __ms_ready = new Promise(r => __ms_ready_resolve = r);

/* =========================================================
   COMMON CASE INSENSITIVE HELPERS
   ========================================================= */

function __ms_getKeyCI(obj, key) {

    if (!obj || key == null)
        return null;

    return (
        Object.keys(obj)
            .find(x =>
                x.toLowerCase() ===
                String(key).toLowerCase()
            ) || null
    );
}

function __ms_getValueCI(obj, key) {

    if (!obj || key == null)
        return undefined;

    const k =
        __ms_getKeyCI(
            obj,
            key
        );

    return k
        ? obj[k]
        : undefined;
}

/* =========================================================
   5. ERROR SYSTEM
   ========================================================= */

function __ms_map_script_blob_frame(file, line) {
    const mapped = SCRIPT_BLOB_SOURCES.get(file);
    if (!mapped) {
        return { file, line };
    }

    const offset = Number(mapped.addedTopLines || 0);

    return {
        file: mapped.file || file,
        line: Math.max(1, Number(line || 1) - offset)
    };
}

function __ms_extract_frames(originalError) {

    if (!originalError || !originalError.stack)
        return [];

    const lines = originalError.stack.split('\n').slice(1);
    const frames = [];

    for (let l of lines) {

        const m =
            l.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) ||
            l.match(/at\s+(.*?):(\d+):(\d+)/);

        if (!m) continue;

        if (m.length === 5) {
            const mapped = __ms_map_script_blob_frame(m[2], parseInt(m[3], 10));
            frames.push({
                raw: l.trim(),
                fn: m[1],
                file: mapped.file,
                line: mapped.line
            });
        }
        else {
            const mapped = __ms_map_script_blob_frame(m[1], parseInt(m[2], 10));
            frames.push({
                raw: l.trim(),
                fn: null,
                file: mapped.file,
                line: mapped.line
            });
        }
    }

    return frames;
}

function __ms_build_error(originalError, comp, method) {

    const frames = __ms_extract_frames(originalError);

    let primaryFrame = null;
    let triggerFrame = null;

    for (let f of frames) {
        if (f.file && f.file.includes('ms.js'))
            continue;
        if (!primaryFrame) { primaryFrame = f; continue; }
        if (!triggerFrame) { triggerFrame = f; break; }
    }

    const callerName = originalError.__msCallerComponent;
    const http = originalError?.__msHttp || null;

    return {
        error: {
            code: http ? (originalError.code || 'HTTP_ERROR') : 'METHOD_EXCEPTION',
            message: originalError.message,
            method: http?.method || method || null,
            line: primaryFrame?.line || null,
            origin: comp || null,
            http,
            triggeredFrom: (callerName || triggerFrame)
                ? {
                    file: callerName
                        ? callerName + '.html'
                        : triggerFrame.file,
                    fn: triggerFrame?.fn || null,
                    line: triggerFrame?.line || null
                }
                : null
        },
        original: ENG_DEBUG ? originalError : null
    };
}

function __ms_format_file(file, origin) {

    if (!file) return '-';

    if (file.startsWith('blob:'))
        return origin ? origin + '.html' : '-';

    return file.split('/').pop();
}

function __ms_error_detail_enabled() {
    return MS_CONFIG.ErrorDetail !== false;
}

function __ms_is_engine_error(errObj) {
    const e = errObj?.error || {};
    return e.origin === 'ms.js' ||
        e.code === 'MS_DEPENDENCY_ERROR' ||
        e.method === 'runtime dependency';
}

function __ms_browser_error_detail_enabled(errObj) {
    if (!__ms_error_detail_enabled()) return false;
    if (ENG_DEBUG) return true;
    return !__ms_is_engine_error(errObj);
}

function __ms_error_stack(errObj) {
    if (!__ms_error_detail_enabled() || !ENG_DEBUG) return '';
    return errObj?.original?.stack || new Error().stack || '';
}

function __ms_error_source_instance() {
    return EXEC_STACK.length
        ? EXEC_STACK[EXEC_STACK.length - 1]
        : (currentExecutionInstance() || activeInstance() || CURRENT_SCREEN);
}

function __ms_error_payload(errObj, stack, includeDetail) {
    const e = errObj?.error || {};

    const payload = {
        warning: MS_CONFIG.ErrorWarning,
        detail: !!includeDetail,
        time: new Date().toISOString()
    };

    if (!includeDetail) return payload;

    payload.code = e.code || 'MS_ERROR';
    payload.message = e.message || '';
    payload.origin = e.origin || null;
    payload.method = e.method || null;
    payload.line = e.line || null;
    payload.triggeredFrom = e.triggeredFrom || null;
    payload.http = e.http || null;
    payload.stack = stack || '';
    payload.url = location.href;

    return payload;
}

function __ms_escape_html(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function __ms_console_error(errObj, stack) {
    if (!MS_CONFIG.ErrorConsole) return;
    if (!ENG_DEBUG && __ms_is_engine_error(errObj)) return;

    if (!__ms_browser_error_detail_enabled(errObj)) {
        console.error(MS_CONFIG.ErrorWarning);
        return;
    }

    const e = errObj.error || {};
    let out =
        `Code: ${e.code || 'MS_ERROR'}\n` +
        `Message: ${e.message || '-'}\n` +
        `Origin: ${e.origin || '-'} , ${e.method || '-'} , Line ${e.line || '-'}\n`;

    if (e.triggeredFrom) {
        out +=
            `Triggered From: ${__ms_format_file(e.triggeredFrom.file, e.origin)} , ` +
            `${e.triggeredFrom.fn || '-'} , Line ${e.triggeredFrom.line || '-'}\n`;
    }

    if (e.http) {
        out +=
            `HTTP: ${e.http.service || '-'} , ${e.http.method || '-'} , ` +
            `${e.http.status ?? '-'} , ${e.http.url || '-'}\n`;
    }

    if (ENG_DEBUG && stack)
        out += `\nStack:\n${stack}`;

    console.error(out);
}

function __ms_report_error(errObj, stack) {
    if (!MS_CONFIG.ErrorServerURL) return;

    fetch(MS_CONFIG.ErrorServerURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(__ms_error_payload(errObj, stack, true))
    }).catch(() => { });
}

function __ms_halt_engine(errObj) {

    if (MS_HALTED) return;

    MS_HALTED = true;
    MS_LAST_ERROR = errObj;

    const source = __ms_error_source_instance();
    errObj.__msSourceRef = source?.refId || null;
    errObj.__msParentRef = source?.parentRef || null;

    const stack = __ms_error_stack(errObj);

    __ms_console_error(errObj, stack);
    __ms_report_error(errObj, stack);

    if (MS_CONFIG.ErrorPopup !== false)
        __ms_show_error_popup(errObj, stack);
}

function __ms_access_error(sourceInstance, targetDesc, operation, reason) {
    const source = sourceInstance?.name || '-';
    const target = targetDesc?.logical || '-';
    const errObj = {
        error: {
            code: 'ACCESS_DENIED',
            message: `Access denied: ${source} cannot ${operation} ${target}. ${reason}`,
            method: operation,
            line: null,
            origin: source,
            triggeredFrom: {
                file: `${source}.html`,
                fn: operation,
                line: null
            }
        },
        original: ENG_DEBUG
            ? new Error(`Access denied: ${source} cannot ${operation} ${target}. ${reason}`)
            : null
    };

    __ms_halt_engine(errObj);

    const e = new Error(errObj.error.message);
    e.code = 'ACCESS_DENIED';
    e.__msErrorObject = errObj;
    return e;
}

function enforceRuntimeAccess(sourceInstance, targetDesc, operation) {
    if (!sourceInstance || !targetDesc) return;

    const sourceAccess = sourceInstance.security?.access || {};
    const target = targetDesc.logical;

    if (sourceAccess.blockOut && !accessTargetInsideSource(sourceInstance, target)) {
        throw __ms_access_error(
            sourceInstance,
            targetDesc,
            operation,
            "The caller has <access> block out."
        );
    }

    if (sourceAccess.blockIn && accessTargetInsideSource(sourceInstance, target)) {
        throw __ms_access_error(
            sourceInstance,
            targetDesc,
            operation,
            "The caller has <access> block in."
        );
    }

    const targetHtml = COMPONENT_CACHE.get(target);
    if (!targetHtml) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = targetHtml;
    const targetAccess = parsePublicPolicy(tpl).access || {};
    const allowed = targetAccess.allowedConsumers || [];

    if (allowed.length && !listAllowsComponent(allowed, sourceInstance.name)) {
        throw __ms_access_error(
            sourceInstance,
            targetDesc,
            operation,
            "The target component <access> list does not allow this caller."
        );
    }
}

async function __ms_show_custom_error_popup(errObj, stack) {

    const customUrl = String(MS_CONFIG.ErrorCustomPopupURL || '').trim();
    if (!customUrl) return false;

    if (!document.body) {
        await new Promise(resolve =>
            document.addEventListener('DOMContentLoaded', resolve, { once: true })
        );
    }

    const overlay = document.createElement('div');
    overlay.setAttribute('data-ms-error-modal', 'custom');
    overlay.style.cssText =
        "position:fixed;inset:0;background:rgba(15,23,42,.48);display:flex;" +
        "align-items:center;justify-content:center;z-index:2147483647;padding:18px;";

    const host = document.createElement('div');
    host.style.cssText = "width:min(560px,100%);max-height:calc(100vh - 36px);";
    overlay.appendChild(host);
    document.body.appendChild(overlay);

    try {
        const desc = createDescriptorFromBase(customUrl, MS_CONFIG_BASE_URL);
        MS_ERROR_MODAL = overlay;
        MS_ERROR_RETURN_TO_PARENT_ON_CLOSE = false;
        MS_ERROR_INSTANCE = await createInstance(
            desc,
            host,
            'error',
            __ms_error_payload(errObj, stack, __ms_browser_error_detail_enabled(errObj)),
            __ms_error_source_instance()
        );
        return true;
    }
    catch (e) {
        overlay.remove();
        if (MS_ERROR_MODAL === overlay) {
            MS_ERROR_MODAL = null;
        }
        return false;
    }
}

function __ms_show_system_error_popup(errObj, stack) {

    if (!document.body) {
        document.addEventListener(
            'DOMContentLoaded',
            () => __ms_show_system_error_popup(errObj, stack),
            { once: true }
        );
        return;
    }

    const detail = __ms_browser_error_detail_enabled(errObj);
    const payload = __ms_error_payload(errObj, stack, detail);
    const e = errObj.error || {};
    const triggered = e.triggeredFrom;

    const overlay = document.createElement('div');
    overlay.setAttribute('data-ms-error-modal', 'system');
    overlay.style.cssText =
        "position:fixed;inset:0;background:rgba(15,23,42,.50);display:flex;" +
        "align-items:center;justify-content:center;z-index:2147483647;padding:18px;";

    const box = document.createElement('div');
    box.style.cssText =
        "width:min(520px,100%);background:#fff;border:1px solid #cbd5e1;" +
        "box-shadow:0 18px 45px rgba(15,23,42,.28);border-radius:8px;" +
        "font-family:Segoe UI,Arial,sans-serif;color:#111827;overflow:hidden;";

    const detailsHtml = detail
        ? `<div style="padding:14px 18px 2px;font-size:13px;line-height:1.45;color:#334155;">
                <div><b>Code:</b> ${__ms_escape_html(payload.code)}</div>
                <div><b>Message:</b> ${__ms_escape_html(payload.message)}</div>
                <div><b>Origin:</b> ${__ms_escape_html(payload.origin || '-')} , ${__ms_escape_html(payload.method || '-')} , Line ${__ms_escape_html(payload.line || '-')}</div>
                ${e.http
            ? `<div><b>HTTP:</b> ${__ms_escape_html(e.http.service || '-')} , ${__ms_escape_html(e.http.method || '-')} , Status ${__ms_escape_html(e.http.status ?? '-')} , ${__ms_escape_html(e.http.url || '-')}</div>`
            : ''}
                ${triggered
            ? `<div><b>Triggered From:</b> ${__ms_escape_html(__ms_format_file(triggered.file, e.origin))} , ${__ms_escape_html(triggered.fn || '-')} , Line ${__ms_escape_html(triggered.line || '-')}</div>`
            : ''}
                ${payload.stack
            ? `<pre style="margin:12px 0 0;max-height:220px;overflow:auto;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:4px;">${__ms_escape_html(payload.stack)}</pre>`
            : ''}
           </div>`
        : '';

    box.innerHTML =
        `<div style="background:#0f3550;color:#fff;padding:14px 18px;font-size:16px;font-weight:600;">
            ${__ms_escape_html(MS_CONFIG.ErrorWarning)}
        </div>` +
        detailsHtml +
        `<div style="display:flex;justify-content:flex-end;padding:14px 18px 16px;">
            <button id="__ms_err_ok" style="min-width:76px;height:30px;border:1px solid #0f3550;background:#0f3550;color:#fff;border-radius:4px;cursor:pointer;">OK</button>
        </div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    MS_ERROR_MODAL = overlay;
    MS_ERROR_RETURN_TO_PARENT_ON_CLOSE = true;

    box.querySelector('#__ms_err_ok').onclick = () => ms.ErrorClose();
}

function __ms_show_error_popup(errObj, stack) {

    if (MS_ERROR_MODAL) return;

    __ms_show_custom_error_popup(errObj, stack)
        .then(shown => {
            if (!shown && !MS_ERROR_MODAL) {
                __ms_show_system_error_popup(errObj, stack);
            }
        })
        .catch(() => {
            if (!MS_ERROR_MODAL) {
                __ms_show_system_error_popup(errObj, stack);
            }
        });
}

async function __ms_return_to_error_parent() {
    const source = INSTANCES.get(MS_LAST_ERROR?.__msSourceRef);
    const parent = INSTANCES.get(source?.parentRef || MS_LAST_ERROR?.__msParentRef);

    if (!source || !parent || source !== CURRENT_SCREEN) return;

    try {
        if (source.host) source.host.style.display = 'none';
        if (parent.host) parent.host.style.display = '';
        CURRENT_SCREEN = parent;
        await callLifecycle(parent, 'onShow');
    }
    catch { }
}

function __ms_runtime_dependency_error(fileName, url, detail = '') {
    const message =
        `MS runtime dependency not found or invalid: ${fileName}. ` +
        `Expected: ${url}` +
        (detail ? `. ${detail}` : '');

    const errObj = {
        error: {
            code: 'MS_DEPENDENCY_ERROR',
            message,
            method: 'runtime dependency',
            line: null,
            origin: 'ms.js',
            triggeredFrom: {
                file: 'ms.js',
                fn: 'runtime dependency',
                line: null
            }
        },
        original: ENG_DEBUG ? new Error(message) : null
    };

    __ms_halt_engine(errObj);

    const e = new Error(message);
    e.code = 'MS_DEPENDENCY_ERROR';
    e.__msDependencyError = true;
    e.__msErrorObject = errObj;
    return e;
}


function __ms_global_fatal_handler(rawError) {

    if (MS_HALTED) return;

    const err =
        rawError instanceof Error
            ? rawError
            : new Error(String(rawError));

    if (err instanceof __MS_STOP_EXECUTION__) {
        return;   // do NOT treat as fatal
    }

    const inst =
        EXEC_STACK.length
            ? EXEC_STACK[EXEC_STACK.length - 1]
            : CURRENT_SCREEN;

    const compName = inst ? inst.name : null;

    const errObj = __ms_build_error(
        err,
        compName,
        null
    );

    __ms_halt_engine(errObj);
}

window.addEventListener('error', function (event) {

    if (event.error instanceof __MS_STOP_EXECUTION__) {
        event.preventDefault();   // suppress browser uncaught log
        return;
    }

    __ms_global_fatal_handler(event.error || event.message);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', function (event) {

    if (event.reason instanceof __MS_STOP_EXECUTION__) {
        event.preventDefault();
        return;
    }

    __ms_global_fatal_handler(event.reason);
    event.preventDefault();
});


/* =========================================================
   6. COMPONENT LOADING
   ========================================================= */

function splitComponentResource(raw) {
    const value = String(raw || '').trim();
    const match = value.match(/^([^?#]*)([?#].*)?$/);
    return {
        path: match ? match[1] : value,
        suffix: match?.[2] || ''
    };
}

function normalizeComponentLogicalName(value) {
    return normalizeComponentRuleName(splitComponentResource(value).path)
        .replace(/^\/+/, '');
}

function __ms_register_component_name(value) {
    const logical = normalizeComponentLogicalName(value);
    if (!logical) return;

    COMPONENT_NAME_EXACT.set(logical, logical);

    const lower = logical.toLowerCase();
    const existing = COMPONENT_NAME_LOWER.get(lower);

    if (existing && existing !== logical) {
        const matches = COMPONENT_NAME_CONFLICTS.get(lower) || new Set([existing]);
        matches.add(logical);
        COMPONENT_NAME_CONFLICTS.set(lower, matches);
        COMPONENT_NAME_LOWER.delete(lower);
        return;
    }

    if (!COMPONENT_NAME_CONFLICTS.has(lower)) {
        COMPONENT_NAME_LOWER.set(lower, logical);
    }
}

function __ms_register_call_tree_components(mapText) {
    if (typeof mapText !== 'string') return;

    for (const entry of mapText.split('|')) {
        const idx = entry.indexOf('=');
        if (idx < 0) continue;
        __ms_register_component_name(entry.slice(idx + 1));
    }
}

function resolveComponentLogicalName(name) {
    const logical = normalizeComponentLogicalName(name);
    if (!logical) return logical;

    if (COMPONENT_NAME_EXACT.has(logical)) {
        return COMPONENT_NAME_EXACT.get(logical);
    }

    const lower = logical.toLowerCase();
    const conflict = COMPONENT_NAME_CONFLICTS.get(lower);

    if (conflict) {
        throw new Error(
            `Ambiguous component name: ${name}. Matches: ${[...conflict].join(', ')}`
        );
    }

    return COMPONENT_NAME_LOWER.get(lower) || logical;
}

function ensureComponentHtmlResource(raw) {
    const parts = splitComponentResource(raw);
    const path = /\.html$/i.test(parts.path)
        ? parts.path
        : parts.path + '.html';

    return path + parts.suffix;
}

function stripComponentHtmlResource(raw) {
    const parts = splitComponentResource(raw);
    return parts.path.replace(/\.html$/i, '');
}

function logicalNameFromUrl(url) {
    try {
        const u = new URL(url, location.href);
        if (u.origin === location.origin) {
            return u.pathname.replace(/^\/+/, '').replace(/\.html$/i, '');
        }

        return u.href.replace(/[?#].*$/, '').replace(/\.html$/i, '');
    }
    catch {
        return stripComponentHtmlResource(url);
    }
}

function createDescriptor(name) {
    const parts = splitComponentResource(name);
    const rootAbsolute = parts.path.trimStart().startsWith('/');
    const logical = resolveComponentLogicalName(parts.path);
    const publicName = stripComponentHtmlResource(name);
    const file = (rootAbsolute ? '/' : '') + logical + '.html' + parts.suffix;

    return {
        logical,
        publicName,
        file,
        url: new URL(file, location.href).href
    };
}

function createDescriptorFromBase(name, baseUrl) {
    const file = ensureComponentHtmlResource(name);
    const url = new URL(file, baseUrl || location.href).href;

    return {
        logical: logicalNameFromUrl(url),
        publicName: stripComponentHtmlResource(name),
        file: url,
        url
    };
}

function descriptorsPointToSameUrl(a, b) {
    try {
        return new URL(a?.url || a?.file, location.href).href ===
            new URL(b?.url || b?.file, location.href).href;
    }
    catch {
        return false;
    }
}

function addDescriptorFallback(desc, fallback) {
    if (!fallback || descriptorsPointToSameUrl(desc, fallback)) return desc;
    desc.fallbackDescriptors = [fallback];
    return desc;
}

function adoptDescriptor(target, source) {
    if (!target || !source || target === source) return;
    target.logical = source.logical;
    target.publicName = source.publicName;
    target.file = source.file;
    target.url = source.url;
}

function isCallerRelativeComponentPath(name) {
    const path = splitComponentResource(name).path.trim();
    return path.startsWith('./') || path.startsWith('../');
}

function createDescriptorForCaller(name, caller = null) {
    if (caller?.url && isCallerRelativeComponentPath(name)) {
        return addDescriptorFallback(
            createDescriptorFromBase(name, caller.url),
            createDescriptor(name)
        );
    }

    return createDescriptor(name);
}

function isIdentifierName(name) {
    return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name || '');
}

function isPlainObject(value) {
    if (!value || typeof value !== 'object') return false;
    if (value instanceof HTMLElement) return false;
    if (value?.el) return false;

    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function normalizeInjectArgs(args) {
    const [name, second, third, fourth] = args;

    if (isPlainObject(second) && args.length >= 3) {
        return {
            name,
            constructorParams: second,
            target: third,
            options: fourth || {}
        };
    }

    return {
        name,
        constructorParams: undefined,
        target: second,
        options: third || {}
    };
}

function ensureSystemRoot() {
    if (!SYSTEM_ROOT) {
        SYSTEM_ROOT = document.createElement('div');
        SYSTEM_ROOT.id = '__ms_screen_root';
        document.body.appendChild(SYSTEM_ROOT);
    }
    return SYSTEM_ROOT;
}

async function loadComponent(desc) {

    const candidates = [desc, ...(desc.fallbackDescriptors || [])];
    let lastError = null;

    for (const candidate of candidates) {

        if (COMPONENT_CACHE.has(candidate.logical)) {
            adoptDescriptor(desc, candidate);
            return COMPONENT_CACHE.get(candidate.logical);
        }

        if (PRELOAD_PROMISES.has(candidate.logical)) {
            try {
                const html = await PRELOAD_PROMISES.get(candidate.logical);
                adoptDescriptor(desc, candidate);
                return html;
            }
            catch (e) {
                lastError = e;
                continue;
            }
        }

        const p = (async () => {

            try {

                const r = await fetch(candidate.file, { cache: 'no-cache' });

                if (!r.ok)
                    throw new Error(`Failed to load ${candidate.file}`);

                const html = await r.text();

                COMPONENT_CACHE.set(candidate.logical, html);

                if (typeof __ms_preload_images === 'function')
                    __ms_preload_images(html, candidate.url);

                return html;

            }
            finally {

                PRELOAD_PROMISES.delete(candidate.logical);

            }

        })();

        PRELOAD_PROMISES.set(candidate.logical, p);

        try {
            const html = await p;
            adoptDescriptor(desc, candidate);
            return html;
        }
        catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error(`Failed to load ${desc.file}`);
}

function lookupInstance(refId) {
    return INSTANCES.get(refId) || null;
}

function idInInstance(instance, id) {
    if (!instance) {
        throw new Error(`ms.id(${id}) cannot resolve context`);
    }

    const root = instance.root;

    const el = root.querySelector('#' + id);
    if (el) return new MSDomRef(el);

    if (__ms_is_custom_tag_name(id)) {
        const tag = id.toLowerCase();
        const el2 = root.querySelector(tag);
        if (el2) return new MSDomRef(el2);
    }

    throw new Error(`Element not found in current component: ${id}`);
}

function scopedInstanceOrCurrent(refId) {
    return lookupInstance(refId) || currentExecutionInstance() || activeInstance();
}

function createScopedMS(refId, target = null, cache = new WeakMap()) {
    const rootTarget = target || ms;

    if (rootTarget && typeof rootTarget === 'object' && cache.has(rootTarget)) {
        return cache.get(rootTarget);
    }

    const proxy = new Proxy(rootTarget, {
        get(t, prop, receiver) {
            const instance = scopedInstanceOrCurrent(refId);

            if (!target) {
                if (prop === 'loadingAnimation') {
                    return __ms_create_loading_animation_api(instance);
                }

                if (prop === 'http') {
                    return __ms_create_http_api(instance);
                }

                if (prop === 'id') {
                    return (id) => idInInstance(instance, id);
                }

                if (prop === 'q') {
                    return (sel) => {
                        if (!instance) throw new Error("MS not ready");
                        const el = instance.root.querySelector(sel);
                        return el ? new MSDomRef(el) : null;
                    };
                }

                if (prop === 'qa') {
                    return (sel) => {
                        if (!instance) throw new Error("MS not ready");
                        return [...instance.root.querySelectorAll(sel)]
                            .map(e => new MSDomRef(e));
                    };
                }

                if (prop === 'call') {
                    return (fn, ...presetArgs) => {
                        if (typeof fn !== 'function') {
                            throw new Error('ms.call: first argument must be a function');
                        }

                        return function (event) {
                            return withInstanceContext(instance, fn.name || 'call', () => {
                                if (fn.length === presetArgs.length) {
                                    return fn.call(this, ...presetArgs);
                                }

                                return fn.call(this, event, ...presetArgs);
                            });
                        };
                    };
                }

                if (prop === 'com' || prop === 'component') {
                    return (target) => createDeclarativeComponentProxy(target, instance);
                }
            }

            const value = Reflect.get(t, prop, receiver);

            if (value && typeof value === 'object') {
                return createScopedMS(refId, value, cache);
            }

            if (typeof value === 'function') {
                return function (...args) {
                    const result = withInstanceContext(
                        instance,
                        String(prop),
                        () => value.apply(t, args)
                    );

                    const formControlFactory = t === ms.form && [
                        'combo', 'grid', 'section', 'input', 'checkbox',
                        'radio', 'button', 'buttons', 'image'
                    ].includes(String(prop));

                    if (formControlFactory && result && typeof result === 'object' &&
                        !Object.prototype.hasOwnProperty.call(result, '__msCreateRemoteDataSource')) {
                        Object.defineProperty(result, '__msCreateRemoteDataSource', {
                            configurable: false,
                            enumerable: false,
                            writable: false,
                            value(service, endpoint) {
                                return withInstanceContext(
                                    instance,
                                    'form.dataSource',
                                    () => ms.data(service, endpoint)
                                );
                            }
                        });
                    }

                    return result;
                };
            }

            return value;
        },

        set(t, prop, value, receiver) {
            return Reflect.set(t, prop, value, receiver);
        }
    });

    if (rootTarget && typeof rootTarget === 'object') {
        cache.set(rootTarget, proxy);
    }

    return proxy;
}

function scopedMSModuleUrl(instance) {
    if (SCOPED_MS_MODULES.has(instance.refId)) {
        return SCOPED_MS_MODULES.get(instance.refId);
    }

    const code =
        `const ms = globalThis.__MS_CREATE_SCOPED_MS__(${instance.refId});\n` +
        `export { ms };\n` +
        `export default ms;\n`;

    const url = URL.createObjectURL(
        new Blob([code], { type: 'text/javascript' })
    );

    SCOPED_MS_MODULES.set(instance.refId, url);
    registerInstanceCleanup(instance, () => {
        URL.revokeObjectURL(url);
        SCOPED_MS_MODULES.delete(instance.refId);
    });

    return url;
}

function isMSModuleSpecifier(spec, baseUrl) {
    if (!NON_BARE_RE.test(spec)) return false;

    try {
        return __ms_resource_name(new URL(spec, baseUrl).href) === 'ms.js';
    } catch {
        return false;
    }
}

function rewriteScopedMSImports(code, baseUrl, instance) {
    const scopedUrl = scopedMSModuleUrl(instance);

    return replaceImportSpecifiers(code, spec => {
        if (isMSModuleSpecifier(spec, baseUrl)) {
            return scopedUrl;
        }
    });
}

function hasLocalMSBinding(code) {
    return (
        /\bimport\s+ms\s*(?:,|\s+from\b)/.test(code) ||
        /\bimport\s+\*\s+as\s+ms\s+from\b/.test(code) ||
        /\bimport\s*\{[\s\S]*?\b(?:ms\s*(?:,|})|as\s+ms\b)[\s\S]*?\}\s*from\b/.test(code) ||
        /\b(?:const|let|var|function|class)\s+ms\b/.test(code)
    );
}

function prependImplicitScopedMSImport(code, instance) {
    if (!instance || !/\bms\s*\./.test(code) || hasLocalMSBinding(code)) {
        return code;
    }

    // Keep the component's original line numbers so editor breakpoints remain exact.
    return `import ms from "${scopedMSModuleUrl(instance)}";` + code;
}

function looksLikeFullDocument(html) {
    return /<(?:!doctype|html|head|body)\b/i.test(html || '');
}

function createComponentTemplate(html) {
    const tpl = document.createElement('template');

    if (!looksLikeFullDocument(html)) {
        tpl.innerHTML = html;
        return tpl;
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const localBody = document.createElement('body');

    for (const attr of parsed.body.attributes) {
        localBody.setAttribute(attr.name, attr.value);
    }

    for (const node of [...parsed.head.childNodes]) {
        tpl.content.appendChild(node.cloneNode(true));
    }

    for (const node of [...parsed.body.childNodes]) {
        localBody.appendChild(node.cloneNode(true));
    }

    tpl.content.appendChild(localBody);
    return tpl;
}

function cloneForComponentDom(node) {
    if (node.nodeName === 'SCRIPT') return null;

    const clone = node.cloneNode(false);

    for (const child of node.childNodes) {
        const childClone = cloneForComponentDom(child);
        if (childClone) clone.appendChild(childClone);
    }

    return clone;
}

function localViewportElement(instance) {
    return instance?.localDocument?.body?.nodeType === 1
        ? instance.localDocument.body
        : instance?.host;
}

function localViewportSize(instance) {
    const el = localViewportElement(instance);
    const rect = el?.getBoundingClientRect?.();
    const containerRect = instance?.container?.getBoundingClientRect?.();

    return {
        width: Math.max(1, Math.round(rect?.width || containerRect?.width || window.innerWidth || 1)),
        height: Math.max(1, Math.round(rect?.height || containerRect?.height || window.innerHeight || 1))
    };
}

function prepareLocalDocument(instance) {
    const root = instance.root;
    const body = root.querySelector('body');
    const head = root.querySelector('head');
    const html = root.querySelector('html');

    instance.localDocument = {
        body: body || root,
        head: head || root,
        documentElement: html || body || instance.host
    };

    if (body) {
        instance.host.style.display ||= 'block';
        instance.host.style.width ||= '100%';

        body.style.display ||= 'block';
        body.style.position ||= 'relative';
        body.style.width ||= '100%';

        if (instance.parentRef) {
            body.style.height ||= body.style.minHeight || '70vh';
        } else {
            body.style.minHeight ||= '100vh';
        }
    }
}

function createScopedDocument(refId) {
    const instance = scopedInstanceOrCurrent(refId);
    const local = instance?.localDocument || {};
    const body = local.body || document.body;
    const head = local.head || document.head;
    const documentElement = local.documentElement || document.documentElement;

    return new Proxy(document, {
        get(target, prop, receiver) {
            if (prop === 'body') return body;
            if (prop === 'head') return head;
            if (prop === 'documentElement') return documentElement;

            if (prop === 'getElementById') {
                return (id) => instance?.root?.querySelector('#' + id) || null;
            }

            if (prop === 'querySelector') {
                return (sel) => instance?.root?.querySelector(sel) || null;
            }

            if (prop === 'querySelectorAll') {
                return (sel) => instance?.root
                    ? instance.root.querySelectorAll(sel)
                    : target.querySelectorAll(sel);
            }

            if (prop === 'addEventListener') {
                return (type, listener, options) => {
                    const eventTarget = localViewportElement(instance) || target;
                    return eventTarget.addEventListener(type, listener, options);
                };
            }

            if (prop === 'removeEventListener') {
                return (type, listener, options) => {
                    const eventTarget = localViewportElement(instance) || target;
                    return eventTarget.removeEventListener(type, listener, options);
                };
            }

            const value = Reflect.get(target, prop, target);
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
}

function resolveElementByIdCI(root, id) {
    if (!root || typeof id !== 'string') return null;

    const target = id.toLowerCase();
    const matches = [];

    for (const el of root.querySelectorAll('[id]')) {
        if (String(el.id || '').toLowerCase() === target) {
            matches.push(el);
            if (matches.length > 1) break;
        }
    }

    if (matches.length === 1) {
        return matches[0];
    }

    if (matches.length > 1) {
        throw new Error(
            `Ambiguous container id: ${id}. Matches: ${matches.map(el => el.id).join(', ')}`
        );
    }

    return null;
}

function syncSvgDefinedCustomProperties(root) {
    if (!root?.querySelectorAll) return;

    for (const style of root.querySelectorAll('svg defs style')) {
        const svg = style.closest('svg');
        const container = svg?.parentElement;
        const cssText = String(style.textContent || '');

        for (const match of cssText.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
            const name = match[1];
            const value = match[2].trim();
            svg?.style?.setProperty(name, value);
            container?.style?.setProperty(name, value);
        }
    }
}

function refreshThirdPartyRenderedOutput(root) {
    if (!root?.querySelectorAll) return;

    syncSvgDefinedCustomProperties(root);

    requestAnimationFrame(() => {
        syncSvgDefinedCustomProperties(root);
    });

    setTimeout(() => {
        syncSvgDefinedCustomProperties(root);
    }, 80);
}

function observeThirdPartyRenderedOutput(instance) {
    if (!instance?.root || typeof MutationObserver !== 'function') return;

    let scheduled = false;

    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            refreshThirdPartyRenderedOutput(instance.root);
        });
    };

    const observer = new MutationObserver(records => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (
                    node.matches?.('svg, defs style') ||
                    node.querySelector?.('svg, defs style')
                ) {
                    schedule();
                    return;
                }
            }
        }
    });

    observer.observe(instance.root, { childList: true, subtree: true });
    registerInstanceCleanup(instance, () => observer.disconnect());
}

function createScopedWindow(refId) {
    const instance = scopedInstanceOrCurrent(refId);
    const resizeListeners = new Map();

    return new Proxy(window, {
        get(target, prop, receiver) {
            if (prop === 'document') return createScopedDocument(refId);

            if (prop === 'innerWidth') return localViewportSize(instance).width;
            if (prop === 'innerHeight') return localViewportSize(instance).height;

            if (prop === 'addEventListener') {
                return (type, listener, options) => {
                    const globalRule = findGlobalDomEventRule(instance, type, 'listen');
                    if (globalRule) {
                        return addConfiguredGlobalDomListener(instance, type, listener, options, globalRule);
                    }

                    if (type === 'resize' && typeof ResizeObserver === 'function') {
                        const el = localViewportElement(instance);
                        if (el && typeof listener === 'function') {
                            const observer = new ResizeObserver(() => {
                                withInstanceContext(instance, 'resize', listener, target, [new Event('resize')]);
                            });
                            observer.observe(el);
                            resizeListeners.set(listener, observer);
                            registerInstanceCleanup(instance, () => observer.disconnect());
                            return;
                        }
                    }

                    if (LOCAL_WINDOW_KEY_EVENTS.has(type)) {
                        return localWindowEventTarget(instance).addEventListener(type, listener, options);
                    }

                    const eventTarget = ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel', 'pointermove', 'pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend']
                        .includes(type)
                        ? (localViewportElement(instance) || target)
                        : localWindowEventTarget(instance);

                    return eventTarget.addEventListener(type, listener, options);
                };
            }

            if (prop === 'removeEventListener') {
                return (type, listener, options) => {
                    if (removeConfiguredGlobalDomListener(instance, type, listener, options)) {
                        return;
                    }

                    const observer = resizeListeners.get(listener);
                    if (observer) {
                        observer.disconnect();
                        resizeListeners.delete(listener);
                        return;
                    }

                    if (LOCAL_WINDOW_KEY_EVENTS.has(type)) {
                        return localWindowEventTarget(instance).removeEventListener(type, listener, options);
                    }

                    const eventTarget = ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel', 'pointermove', 'pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend']
                        .includes(type)
                        ? (localViewportElement(instance) || target)
                        : localWindowEventTarget(instance);

                    return eventTarget.removeEventListener(type, listener, options);
                };
            }

            if (prop === 'dispatchEvent') {
                return (event) => {
                    const globalRule = findGlobalDomEventRule(instance, event?.type, 'emit', event);
                    const eventTarget = globalRule ? target : localWindowEventTarget(instance);
                    return eventTarget.dispatchEvent(event);
                };
            }

            const value = Reflect.get(target, prop, target);
            return typeof value === 'function' ? value.bind(target) : value;
        },

        set(target, prop, value, receiver) {
            return Reflect.set(target, prop, value, target);
        }
    });
}

function readBooleanAttribute(el, name) {
    if (!el?.hasAttribute?.(name)) return false;

    const value = String(el.getAttribute(name) || '').trim().toLowerCase();
    return value === '' || value === name.toLowerCase() || value === 'true' || value === '1' || value === 'yes';
}

function parseScalarParamValue(value) {
    const text = String(value);
    const lower = text.toLowerCase();

    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null') return null;
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);

    return value;
}

function parseUrlParams(raw, baseUrl) {
    try {
        const url = new URL(raw, baseUrl || location.href);
        if (!url.search) return undefined;

        const params = {};
        url.searchParams.forEach((value, key) => {
            params[key] = parseScalarParamValue(value);
        });

        return Object.keys(params).length ? params : undefined;
    }
    catch {
        return undefined;
    }
}

function parseDeclarativeParams(raw) {
    if (raw == null) return undefined;

    const text = String(raw).trim();
    if (!text) return undefined;

    if (/^[{\[]/.test(text)) {
        try {
            return JSON.parse(text);
        }
        catch (e) {
            throw new Error(`<ms-com> params must be valid JSON: ${e.message}`);
        }
    }

    try {
        return JSON.parse(text);
    }
    catch { }

    if (text.startsWith('?') || text.includes('=')) {
        const params = {};
        const source = text.startsWith('?') ? text.slice(1) : text;

        new URLSearchParams(source).forEach((value, key) => {
            params[key] = parseScalarParamValue(value);
        });

        return Object.keys(params).length ? params : text;
    }

    return text;
}

function mergeDeclarativeParams(queryParams, attrParams) {
    if (queryParams === undefined) return attrParams;
    if (attrParams === undefined) return queryParams;

    if (isPlainObject(queryParams) && isPlainObject(attrParams)) {
        return { ...queryParams, ...attrParams };
    }

    return attrParams;
}

function declarativeComponentSource(el) {
    return el.getAttribute('src') ||
        el.getAttribute('path') ||
        el.getAttribute('component') ||
        el.getAttribute('name');
}

function declarativeComponentParams(el, src, baseUrl) {
    return mergeDeclarativeParams(
        parseUrlParams(src, baseUrl),
        parseDeclarativeParams(el.getAttribute('params'))
    );
}

function hasDeclarativeComponentAncestor(el, root) {
    let p = el.parentElement;
    while (p && p !== root) {
        if (p.matches?.(DECLARATIVE_COMPONENT_SELECTOR)) return true;
        p = p.parentElement;
    }
    return false;
}

function clearDeclarativeFallback(el) {
    if (el.__msDeclarativeFallbackCleared) return;

    const fallbackNodes = el.__msDeclarativeFallbackNodes;

    if (fallbackNodes) {
        for (const node of fallbackNodes) {
            if (node.parentNode === el) {
                el.removeChild(node);
            }
        }
    } else {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    el.__msDeclarativeFallbackCleared = true;
}

function captureDeclarativeFallbackNodes(root) {
    if (!root?.querySelectorAll) return;

    for (const el of root.querySelectorAll(DECLARATIVE_COMPONENT_SELECTOR)) {
        if (!el.__msDeclarativeFallbackNodes) {
            el.__msDeclarativeFallbackNodes = new Set([...el.childNodes]);
        }
    }
}

async function mountDeclarativeComponent(el, ownerInstance) {
    if (el.__msDeclarativeState === 'done') return el.__msDeclarativeRef || null;
    if (el.__msDeclarativeTask) return await el.__msDeclarativeTask;

    const src = declarativeComponentSource(el);
    if (!src) {
        throw new Error('<ms-com> requires src, path, component, or name');
    }

    const baseUrl = ownerInstance?.url || location.href;
    const desc = createDescriptorFromBase(src, baseUrl);
    const constructorParams = declarativeComponentParams(el, src, baseUrl);
    const append = readBooleanAttribute(el, 'append');
    const top = readBooleanAttribute(el, 'top');

    await loadComponent(desc);
    enforceRuntimeAccess(ownerInstance, desc, 'ms-com');

    el.style.display ||= 'block';
    clearDeclarativeFallback(el);
    el.__msDeclarativeState = 'loading';

    const task = (async () => {
        try {
            if (!append) {
                let inst = findInstance(desc, el);
                const hideOptions = { preserveAppend: true };
                const visible = getVisibleInstancesToHide(el, inst, hideOptions);

                if (!await canHideInstances(visible)) {
                    el.__msDeclarativeState = null;
                    return null;
                }

                if (!inst) {
                    inst = await createInstance(desc, el, 'declarative', constructorParams, ownerInstance);
                }

                await showExclusive(el, inst, true, hideOptions);

                const ref = createRef(inst);
                el.__msDeclarativeRef = ref;
                el.__msDeclarativeState = 'done';
                return ref;
            }

            const inst = await createInstance(desc, el, 'declarative-append', constructorParams, ownerInstance);

            if (top && el.firstChild && inst.host !== el.firstChild) {
                el.insertBefore(inst.host, el.firstChild);
            }

            await callLifecycle(inst, 'onShow');

            const ref = createRef(inst);
            el.__msDeclarativeRef = ref;
            el.__msDeclarativeState = 'done';
            return ref;
        }
        catch (e) {
            el.__msDeclarativeState = null;
            throw e;
        }
        finally {
            el.__msDeclarativeTask = null;
        }
    })();

    el.__msDeclarativeTask = task;
    return await task;
}

async function preloadDeclarativeComponents(elements, ownerInstance) {
    const tasks = [];

    for (const el of elements) {
        if (el.__msDeclarativeState === 'done' || el.__msDeclarativeTask) {
            continue;
        }

        const src = declarativeComponentSource(el);
        if (!src) continue;

        const baseUrl = ownerInstance?.url || location.href;
        const desc = createDescriptorFromBase(src, baseUrl);
        tasks.push(loadComponent(desc).then(() => {
            enforceRuntimeAccess(ownerInstance, desc, 'ms-com');
        }));
    }

    if (tasks.length) {
        await Promise.all(tasks);
    }
}

async function processDeclarativeComponents(instance) {
    if (!instance?.root) return [];

    const elements = [...instance.root.querySelectorAll(DECLARATIVE_COMPONENT_SELECTOR)]
        .filter(el => !hasDeclarativeComponentAncestor(el, instance.root));

    const loaderToken = __ms_loader_start(elements, instance);

    try {
        await preloadDeclarativeComponents(elements, instance);

        const refs = [];
        for (const el of elements) {
            refs.push(await mountDeclarativeComponent(el, instance));
        }

        return refs;
    }
    finally {
        __ms_loader_end(loaderToken);
    }
}

function resolveDeclarativeComponentElement(target, ownerHint = null) {
    if (target instanceof HTMLElement) return target;
    if (target?.el instanceof HTMLElement) return target.el;

    if (typeof target === 'string') {
        if (ownerHint?.root) {
            return resolveElementByIdCI(ownerHint.root, target) ||
                (__ms_is_custom_tag_name(target)
                    ? ownerHint.root.querySelector(target.toLowerCase())
                    : null);
        }

        return resolveInjectTarget(target);
    }

    return null;
}

function ownerInstanceForElement(el, fallback = null) {
    const root = el?.getRootNode?.();
    return root?.host?.__ms_instance || fallback || currentExecutionInstance() || activeInstance();
}

async function getDeclarativeComponentRef(target, ownerHintOverride = null) {
    const ownerHint = ownerHintOverride || currentExecutionInstance() || activeInstance();

    await __ms_ready;
    await __MS_CONFIG_READY__;

    const el = resolveDeclarativeComponentElement(target, ownerHint);
    if (!el) {
        throw new Error(`ms.com target not found: ${target}`);
    }

    if (!el.matches?.(DECLARATIVE_COMPONENT_SELECTOR)) {
        throw new Error('ms.com target must be <ms-com>');
    }

    if (el.__msDeclarativeTask) {
        return await el.__msDeclarativeTask;
    }

    if (el.__msDeclarativeRef) {
        return el.__msDeclarativeRef;
    }

    return await mountDeclarativeComponent(el, ownerInstanceForElement(el, ownerHint));
}

function createDeferredComponentMember(refPromise, prop) {
    const resolveMember = () => refPromise.then(ref => ref?.[prop]);

    return new Proxy(function () { }, {
        apply(_target, _thisArg, args) {
            return refPromise.then(ref => {
                const member = ref?.[prop];

                if (typeof member !== 'function') {
                    throw new Error(`ms.com member is not callable: ${String(prop)}`);
                }

                return member.apply(ref, args);
            });
        },

        get(_target, childProp) {
            if (childProp === 'then') {
                const p = resolveMember();
                return p.then.bind(p);
            }

            if (childProp === 'catch') {
                const p = resolveMember();
                return p.catch.bind(p);
            }

            if (childProp === 'finally') {
                const p = resolveMember();
                return p.finally.bind(p);
            }

            if (childProp === Symbol.toStringTag) {
                return 'MSComponentMember';
            }

            return createDeferredComponentMember(resolveMember(), childProp);
        }
    });
}

function createDeclarativeComponentProxy(target, ownerHint = null) {
    const refPromise = getDeclarativeComponentRef(target, ownerHint);

    return new Proxy({}, {
        get(_target, prop) {
            if (prop === 'then') return refPromise.then.bind(refPromise);
            if (prop === 'catch') return refPromise.catch.bind(refPromise);
            if (prop === 'finally') return refPromise.finally.bind(refPromise);
            if (prop === Symbol.toStringTag) return 'MSComponentRef';

            return createDeferredComponentMember(refPromise, prop);
        }
    });
}

function trackDeclarativeComponentTask(task) {
    if (!task || typeof task.then !== 'function') return task;

    DECLARATIVE_COMPONENT_TASKS.add(task);
    task.then(
        () => DECLARATIVE_COMPONENT_TASKS.delete(task),
        () => DECLARATIVE_COMPONENT_TASKS.delete(task)
    );

    return task;
}

async function waitForDeclarativeComponentTasks() {
    while (DECLARATIVE_COMPONENT_TASKS.size) {
        await Promise.all([...DECLARATIVE_COMPONENT_TASKS]);
    }
}

function scriptNeedsDomScope(code) {
    return /\b(document|window)\b/.test(code);
}

function prependDomScope(code, instance) {
    if (!scriptNeedsDomScope(code)) return code;

    return (
        `const document = globalThis.__MS_CREATE_SCOPED_DOCUMENT__(${instance.refId});` +
        `const window = globalThis.__MS_CREATE_SCOPED_WINDOW__(${instance.refId});` +
        code
    );
}

// Resolved shared dependency modules cached by absolute URL. Component-owned
// modules use SCOPED_COMPONENT_MODULE_CACHE below because their DOM globals must
// be bound to one component instance.
const MAPPED_MODULE_CACHE = new Map();
const SCOPED_COMPONENT_MODULE_CACHE = new Map();
const CLASSIC_SCRIPT_CACHE = new Map();

const IMPORT_SPEC_RE = /\b(from|import)\s*(['"])([^'"]+)\2/g;
const DYNAMIC_IMPORT_SPEC_RE = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
const NON_BARE_RE = /^(\.{1,2}\/|\/|[a-z][a-z0-9+.-]*:)/i;   // relative / absolute / URL

function shouldScopeComponentModule(url, instance) {
    if (!instance || !url) return false;

    try {
        const protocol = new URL(url, location.href).protocol;
        return protocol === 'http:' || protocol === 'https:' || protocol === 'file:';
    }
    catch {
        return false;
    }
}

function createImportIgnoreMask(code) {
    const len = code.length;
    const mask = new Uint8Array(len);
    let i = 0;

    function mark(start, end) {
        mask.fill(1, start, Math.min(end, len));
    }

    while (i < len) {
        const ch = code[i];
        const next = code[i + 1];

        if (ch === '/' && next === '/') {
            const start = i;
            i += 2;
            while (i < len && code[i] !== '\n' && code[i] !== '\r') i++;
            mark(start, i);
            continue;
        }

        if (ch === '/' && next === '*') {
            const start = i;
            i += 2;
            while (i < len && !(code[i] === '*' && code[i + 1] === '/')) i++;
            if (i < len) i += 2;
            mark(start, i);
            continue;
        }

        if (ch === '"' || ch === "'") {
            const quote = ch;
            const start = i;
            i++;
            while (i < len) {
                const c = code[i];
                if (c === '\\') {
                    i += 2;
                    continue;
                }
                i++;
                if (c === quote || c === '\n' || c === '\r') break;
            }
            mark(start, i);
            continue;
        }

        if (ch === '`') {
            const start = i;
            i++;
            while (i < len) {
                const c = code[i];
                if (c === '\\') {
                    i += 2;
                    continue;
                }
                i++;
                if (c === '`') break;
            }
            mark(start, i);
            continue;
        }

        i++;
    }

    return mask;
}

function eachImportSpecifier(code, fn) {
    const ignored = createImportIgnoreMask(code);

    for (const m of code.matchAll(IMPORT_SPEC_RE)) {
        if (ignored[m.index]) continue;
        fn(m[3]);
    }

    for (const m of code.matchAll(DYNAMIC_IMPORT_SPEC_RE)) {
        if (ignored[m.index]) continue;
        fn(m[2]);
    }
}

function replaceImportSpecifiers(code, resolve) {
    let ignored = createImportIgnoreMask(code);

    code = code.replace(IMPORT_SPEC_RE, (full, kw, q, spec, offset) => {
        if (ignored[offset]) return full;

        const mapped = resolve(spec);
        return mapped ? `${kw} ${q}${mapped}${q}` : full;
    });

    ignored = createImportIgnoreMask(code);

    return code.replace(DYNAMIC_IMPORT_SPEC_RE, (full, q, spec, offset) => {
        if (ignored[offset]) return full;

        const mapped = resolve(spec);
        return mapped ? `import(${q}${mapped}${q})` : full;
    });
}

function importMapCacheKey(imports) {
    if (!imports) return '';

    return Object.keys(imports)
        .sort()
        .map(key => `${key}=${imports[key]}`)
        .join('|');
}

function findMappedBareSpecifiers(code, imports) {
    const found = new Set();

    if (!imports) return [];

    eachImportSpecifier(code, spec => {
        if (!NON_BARE_RE.test(spec) && mapSpecifier(spec, imports)) {
            found.add(spec);
        }
    });

    return [...found];
}

async function resolveNonBareSpecifiers(code, baseUrl, importMap, instance) {
    const scoped = new Map();

    eachImportSpecifier(code, spec => {
        if (!NON_BARE_RE.test(spec)) return;

        const resolved = __ms_resolve_resource_url(spec, baseUrl, 'js');
        if (!shouldScopeComponentModule(resolved, instance)) return;

        if (!scoped.has(resolved)) {
            scoped.set(resolved, loadScopedComponentModule(resolved, instance, importMap));
        }
    });

    for (const [url, pending] of scoped) {
        scoped.set(url, await pending);
    }

    return replaceImportSpecifiers(code, spec => {
        if (!NON_BARE_RE.test(spec)) return null;

        const resolved = __ms_resolve_resource_url(spec, baseUrl, 'js');
        return scoped.get(resolved) || resolved;
    });
}

async function rewriteImports(code, baseUrl, importMap = null, instance = null) {

    // 1) Relative/absolute specifiers → canonical absolute URL.
    // CommonJS entries in GlobalConfig.json win by filename/alias. Other
    // component-owned modules are rewritten to per-instance blobs so their
    // document/window/ms access cannot escape the component shadow root.
    code = await resolveNonBareSpecifiers(code, baseUrl, importMap, instance);

    // 2) Bare specifiers via a component-local <script type="importmap">.
    // The browser only applies import maps at the document level BEFORE module
    // loading starts, so a map inside an injected component never registers and
    // bare specifiers ('three') would fail. We resolve them here instead — AND
    // recursively resolve the dependency's own bare imports (e.g. OrbitControls
    // does `import ... from 'three'`), serving each as a blob so the whole graph
    // loads with no registered import map. No importMap → this is a no-op.
    if (importMap) {
        code = await resolveBareSpecifiers(code, importMap, instance);
    }

    return code;
}

function mapSpecifier(spec, imports) {
    if (imports[spec]) return imports[spec];                 // exact match
    for (const key of Object.keys(imports)) {                // prefix match ("three/addons/")
        if (key.endsWith('/') && spec.startsWith(key))
            return imports[key] + spec.slice(key.length);
    }
    return null;
}

async function resolveBareSpecifiers(code, imports, instance = null) {

    // Collect distinct bare specifiers that have a mapping.
    const wanted = new Set();

    eachImportSpecifier(code, spec => {
        if (!NON_BARE_RE.test(spec) && mapSpecifier(spec, imports))
            wanted.add(spec);
    });

    if (!wanted.size) return code;

    // Resolve each mapping to a fully-rewritten blob URL (in parallel).
    const blobFor = new Map();
    await Promise.all([...wanted].map(async spec => {
        blobFor.set(spec, await loadMappedModule(mapSpecifier(spec, imports), imports, instance));
    }));

    code = replaceImportSpecifiers(code, spec =>
        blobFor.has(spec) ? blobFor.get(spec) : null
    );

    const unresolved = findMappedBareSpecifiers(code, imports);
    if (unresolved.length) {
        throw new Error(
            `MS import map could not resolve module specifier(s): ${unresolved.join(', ')}`
        );
    }

    return code;
}

function loadScopedComponentModule(url, instance, importMap) {
    url = __ms_resolve_resource_url(url, location.href, 'js');

    const key = `${instance.refId}|${url}`;
    if (SCOPED_COMPONENT_MODULE_CACHE.has(key)) {
        return SCOPED_COMPONENT_MODULE_CACHE.get(key);
    }

    const p = (async () => {
        const src = await __ms_load_text_resource(url, location.href, 'js');

        const source = {
            file: url,
            addedTopLines: 0
        };
        let code = rewriteScopedMSImports(src, url, instance);
        code = await rewriteImports(code, url, importMap, instance);
        code = __ms_apply_prepend_transform(
            code,
            value => prependDomScope(value, instance),
            source
        );
        code = __ms_apply_prepend_transform(
            code,
            value => prependImplicitScopedMSImport(value, instance),
            source
        );
        code += `\n//__ms_scoped_module_${instance.refId}`;
        code = __ms_append_source_identity(code, source.file);

        const blob = URL.createObjectURL(
            new Blob([code], { type: 'text/javascript' })
        );
        SCRIPT_BLOB_SOURCES.set(blob, source);

        registerInstanceCleanup(instance, () => {
            SCRIPT_BLOB_SOURCES.delete(blob);
            URL.revokeObjectURL(blob);
            SCOPED_COMPONENT_MODULE_CACHE.delete(key);
        });

        return blob;
    })().catch(e => {
        SCOPED_COMPONENT_MODULE_CACHE.delete(key);
        throw e;
    });

    SCOPED_COMPONENT_MODULE_CACHE.set(key, p);
    return p;
}

// Fetch a mapped module, rewrite its own imports (relative + bare, recursively)
// and expose it as a blob URL. Cached per absolute URL to keep one instance.
function loadMappedModule(url, imports, instance = null) {

    url = __ms_resolve_resource_url(url, location.href, 'js');
    const key = `${instance?.refId || 'shared'}|${url}|${importMapCacheKey(imports)}`;

    if (MAPPED_MODULE_CACHE.has(key))
        return MAPPED_MODULE_CACHE.get(key);

    const p = (async () => {
        const src = await __ms_load_text_resource(url, location.href, 'js');
        const rewritten = await rewriteImports(src, url, imports, instance);
        return URL.createObjectURL(
            new Blob([rewritten], { type: 'text/javascript' })
        );
    })().catch(e => {
        MAPPED_MODULE_CACHE.delete(key);
        throw e;
    });

    MAPPED_MODULE_CACHE.set(key, p);   // set before await → cycle-safe
    return p;
}

function extractImportMap(tpl, baseUrl) {
    const el = [...tpl.content.querySelectorAll('script')]
        .find(s => (s.getAttribute('type') || '').trim().toLowerCase() === 'importmap');
    if (!el) return null;
    try {
        const parsed = JSON.parse(el.textContent);
        if (!parsed || !parsed.imports) return null;

        const imports = {};
        for (const [key, value] of Object.entries(parsed.imports)) {
            imports[key] = __ms_resolve_resource_url(value, baseUrl, 'js');
        }

        return imports;
    } catch {
        return null;   // malformed map: ignore, behave as before
    }
}

async function loadCommonScriptModule(url, importMap, instance = null) {
    url = __ms_resolve_resource_url(url, location.href, 'js');

    if (instance) {
        const scopedUrl = await loadScopedComponentModule(url, instance, importMap);
        return await import(scopedUrl);
    }

    if (COMMON_SCRIPT_MODULE_CACHE.has(url)) {
        return COMMON_SCRIPT_MODULE_CACHE.get(url);
    }

    const p = (async () => {
        const src = await __ms_load_text_resource(url, location.href, 'js');
        const rewritten = await rewriteImports(src, url, importMap, null);
        const blob = URL.createObjectURL(
            new Blob([rewritten], { type: 'text/javascript' })
        );

        try {
            return await import(blob);
        }
        finally {
            URL.revokeObjectURL(blob);
        }
    })();

    COMMON_SCRIPT_MODULE_CACHE.set(url, p);
    return p;
}

function isClassicScriptType(type) {
    const value = String(type || '').trim().toLowerCase();
    return (
        value === '' ||
        value === 'text/javascript' ||
        value === 'application/javascript' ||
        value === 'text/ecmascript' ||
        value === 'application/ecmascript'
    );
}

function findClassicScriptByUrl(url) {
    const wanted = new URL(url, location.href).href;
    return [...document.scripts].find(script => {
        if (!script.src) return false;
        try {
            return new URL(script.src, location.href).href === wanted;
        } catch {
            return false;
        }
    }) || null;
}

function copyClassicScriptLoadAttributes(fromScript, toScript) {
    if (!fromScript || !toScript) return;

    for (const attr of ['crossorigin', 'integrity', 'referrerpolicy']) {
        if (!fromScript.hasAttribute(attr)) continue;

        const value = fromScript.getAttribute(attr);
        if (value === '') {
            toScript.setAttribute(attr, '');
        } else {
            toScript.setAttribute(attr, value);
        }
    }
}

async function loadClassicScript(url, baseUrl, sourceScript = null) {
    const resolved = __ms_resolve_resource_url(url, baseUrl, 'js');

    if (CLASSIC_SCRIPT_CACHE.has(resolved)) {
        return CLASSIC_SCRIPT_CACHE.get(resolved);
    }

    const existing = findClassicScriptByUrl(resolved);
    if (existing) {
        const existingPromise = existing.__msClassicScriptPromise || Promise.resolve();
        CLASSIC_SCRIPT_CACHE.set(resolved, existingPromise);
        return existingPromise;
    }

    const script = document.createElement('script');
    script.src = resolved;
    script.async = false;
    copyClassicScriptLoadAttributes(sourceScript, script);
    script.setAttribute('data-ms-classic-script', resolved);

    const p = new Promise((resolve, reject) => {
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', () => {
            CLASSIC_SCRIPT_CACHE.delete(resolved);
            reject(new Error(`Failed to load script: ${resolved}`));
        }, { once: true });
    });

    script.__msClassicScriptPromise = p;
    CLASSIC_SCRIPT_CACHE.set(resolved, p);
    document.head.appendChild(script);
    return p;
}

function __ms_css_resource_is_rewritable(raw) {
    const value = String(raw || '').trim();
    if (!value) return false;
    if (value.startsWith('#')) return false;
    if (/^var\s*\(/i.test(value)) return false;
    if (/^(data|blob|about|javascript):/i.test(value)) return false;
    return true;
}

function __ms_css_url_literal(url) {
    return `url("${String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

function __ms_rewrite_component_css_urls(cssText, cssUrl) {
    return String(cssText || '')
        .replace(/@import\s+(["'])([^"']+)\1/gi, (match, quote, raw) => {
            if (!__ms_css_resource_is_rewritable(raw)) return match;
            return `@import ${__ms_css_url_literal(new URL(raw, cssUrl).href)}`;
        })
        .replace(/url\(\s*(?:(["'])(.*?)\1|([^'")][^)]*))\s*\)/gi, (match, quote, quotedRaw, unquotedRaw) => {
            const raw = String(quotedRaw ?? unquotedRaw ?? '').trim();
            if (!__ms_css_resource_is_rewritable(raw)) return match;
            return __ms_css_url_literal(new URL(raw, cssUrl).href);
        });
}

function __ms_component_stylesheet_links(tpl) {
    const root = tpl?.content || tpl;
    if (!root?.querySelectorAll) return [];

    return [...root.querySelectorAll('link[href]')]
        .filter(link => String(link.getAttribute('rel') || '')
            .toLowerCase()
            .split(/\s+/)
            .includes('stylesheet'));
}

async function rewriteStylesheetLinks(tpl, baseUrl) {
    const links = __ms_component_stylesheet_links(tpl);

    for (const link of links) {
        const href = link.getAttribute('href');
        const resolved = __ms_resolve_resource_url(href, baseUrl, 'css');

        try {
            const css = await __ms_load_text_resource(href, baseUrl, 'css');
            const style = document.createElement('style');
            style.setAttribute('data-ms-css', resolved);
            if (link.hasAttribute('media')) {
                style.setAttribute('media', link.getAttribute('media'));
            }
            style.textContent = __ms_rewrite_component_css_urls(css, resolved);
            link.replaceWith(style);
        }
        catch (e) {
            throw new Error(`MS component stylesheet failed: ${resolved}. ${e?.message || e}`);
        }
    }
}

async function rewriteStandaloneStylesheetLinks(shadow, desc, fallbackHtml) {
    await rewriteStylesheetLinks(shadow, desc.url);

    const sourceHtml = await __ms_load_original_html_source(desc.url, fallbackHtml);
    const sourceTpl = createComponentTemplate(sourceHtml);
    await rewriteStylesheetLinks(sourceTpl, desc.url);

    const existing = new Set(
        [...shadow.querySelectorAll('style[data-ms-css]')]
            .map(style => style.getAttribute('data-ms-css'))
            .filter(Boolean)
    );

    for (const style of sourceTpl.content.querySelectorAll('style[data-ms-css]')) {
        const url = style.getAttribute('data-ms-css');
        if (url && existing.has(url)) continue;
        if (url) existing.add(url);
        shadow.insertBefore(style.cloneNode(true), shadow.firstChild);
    }
}

function __ms_css_escape_identifier(value) {
    const text = String(value || '').trim();
    if (globalThis.CSS?.escape) return CSS.escape(text);
    return text.replace(/([^\w-])/g, '\\$1');
}

function __ms_is_auto_default_css_key(name) {
    return /^[a-z][a-z0-9-]*$/i.test(String(name || '').trim());
}

function __ms_css_text_targets_element(cssText, tagName) {
    const tag = String(tagName || '').trim();
    if (!tag) return false;

    const css = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const selectorToken = new RegExp(`(^|[\\s>+~,(])${escaped}(?=$|[\\s.#:\\[>+~,)])`, 'i');
    const ruleStart = /([^{}]+)\{/g;
    let match;

    while ((match = ruleStart.exec(css))) {
        const prelude = match[1].trim();
        if (!prelude || prelude.startsWith('@keyframes')) continue;
        if (selectorToken.test(prelude)) return true;
    }

    return false;
}

function __ms_css_text_targets_select_control(cssText) {
    const css = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleStart = /([^{}]+)\{/g;
    let match;

    while ((match = ruleStart.exec(css))) {
        const prelude = match[1].trim();
        if (!prelude || prelude.startsWith('@keyframes')) continue;

        if (/(^|[\s>+~,(])select(?=$|[\s.#:\[>+~,)])/i.test(prelude)) return true;
        if (/(^|[\s>+~,(])datalist(?=$|[\s.#:\[>+~,)])/i.test(prelude)) return true;
        if (/(^|[\s>+~,(])input\s*\[[^\]]*\blist\b[^\]]*\]/i.test(prelude)) return true;
    }

    return false;
}

function __ms_default_css_probe_selectors(name) {
    const key = __ms_normalize_default_css_key(name);

    if (key === 'select' || key === 'option' || key === 'options' || key === 'datalist' || key === 'native-select') {
        return ['select', 'option', 'input[list]', 'datalist'];
    }

    return [__ms_css_escape_identifier(name)];
}

function __ms_has_local_style_for_default_css(root, name) {
    const tag = String(name || '').trim();
    if (!__ms_is_auto_default_css_key(tag)) return true;

    const selectors = __ms_default_css_probe_selectors(tag);
    if (!selectors.some(selector => root.querySelector(selector))) return true;
    if (selectors.some(selector => root.querySelector(`${selector}[style]`))) return true;

    for (const style of root.querySelectorAll('style')) {
        if (style.hasAttribute('data-ms-default-css')) continue;
        if (__ms_normalize_default_css_key(tag) === 'select' &&
            __ms_css_text_targets_select_control(style.textContent)) return true;
        if (__ms_css_text_targets_element(style.textContent, tag)) return true;
    }

    // If a local stylesheet stayed as a link, the engine cannot inspect it here.
    // Treat it as local ownership to avoid unexpected automatic overrides.
    return !!root.querySelector('link[rel~="stylesheet"][href]:not([data-ms-default-css])');
}

function __ms_auto_default_css_names(root) {
    const entries = __ms_default_css_entries();
    return Object.keys(entries).filter(name =>
        __ms_is_auto_default_css_key(name) &&
        !__ms_has_local_style_for_default_css(root, name)
    );
}

function __ms_default_css_is_plain_element_family(name) {
    const aliases = __ms_default_css_key_aliases(name)
        .map(x => __ms_normalize_default_css_key(x));
    return aliases.some(key =>
        key === 'button' ||
        key === 'input' ||
        key === 'label' ||
        key === 'select' ||
        key === 'option' ||
        key === 'options' ||
        key === 'datalist' ||
        key === 'check' ||
        key === 'checkbox' ||
        key === 'radio' ||
        key === 'div'
    );
}

function __ms_default_css_exclude_composites_from_selector(selectorText) {
    return String(selectorText || '')
        .split(',')
        .map(selector => {
            const text = selector.trim();
            if (!text) return text;
            if (/^(?:\:host|@)/i.test(text)) return text;
            if (/(?:^|[\s>+~,(])(?:\.ms-grid-root|msgrid|mscombo|\[data-ms-alias\s*=)/i.test(text)) return text;

            const pseudoIndex = text.search(/::/);
            const base = pseudoIndex >= 0 ? text.slice(0, pseudoIndex).trimEnd() : text;
            const pseudo = pseudoIndex >= 0 ? text.slice(pseudoIndex) : '';
            if (!base) return text;

            return `${base}:where(:not(.ms-grid-root):not(.ms-grid-root *):not(msgrid):not(msgrid *):not(mscombo):not(mscombo *):not([data-ms-alias="msgrid"]):not([data-ms-alias="msgrid"] *):not([data-ms-alias="mscombo"]):not([data-ms-alias="mscombo"] *))${pseudo}`;
        })
        .join(', ');
}

function __ms_default_css_exclude_composite_controls_fallback(cssText) {
    return String(cssText || '').replace(/([^{}@][^{}]*)\{/g, (full, selectorText) => {
        const scoped = __ms_default_css_exclude_composites_from_selector(selectorText);
        return scoped ? `${scoped} {` : full;
    });
}

function __ms_default_css_exclude_composite_controls(cssText, name) {
    if (!__ms_default_css_is_plain_element_family(name)) return cssText;

    if (typeof CSSStyleSheet === 'undefined' || typeof CSSRule === 'undefined') {
        return __ms_default_css_exclude_composite_controls_fallback(cssText);
    }

    try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(String(cssText || ''));

        const rewriteRules = rules => {
            for (const rule of rules) {
                if (rule.type === CSSRule.STYLE_RULE && rule.selectorText) {
                    rule.selectorText = __ms_default_css_exclude_composites_from_selector(rule.selectorText);
                } else if (rule.cssRules) {
                    rewriteRules(rule.cssRules);
                }
            }
        };

        rewriteRules(sheet.cssRules);
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
    } catch {
        return __ms_default_css_exclude_composite_controls_fallback(cssText);
    }
}

async function applyDefaultCSSLinks(target, policy) {
    const appendTarget = target?.content || target;
    if (!appendTarget?.appendChild) return;

    const entries = __ms_default_css_entries();
    const selected = policy?.defaultCss;

    let names;
    if (Array.isArray(selected)) {
        if (!selected.length) return;
        names = selected.includes('*')
            ? Object.keys(entries)
            : selected;
    } else {
        names = __ms_auto_default_css_names(appendTarget);
    }

    if (!names.length) return;

    const seenUrls = new Set();

    for (const name of names) {
        const raw = __ms_default_css_url_for(name);

        if (!raw) {
            console.warn(`MS DefaultCSS: no GlobalConfig entry for ${name}`);
            continue;
        }

        const resolved = __ms_resolve_resource_url(raw, MS_CONFIG_BASE_URL || location.href, 'css');
        if (seenUrls.has(resolved)) continue;
        seenUrls.add(resolved);

        try {
            const css = await __ms_load_text_resource(raw, MS_CONFIG_BASE_URL || location.href, 'css');
            const style = document.createElement('style');
            style.setAttribute('data-ms-default-css', name);
            style.setAttribute('data-ms-default-css-url', resolved);
            style.textContent = __ms_default_css_exclude_composite_controls(css, name);
            appendTarget.appendChild(style);
        }
        catch {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = resolved;
            link.setAttribute('data-ms-default-css', name);
            appendTarget.appendChild(link);
        }
    }
}

function __ms_parse_positive_int_attr(el, attr) {
    const raw = el?.getAttribute?.(attr);
    if (raw == null || raw === '') return null;

    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
}

function __ms_input_type(el) {
    return String(el?.getAttribute?.('type') || 'text').trim().toLowerCase();
}

function __ms_input_mode(el) {
    return String(el?.getAttribute?.('inputmode') || '').trim().toLowerCase();
}

function __ms_should_control_input(el) {
    const type = __ms_input_type(el);
    const mode = __ms_input_mode(el);

    if (type === 'date') return false;

    return (
        type === 'number' ||
        type === 'email' ||
        mode === 'numeric' ||
        mode === 'decimal'
    );
}

function __ms_infer_decimal_places(el) {
    const step = String(el.getAttribute('step') || '').trim().toLowerCase();
    if (step && step !== 'any') {
        const decimal = step.match(/[.,](\d+)/);
        if (decimal) return decimal[1].length;
        if (/^\d+$/.test(step)) return 0;
    }

    const placeholder = String(el.getAttribute('placeholder') || '');
    const placeholderDecimal = placeholder.match(/[.,](0+)/);
    if (placeholderDecimal) return placeholderDecimal[1].length;

    return __ms_input_mode(el) === 'decimal' ? 2 : null;
}

function __ms_allows_negative_number(el) {
    if (__ms_input_mode(el)) return false;

    const min = el.getAttribute('min');
    if (min != null && min !== '') {
        const n = Number(min);
        if (Number.isFinite(n) && n >= 0) return false;
    }

    return true;
}

function __ms_sanitize_number_input(value, el) {
    const mode = __ms_input_mode(el);
    const allowDecimal =
        mode === 'numeric'
            ? false
            : mode === 'decimal' ||
            String(el.getAttribute('step') || '').toLowerCase() === 'any' ||
            __ms_infer_decimal_places(el) !== 0;
    const maxDecimals = allowDecimal ? __ms_infer_decimal_places(el) : 0;
    const allowNegative = __ms_allows_negative_number(el);
    let text = String(value || '').replace(/,/g, '.');
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

function __ms_sanitize_email_input(value) {
    return String(value || '').replace(/[\s\x00-\x1f\x7f]+/g, '');
}

function __ms_apply_maxlength(value, el) {
    const maxLen = __ms_parse_positive_int_attr(el, 'maxlength');
    if (maxLen == null) return value;
    return String(value).slice(0, maxLen);
}

function __ms_sanitize_input_value(value, el) {
    const type = __ms_input_type(el);
    const mode = __ms_input_mode(el);
    let text = String(value || '');

    if (type === 'email') {
        text = __ms_sanitize_email_input(text);
    }
    else if (type === 'number' || mode === 'numeric' || mode === 'decimal') {
        text = __ms_sanitize_number_input(text, el);
    }

    return __ms_apply_maxlength(text, el);
}

function __ms_input_selection(el) {
    try {
        if (typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
            return {
                start: el.selectionStart,
                end: el.selectionEnd
            };
        }
    } catch { }

    return {
        start: String(el.value || '').length,
        end: String(el.value || '').length
    };
}

function __ms_apply_input_size(el) {
    const size = __ms_parse_positive_int_attr(el, 'size');
    if (!size) return;
    if (el.style.getPropertyValue('width') || el.style.getPropertyValue('inline-size')) return;

    el.style.setProperty('width', `${size}ch`, 'important');
    el.style.setProperty('max-width', '100%', 'important');
}

function __ms_enforce_input_value(el) {
    const next = __ms_sanitize_input_value(el.value, el);
    if (next !== el.value) {
        el.value = next;
    }
}

function __ms_setup_input_controls(instance) {
    const root = instance?.root;
    if (!root?.querySelectorAll) return;

    for (const el of root.querySelectorAll('input')) {
        __ms_apply_input_size(el);

        if (!__ms_should_control_input(el) || el.__ms_input_controlled) continue;

        el.__ms_input_controlled = true;
        __ms_enforce_input_value(el);

        const beforeInput = event => {
            if (event.isComposing || !event.data || event.inputType?.startsWith('delete')) return;

            const value = String(el.value || '');
            const selection = __ms_input_selection(el);
            const candidate =
                value.slice(0, selection.start) +
                event.data +
                value.slice(selection.end);
            const sanitized = __ms_sanitize_input_value(candidate, el);

            if (sanitized !== candidate) {
                event.preventDefault();
                if (sanitized !== value) {
                    el.value = sanitized;
                }
            }
        };

        const input = () => __ms_enforce_input_value(el);

        const blur = () => {
            if ((__ms_input_type(el) === 'number' || __ms_input_mode(el) === 'decimal') && /[.-]$/.test(el.value)) {
                el.value = el.value.slice(0, -1);
            }
            __ms_enforce_input_value(el);
        };

        el.addEventListener('beforeinput', beforeInput);
        el.addEventListener('input', input);
        el.addEventListener('blur', blur);

        registerInstanceCleanup(instance, () => {
            el.removeEventListener('beforeinput', beforeInput);
            el.removeEventListener('input', input);
            el.removeEventListener('blur', blur);
            delete el.__ms_input_controlled;
        });
    }
}

function __ms_preload_images(html, baseUrl) {

    const urls = new Set();

    const tpl = document.createElement("template");
    tpl.innerHTML = html;

    const root = tpl.content;

    /* -----------------------------------------
       IMG SRC
    ----------------------------------------- */

    root.querySelectorAll("img[src]").forEach(el => {
        urls.add(el.getAttribute("src"));
    });

    /* -----------------------------------------
       SRCSET
    ----------------------------------------- */

    root.querySelectorAll("[srcset]").forEach(el => {

        const parts = el.getAttribute("srcset").split(",");

        parts.forEach(p => {
            const url = p.trim().split(/\s+/)[0];
            if (url) urls.add(url);
        });
    });

    /* -----------------------------------------
       INLINE STYLE BACKGROUND IMAGES
    ----------------------------------------- */

    root.querySelectorAll("[style]").forEach(el => {

        const style = el.getAttribute("style");

        const regex = /url\(["']?([^"')]+)["']?\)/g;

        let m;

        while ((m = regex.exec(style)) !== null)
            urls.add(m[1]);

    });

    /* -----------------------------------------
       PREFETCH IMAGES
    ----------------------------------------- */

    urls.forEach(src => {

        try {

            const url = new URL(src, baseUrl).href;

            if (IMAGE_PRELOAD_CACHE.has(url))
                return;

            const img = new Image();

            IMAGE_PRELOAD_CACHE.set(url, img);

            img.decoding = "async";
            img.src = url;

            img.onload = () => IMAGE_PRELOAD_CACHE.set(url, true);
            img.onerror = () => IMAGE_PRELOAD_CACHE.delete(url);

        } catch { }

    });

}

/* =========================================================
   7. PUBLIC POLICY
   ========================================================= */

function parsePublicPolicy(tpl) {

    const tag = tpl.content.querySelector('ms-public');

    const base = {
        functions: { mode: 'all', list: null },
        classes: { mode: 'all', list: null },
        storeRoots: [],
        defaultCss: null,
        access: {
            blockOut: false,
            blockIn: false,
            allowedConsumers: []
        }
    };

    if (!tag) return base;

    const parse = (name) => {
        const el = tag.querySelector(name);
        if (!el) return { mode: 'all', list: null };

        const txt = el.textContent.trim();
        if (txt === '*') return { mode: 'all', list: null };
        if (txt === '') return { mode: 'none', list: new Set() };

        return {
            mode: 'list',
            list: new Set(
                txt.split(',').map(x => x.trim()).filter(Boolean)
            )
        };
    };

    // parse store ownership
    const storeTag = tag.querySelector('store');
    if (storeTag) {
        const roots = storeTag.textContent
            .split(',')
            .map(x => x.trim())
            .filter(Boolean)
            .map(x => x.replace(/\.\*$/, ''));

        base.storeRoots = roots;
    }

    const defaultCssTag = tag.querySelector('default-css');
    if (defaultCssTag) {
        const txt = defaultCssTag.textContent.trim();
        base.defaultCss = /^none$/i.test(txt)
            ? []
            : txt === ''
                ? null
                : txt.split(',')
                    .map(x => x.trim())
                    .filter(Boolean);
    }

    const accessTag = tag.querySelector('access');
    if (accessTag) {
        for (const raw of accessTag.textContent.split(',')) {
            const item = raw.trim();
            if (!item) continue;

            const lower = item.toLowerCase();
            if (lower === 'block out') {
                base.access.blockOut = true;
            }
            else if (lower === 'block in') {
                base.access.blockIn = true;
            }
            else {
                base.access.allowedConsumers.push(item);
            }
        }
    }

    return {
        functions: parse('functions'),
        classes: parse('classes'),
        storeRoots: base.storeRoots,
        defaultCss: base.defaultCss,
        access: base.access
    };
}

/* =========================================================
   8. INSTANCE CREATION
   ========================================================= */

function __ms_line_count(text) {
    return (String(text || '').match(/\n/g) || []).length;
}

function __ms_apply_prepend_transform(code, transform, source) {
    const next = transform(code);
    if (next !== code && next.endsWith(code)) {
        source.addedTopLines += __ms_line_count(next.slice(0, next.length - code.length));
    }
    return next;
}

function __ms_append_source_identity(code, file) {
    const sourceUrl = String(file || '')
        .replace(/[\r\n\u2028\u2029]/g, '');

    return sourceUrl
        ? `${code}\n//# sourceURL=${sourceUrl}\n`
        : code;
}

function __ms_register_script_blob_source(blob, instance, source) {
    SCRIPT_BLOB_SOURCES.set(blob, {
        file: source.file,
        addedTopLines: source.addedTopLines || 0
    });

    registerInstanceCleanup(instance, () => {
        SCRIPT_BLOB_SOURCES.delete(blob);
        URL.revokeObjectURL(blob);
    });
}

async function executeScripts(instance, tpl, desc, html, options = {}) {

    const regex = /<script\b[^>]*>/gi;
    const matches = [...html.matchAll(regex)];

    const scripts = tpl.content.querySelectorAll('script');

    // A component may declare its own <script type="importmap"> (never executed
    // nor added to the DOM). We use it to resolve bare specifiers in this
    // component's module code — see rewriteImports.
    const importMap = extractImportMap(tpl, desc.url);

    for (let i = 0; i < scripts.length; i++) {

        const s = scripts[i];

        const typeAttr = (s.getAttribute('type') || '').trim().toLowerCase();
        if (typeAttr === 'importmap') continue;

        if (options.onlyModuleScripts && typeAttr !== 'module') continue;

        const srcAttr = s.getAttribute('src');
        const scriptUrl = srcAttr
            ? __ms_resolve_resource_url(srcAttr, desc.url, 'js')
            : null;

        if (srcAttr && isClassicScriptType(typeAttr)) {
            if (options.skipClassicScripts) continue;
            await loadClassicScript(srcAttr, desc.url, s);
            continue;
        }

        if (typeAttr && typeAttr !== 'module') continue;

        if (scriptUrl && __ms_is_common_resource_url(scriptUrl, 'js')) {
            await loadCommonScriptModule(scriptUrl, importMap, instance);
            continue;
        }

        let code = srcAttr
            ? await __ms_load_text_resource(srcAttr, desc.url, 'js')
            : s.textContent;
        const codeBaseUrl = scriptUrl || desc.url;

        let prefix = 0;

        if (!srcAttr && matches[i]) {
            const start = matches[i].index;
            prefix = html.substring(0, start).split('\n').length - 1;
        }

        code = '\n'.repeat(prefix) + code;
        const source = {
            file: scriptUrl || desc.url,
            addedTopLines: 0
        };
        code = rewriteScopedMSImports(code, codeBaseUrl, instance);
        code = await rewriteImports(code, codeBaseUrl, importMap, instance);
        code = __ms_apply_prepend_transform(
            code,
            value => prependDomScope(value, instance),
            source
        );
        code = __ms_apply_prepend_transform(
            code,
            value => prependImplicitScopedMSImport(value, instance),
            source
        );

        code += `\n//__ms_instance_${instance.refId}`;
        code = appendLifecycleCapture(
            code,
            instance.refId,
            __ms_public_policy_values(instance.security?.functions),
            __ms_public_policy_values(instance.security?.classes)
        );
        code = __ms_append_source_identity(code, source.file);

        let mod;

        try {
            await withInstanceContext(instance, null, async () => {

                if (SCRIPT_MODULE_CACHE.has(code)) {

                    mod = SCRIPT_MODULE_CACHE.get(code);

                } else {

                    const blob = URL.createObjectURL(
                        new Blob([code], { type: 'text/javascript' })
                    );
                    __ms_register_script_blob_source(blob, instance, source);

                    mod = await import(blob);

                    SCRIPT_MODULE_CACHE.set(code, mod);
                }

                collectLifecycleHooks(instance, mod);

                await waitForInstanceTasks(instance);
            });

        }
        catch (e) {

            if (e instanceof __MS_STOP_EXECUTION__) {
                throw e;
            }

            const err = __ms_build_error(e, instance.name, null);
            __ms_halt_engine(err);
            throw e;
        }
    }
}

async function createInstance(desc, container, mode, constructorParams = undefined, parentOverride = null) {

    await __MS_CONFIG_READY__;

    const parent =
        parentOverride ||
        currentExecutionInstance() ||
        CURRENT_SCREEN;

    const parentRef = parent ? parent.refId : null;

    const html = await loadComponent(desc);

    const host = document.createElement('div');
    host.style.display = 'block';
    host.style.width = '100%';
    host.style.minWidth = '0';
    host.style.maxWidth = '100%';
    host.style.boxSizing = 'border-box';
    const pendingReveal = mode === 'inject' && getVisibleInstancesToHide(container, null).length
        ? __ms_prepare_replacement_host(host, container)
        : null;
    const root = host.attachShadow({ mode: 'open' });

    const tpl = createComponentTemplate(html);

    const policy = parsePublicPolicy(tpl);
    tpl.content.querySelectorAll('ms-public').forEach(n => n.remove());
    await rewriteStylesheetLinks(tpl, desc.url);
    await applyDefaultCSSLinks(tpl, policy);

    const instance = {
        refId: REF_SEQ++,
        name: desc.logical,
        publicName: desc.publicName || desc.logical,
        url: desc.url,
        mode,
        appendMode: String(mode || '').includes('append'),
        host,
        root,
        container,
        locals: {},
        lifecycle: {},
        didLoad: false,
        constructorParams,
        security: policy,
        pendingTasks: new Set(),
        nativeCleanups: new Set(),

        parentRef,
        pendingReveal,
    };

    host.__ms_instance = instance;
    host.setAttribute('data-ms-component-host', '');
    INSTANCES.set(instance.refId, instance);


    const frag = document.createDocumentFragment();

    for (const n of tpl.content.childNodes) {
        const clone = cloneForComponentDom(n);
        if (clone) frag.appendChild(clone);
    }

    root.appendChild(frag);
    captureDeclarativeFallbackNodes(root);
    __ms_setup_input_controls(instance);
    prepareLocalDocument(instance);
    observeThirdPartyRenderedOutput(instance);


    container.appendChild(host);

    try {
        await executeScripts(instance, tpl, desc, html);
        refreshThirdPartyRenderedOutput(root);
    }
    catch (e) {

        if (e instanceof __MS_STOP_EXECUTION__) {

            await __ms_destroy_instance(instance, { skipBeforeHide: true });

            throw e;
        }

        const err = __ms_build_error(e, instance.name, null);
        __ms_halt_engine(err);

        await __ms_destroy_instance(instance, { skipBeforeHide: true });

        throw e;
    }
    ///

    // register store ownership
    if (policy.storeRoots?.length) {

        for (const root of policy.storeRoots) {

            if (STORE_OWNERS.has(root)) {

                const err = {
                    ok: false,
                    error: {
                        code: 'STORE_NAMESPACE_CONFLICT',
                        message: `Namespace ${root} already owned by ${STORE_OWNERS.get(root)}`,
                        method: null,
                        line: null,
                        origin: instance.name,
                        triggeredFrom: null
                    }
                };

                __ms_halt_engine(err);
                throw err;
            }

            STORE_OWNERS.set(root, instance.name);
        }
    }

    try {
        await processDeclarativeComponents(instance);
        await callOnLoad(instance);
    }
    catch (e) {
        await __ms_destroy_instance(instance, { skipBeforeHide: true });
        throw e;
    }

    return instance;
}

/* =========================================================
   9. EXECUTION SURFACE
   ========================================================= */

function buildExecutionSurface(instance) {

    const surface = {};
    const policy = instance.security;

    const allowed = (name, type) => {
        const r = policy[type];
        if (!r) return true;
        if (r.mode === 'all') return true;
        if (r.mode === 'none') return false;
        const wanted = __ms_public_name_key(name);
        return __ms_public_policy_values(r)
            .some(item => __ms_public_name_key(item) === wanted);
    };

    const deny = (name) => {
        const err = {
            error: {
                code: 'ACCESS_DENIED',
                message: `Access denied: ${name}`,
                method: name,
                line: null,
                origin: instance.name,
                triggeredFrom: null
            }
        };
        __ms_halt_engine(err);
        return err;
    };

    for (const [k, v] of Object.entries(instance.locals)) {

        /* ===== CLASS WRAP ===== */
        if (typeof v === 'function' &&
            /^class\s/.test(Function.prototype.toString.call(v))) {

            if (!allowed(k, 'classes')) {
                surface[k] = new Proxy(function () { }, {
                    construct() { return deny(k); }
                });
                continue;
            }

            surface[k] = new Proxy(v, {
                construct(Target, args) {

                    const real = new Target(...args);

                    return new Proxy(real, {
                        get(t, prop) {

                            const val = t[prop];

                            if (typeof val === 'function') {
                                return async (...a) => {
                                    if (MS_HALTED)
                                        throw MS_LAST_ERROR?.original || new Error("Engine halted");
                                    try {
                                        const r = await withInstanceContext(instance, prop, () => val.apply(t, a));
                                        return r;
                                    } catch (e) {
                                        const err = __ms_build_error(e, instance.name, prop);
                                        __ms_halt_engine(err);
                                        throw e;
                                    }
                                };
                            }

                            return val;
                        }
                    });
                }
            });

            continue;
        }

        /* ===== FUNCTION WRAP (RESTORED) ===== */
        if (typeof v === 'function') {

            if (!allowed(k, 'functions')) {
                surface[k] = async () => deny(k);
                continue;
            }

            surface[k] = async (...args) => {
                if (MS_HALTED)
                    throw MS_LAST_ERROR?.original || new Error("Engine halted");
                try {
                    const r = await withInstanceContext(instance, k, () => v(...args));
                    return r;
                } catch (e) {
                    const err = __ms_build_error(e, instance.name, k);
                    __ms_halt_engine(err);
                    throw e;
                }
            };

            continue;
        }

        surface[k] = v;
    }

    return surface;
}

class MSDomRef {   // UNIVERSAL

    constructor(el) {
        this.el = el;

        return new Proxy(this, {

            get(target, prop, receiver) {

                if (Reflect.has(target, prop))
                    return Reflect.get(target, prop, receiver);

                const value = target.el[prop];

                if (typeof value === "function")
                    return value.bind(target.el);

                return value;
            },

            set(target, prop, value, receiver) {

                if (typeof prop === 'string' &&
                    prop.startsWith('on')) {

                    const event = prop.slice(2); // onclick → click

                    let byEvent = DOM_REF_ON_HANDLERS.get(target.el);
                    if (!byEvent) {
                        byEvent = new Map();
                        DOM_REF_ON_HANDLERS.set(target.el, byEvent);
                    }

                    const oldHandler = byEvent.get(event);
                    if (oldHandler) {
                        target.off(event, oldHandler);
                        byEvent.delete(event);
                    }

                    if (typeof value === 'function') {
                        target.on(event, value);
                        byEvent.set(event, value);
                    } else {
                        target.el[prop] = value;
                    }

                    return true;
                }

                if (Reflect.has(target, prop))
                    return Reflect.set(target, prop, value, receiver);

                target.el[prop] = value;
                return true;
            }

        });
    }


    on(event, handler, ...args) {

        const el = this.el;

        const wrapped = (e) => {

            const root = el.getRootNode();
            const inst = root?.host?.__ms_instance;

            if (!inst) {
                handler(e, ...args);
                return;
            }

            withInstanceContext(inst, event, handler, el, [e, ...args]);

        };

        el.addEventListener(event, wrapped);

        let byEvent = DOM_REF_LISTENERS.get(el);
        if (!byEvent) {
            byEvent = new Map();
            DOM_REF_LISTENERS.set(el, byEvent);
        }

        if (!byEvent.has(event)) {
            byEvent.set(event, new Map());
        }

        byEvent.get(event).set(handler, wrapped);

        return this;
    }

    off(event, handler) {
        const byEvent = DOM_REF_LISTENERS.get(this.el);
        const wrapped = byEvent?.get(event)?.get(handler);

        this.el.removeEventListener(event, wrapped || handler);

        if (wrapped) {
            byEvent.get(event).delete(handler);
        }

        return this;
    }
}
// End MSDomRef

/* =========================================================
   10. REF OBJECT
   ========================================================= */

function findCaseInsensitiveKey(obj, prop, label) {
    if (!obj || typeof prop !== 'string') return null;

    const wanted = prop.toLowerCase();
    const matches = Object.keys(obj)
        .filter(key => key.toLowerCase() === wanted);

    if (matches.length === 1) {
        return matches[0];
    }

    if (matches.length > 1) {
        throw new Error(
            `Ambiguous ${label}: ${prop}. Matches: ${matches.join(', ')}`
        );
    }

    return null;
}

function findExactElementById(root, id) {
    if (!root || typeof id !== 'string') return null;
    return root.querySelector('#' + __ms_css_escape_identifier(id));
}

function createRef(instance) {

    const surface = buildExecutionSurface(instance);

    const base = {
        ref: instance.refId,
        component: instance.publicName || instance.name,
        ...surface
    };

    return new Proxy(base, {
        get(t, p) {

            if (p === 'then' || p === 'catch' || p === 'finally') {
                return undefined;
            }

            if (p in t) return t[p];

            if (typeof p !== 'string') {
                return undefined;
            }

            const exactEl = findExactElementById(instance.root, p);
            if (exactEl) return new MSDomRef(exactEl);

            const memberKey = findCaseInsensitiveKey(t, p, 'component ref member');
            const ciEl = resolveElementByIdCI(instance.root, p);

            if (memberKey && ciEl) {
                throw new Error(
                    `Ambiguous component ref member: ${p}. Matches public member ${memberKey} and element id ${ciEl.id}`
                );
            }

            if (memberKey) return t[memberKey];
            if (ciEl) return new MSDomRef(ciEl);

            return undefined;
        }
    });
}

/* =========================================================
   11. LOOKUPS
   ========================================================= */

function findInstance(desc, container) {
    for (const inst of INSTANCES.values()) {
        if (inst.name === desc.logical &&
            inst.container === container)
            return inst;
    }
    return null;
}

function resolveInjectTarget(target) {

    if (target instanceof HTMLElement)
        return target;

    if (target?.el) return target.el;

    if (typeof target !== 'string')
        return null;

    const search = (root) =>
        resolveElementByIdCI(root, target) ||
        (__ms_is_custom_tag_name(target)
            ? root.querySelector(target.toLowerCase())
            : null);

    const active =
        currentExecutionInstance() ||
        activeInstance();


    if (active) {
        const el = search(active.root);
        if (el) return el;
    }

    return null;
}

function __ms_delete_target(target) {
    if (target instanceof HTMLElement)
        return target;

    if (target?.el instanceof HTMLElement)
        return target.el;

    if (typeof target === 'string')
        return resolveInjectTarget(target);

    return null;
}

function __ms_node_contains_deep(root, node) {
    if (!root || !node) return false;
    if (root === node) return true;

    if (typeof root.contains === 'function' && root.contains(node)) {
        return true;
    }

    let current = node;
    const seen = new Set();

    while (current && !seen.has(current)) {
        if (current === root) return true;
        seen.add(current);

        const rootNode = current.getRootNode?.();
        if (rootNode instanceof ShadowRoot) {
            if (rootNode === root) return true;
            current = rootNode.host;
            continue;
        }

        current = current.parentNode;
    }

    return false;
}

function __ms_instance_in_container(instance, container) {
    if (!instance || !container) return false;
    return (
        instance.container === container ||
        __ms_node_contains_deep(container, instance.host) ||
        __ms_node_contains_deep(container, instance.container)
    );
}

function __ms_instance_descends_from(child, parent) {
    if (!child || !parent || child === parent) return false;

    let current = child;
    const seen = new Set();

    while (current?.parentRef && !seen.has(current.refId)) {
        if (current.parentRef === parent.refId) return true;
        seen.add(current.refId);
        current = INSTANCES.get(current.parentRef);
    }

    return (
        __ms_node_contains_deep(parent.root, child.host) ||
        __ms_node_contains_deep(parent.host, child.host)
    );
}

function __ms_collect_descendant_instances(parent, output) {
    for (const inst of [...INSTANCES.values()]) {
        if (output.has(inst.refId)) continue;
        if (!__ms_instance_descends_from(inst, parent)) continue;

        output.set(inst.refId, inst);
        __ms_collect_descendant_instances(inst, output);
    }
}

function __ms_instance_destroy_depth(instance) {
    let depth = 0;
    let current = instance;
    const seen = new Set();

    while (current?.parentRef && !seen.has(current.refId)) {
        seen.add(current.refId);
        current = INSTANCES.get(current.parentRef);
        if (current) depth += 1000;
    }

    let node = instance?.host;
    while (node) {
        depth++;
        const rootNode = node.getRootNode?.();
        if (rootNode instanceof ShadowRoot) {
            node = rootNode.host;
        } else {
            node = node.parentNode;
        }
    }

    return depth;
}

function __ms_collect_instances_for_container(container) {
    return [...INSTANCES.values()]
        .filter(inst => __ms_instance_in_container(inst, container));
}

function __ms_collect_instances_with_descendants(instances) {
    const output = new Map();

    for (const inst of instances || []) {
        if (!inst || !INSTANCES.has(inst.refId)) continue;
        output.set(inst.refId, inst);
        __ms_collect_descendant_instances(inst, output);
    }

    return [...output.values()]
        .sort((a, b) => __ms_instance_destroy_depth(b) - __ms_instance_destroy_depth(a));
}

function __ms_instance_from_ref(ref) {
    if (!ref) return null;

    if (typeof ref === 'number') {
        return INSTANCES.get(ref) || null;
    }

    if (ref.ref != null) {
        return INSTANCES.get(Number(ref.ref)) || null;
    }

    if (ref.refId != null) {
        return INSTANCES.get(Number(ref.refId)) || null;
    }

    return null;
}

function __ms_component_type_key(value) {
    return normalizeComponentLogicalName(value).toLowerCase();
}

function __ms_instance_matches_type(instance, desc) {
    if (!instance || !desc) return false;

    const instanceDesc = {
        logical: instance.name,
        publicName: instance.publicName || instance.name,
        file: instance.url,
        url: instance.url
    };

    const candidates = [desc, ...(desc.fallbackDescriptors || [])];
    const instanceKeys = [
        __ms_component_type_key(instance.name),
        __ms_component_type_key(instance.publicName || instance.name)
    ];

    return candidates.some(candidate => {
        if (descriptorsPointToSameUrl(instanceDesc, candidate)) return true;

        const wantedKeys = [
            __ms_component_type_key(candidate.logical),
            __ms_component_type_key(candidate.publicName || candidate.logical)
        ];

        return wantedKeys.some(key => instanceKeys.includes(key));
    });
}

async function __ms_delete_instances(instances) {
    const targets = __ms_collect_instances_with_descendants(instances);
    if (!targets.length) {
        return { ok: true, deleted: 0 };
    }

    if (!await canHideInstances(targets)) {
        return { ok: false, deleted: 0 };
    }

    let deleted = 0;

    for (const inst of targets) {
        if (!INSTANCES.has(inst.refId)) continue;
        const ok = await __ms_destroy_instance(inst, {
            skipBeforeHide: true,
            skipDescendants: true
        });
        if (ok) deleted++;
    }

    return { ok: true, deleted };
}

async function showExclusive(container, except, prechecked = false, options = {}) {
    const visible = getVisibleInstancesToHide(container, except, options);

    if (!prechecked && !await canHideInstances(visible)) {
        return false;
    }

    for (const inst of visible) {
        await callLifecycle(inst, 'onHide');
        inst.host.style.display = 'none';
    }

    if (except) {
        except.host.style.display = '';
        __ms_reveal_replacement_host(except);
        await callLifecycle(except, 'onShow');
    }

    return true;
}

function __ms_cleanup_store_subs(instance) {

    for (const subs of STORE_SUBS.values()) {
        for (const item of [...subs]) {
            if (item.instance === instance)
                subs.delete(item);
        }
    }
}

async function __ms_destroy_instance(instance, options = {}) {

    if (!instance || !INSTANCES.has(instance.refId)) return true;

    if (!options.skipBeforeHide && !await canHideInstance(instance)) {
        return false;
    }

    if (!options.skipDescendants) {
        const descendants = __ms_collect_instances_with_descendants([instance])
            .filter(inst => inst !== instance);

        if (!options.skipBeforeHide && !await canHideInstances(descendants)) {
            return false;
        }

        for (const child of descendants) {
            await __ms_destroy_instance(child, {
                skipBeforeHide: true,
                skipDescendants: true
            });
        }
    }

    if (FOCUSED_COMPONENT_INSTANCE === instance) {
        FOCUSED_COMPONENT_INSTANCE = null;
        await callLifecycle(instance, 'onLostFocus');
    }

    await callLifecycle(instance, 'onClose');

    __ms_cleanup_store_subs(instance);
    for (const subs of EVENT_BUS.values()) {
        for (const item of [...subs]) {
            if (item.instance === instance)
                subs.delete(item);
        }
    }

    for (const [parentRef, set] of UI_LISTENERS.entries()) {

        if (!set || set.size === 0) continue;

        for (const item of [...set]) {
            if (item.sourceRef === instance.refId) {
                set.delete(item);
            }
        }

        if (set.size === 0) {
            UI_LISTENERS.delete(parentRef);
        }
    }

    if (instance.security?.storeRoots?.length) {
        for (const root of instance.security.storeRoots) {
            if (STORE_OWNERS.get(root) === instance.name) {
                STORE_OWNERS.delete(root);
            }
        }
    }

    if (instance.nativeCleanups) {
        for (const cleanup of [...instance.nativeCleanups]) {
            try {
                cleanup();
            } catch { }
        }
        instance.nativeCleanups.clear();
    }

    if (LAST_INTERACTION_INSTANCE === instance) {
        LAST_INTERACTION_INSTANCE = null;
    }

    if (CURRENT_SCREEN === instance) {
        CURRENT_SCREEN = instance.parentRef && INSTANCES.has(instance.parentRef)
            ? INSTANCES.get(instance.parentRef)
            : null;
    }

    if (CURRENT_EXEC_CONTEXT === instance) {
        restoreExecutionContext(null);
    }

    for (let i = EXEC_STACK.length - 1; i >= 0; i--) {
        if (EXEC_STACK[i] === instance) {
            EXEC_STACK.splice(i, 1);
        }
    }

    if (MS_ERROR_INSTANCE === instance) {
        MS_ERROR_INSTANCE = null;
    }

    __ms_reveal_replacement_host(instance);

    if (instance.host)
        instance.host.remove();


    INSTANCES.delete(instance.refId);

    return true;
}


const LOADING_ANIMATION_KEYS = new Map([
    'Enabled',
    'FullScreen',
    'CSS',
    'Type',
    'AnimatedImage',
    'ImageSize',
    'BackgroundOpacity',
    'ContentOpacity',
    'FadeDuration',
    'Delay',
    'LockUI',
    'Blur',
    'SpinnerSize'
].map(key => [key.toLowerCase(), key]));

const LOADING_ANIMATION_TYPE_TO_MODE = new Map([
    ['skeleton-spinner', 'mode1'],
    ['spinner', 'mode2'],
    ['skeleton', 'mode3'],
    ['wave', 'mode4'],
    ['image', 'mode5']
]);

function __ms_clone_loading_value(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => __ms_clone_loading_value(item));

    const copy = {};
    for (const [key, val] of Object.entries(value)) {
        copy[key] = __ms_clone_loading_value(val);
    }
    return copy;
}

function __ms_canonical_loading_key(prop) {
    if (typeof prop === 'symbol') return null;
    return LOADING_ANIMATION_KEYS.get(String(prop).toLowerCase()) || null;
}

function __ms_loading_owner(ownerHint = null) {
    return (ownerHint && INSTANCES.has(ownerHint.refId))
        ? ownerHint
        : (currentExecutionInstance() || activeInstance());
}

function __ms_effective_loading_settings(ownerHint = null) {
    const cfg = __ms_clone_loading_value(MS_CONFIG.LoadingAnimation || {});
    const owner = __ms_loading_owner(ownerHint);
    const local = owner?.loadingAnimationOverride;

    if (!local) {
        return cfg;
    }

    for (const [key, value] of Object.entries(local)) {
        cfg[key] = __ms_clone_loading_value(value);
    }

    return cfg;
}

function __ms_clear_loading_override(ownerHint = null) {
    const owner = __ms_loading_owner(ownerHint);
    if (owner) {
        delete owner.loadingAnimationOverride;
    }
}

function __ms_set_loading_override(ownerHint, prop, value) {
    if (String(prop).toLowerCase() === 'setdefault') {
        if (value) __ms_clear_loading_override(ownerHint);
        return true;
    }

    const key = __ms_canonical_loading_key(prop);
    if (!key) {
        throw new Error(`ms.loadingAnimation: unknown setting ${String(prop)}`);
    }

    const owner = __ms_loading_owner(ownerHint);
    if (!owner) {
        throw new Error('ms.loadingAnimation must be used inside a component');
    }

    owner.loadingAnimationOverride ||= {};
    owner.loadingAnimationOverride[key] = __ms_clone_loading_value(value);
    return true;
}

function __ms_get_loading_setting(ownerHint, prop) {
    if (typeof prop === 'symbol') {
        if (prop === Symbol.toStringTag) return 'MSLoadingAnimation';
        return undefined;
    }

    if (String(prop).toLowerCase() === 'setdefault') {
        return false;
    }

    if (prop === 'reset') {
        return () => __ms_clear_loading_override(ownerHint);
    }

    if (prop === 'toJSON') {
        return () => __ms_effective_loading_settings(ownerHint);
    }

    const key = __ms_canonical_loading_key(prop);
    if (!key) return undefined;

    return __ms_clone_loading_value(__ms_effective_loading_settings(ownerHint)[key]);
}

function __ms_create_loading_animation_api(ownerHint = null) {
    return new Proxy({}, {
        get(_, prop) {
            return __ms_get_loading_setting(ownerHint, prop);
        },

        set(_, prop, value) {
            return __ms_set_loading_override(ownerHint, prop, value);
        },

        deleteProperty(_, prop) {
            const key = __ms_canonical_loading_key(prop);
            const owner = __ms_loading_owner(ownerHint);
            if (key && owner?.loadingAnimationOverride) {
                delete owner.loadingAnimationOverride[key];
            }
            return true;
        },

        ownKeys() {
            return [...LOADING_ANIMATION_KEYS.values(), 'setDefault'];
        },

        getOwnPropertyDescriptor() {
            return {
                enumerable: true,
                configurable: true
            };
        }
    });
}

function __ms_loading_type_to_mode(type, fallbackMode = 'mode2') {
    if (type == null || type === '') return fallbackMode;

    const raw = String(type).trim().toLowerCase();
    return LOADING_ANIMATION_TYPE_TO_MODE.get(raw) || fallbackMode;
}

function __ms_number_in_range(value, fallback, min = 0, max = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function __ms_loading_config(ownerHint = null) {
    const cfg = __ms_effective_loading_settings(ownerHint);
    const type = String(cfg.Type || 'spinner').trim().toLowerCase();
    const mode = __ms_loading_type_to_mode(type, 'mode2');
    const animatedImage = cfg.AnimatedImage || null;
    const imageSize = __ms_parse_image_size(cfg.ImageSize);

    return {
        enabled: cfg.Enabled !== false,
        fullScreen: cfg.FullScreen === true,
        type,
        mode,
        delay: Number.isFinite(Number(cfg.Delay)) ? Number(cfg.Delay) : 80,
        blur: cfg.Blur !== false,
        lockUI: cfg.LockUI !== false,
        spinnerSize: Number.isFinite(Number(cfg.SpinnerSize)) ? Number(cfg.SpinnerSize) : 16,
        backgroundOpacity: __ms_number_in_range(cfg.BackgroundOpacity, null),
        contentOpacity: __ms_number_in_range(cfg.ContentOpacity, 0.55),
        image: animatedImage
            ? __ms_resolve_resource_url(animatedImage, MS_CONFIG_BASE_URL || location.href, 'img')
            : null,
        imageSize,
        css: (cfg.CSS || MS_CONFIG.Loading_CSS)
            ? __ms_resolve_resource_url(cfg.CSS || MS_CONFIG.Loading_CSS, MS_CONFIG_BASE_URL || location.href, 'css')
            : null
    };
}

function __ms_parse_image_size(raw) {
    if (raw == null || raw === '') return null;

    if (Array.isArray(raw) && raw.length >= 2) {
        const width = Number(raw[0]);
        const height = Number(raw[1]);
        return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
            ? { width, height }
            : null;
    }

    if (typeof raw === 'object') {
        const width = Number(raw.width ?? raw.Width);
        const height = Number(raw.height ?? raw.Height);
        return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
            ? { width, height }
            : null;
    }

    const parts = String(raw).split(',').map(x => Number(x.trim()));
    if (parts.length < 2) return null;

    const [width, height] = parts;
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        ? { width, height }
        : null;
}

function __ms_ensure_loader_style() {
    if (document.getElementById("__ms_spin_style")) return;

    const style = document.createElement("style");
    style.id = "__ms_spin_style";
    style.textContent =
        "@keyframes ms-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}" +
        "@keyframes ms-skeleton{0%{background-position:100% 0}100%{background-position:-100% 0}}" +
        "@keyframes ms-wave{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}" +
        "@keyframes ms-wave-bg{0%{background-position:0 0}100%{background-position:160px 0}}";
    document.head.appendChild(style);
}

function __ms_spinner_node(cfg) {
    const size = Math.max(12, Number(cfg.spinnerSize || 16));
    const spinner = document.createElement("div");
    spinner.style.cssText =
        `width:${size}px;height:${size}px;` +
        "border:3px solid rgba(80,80,80,.22);" +
        "border-top-color:#1f2937;" +
        "border-radius:50%;" +
        "animation:ms-spin .8s linear infinite;";
    return spinner;
}

function __ms_loader_content(cfg, fixed) {
    const wrap = document.createElement("div");
    wrap.style.cssText =
        "display:flex;align-items:center;justify-content:center;" +
        "width:100%;height:100%;min-height:32px;position:relative;overflow:hidden;";

    if (cfg.mode === 'mode4') {
        const sea = document.createElement("div");
        sea.style.cssText =
            "position:absolute;inset:0;overflow:hidden;" +
            "background:repeating-linear-gradient(115deg,rgba(14,165,233,.10) 0 18px,rgba(56,189,248,.18) 18px 36px);" +
            "background-size:160px 100%;animation:ms-wave-bg .9s linear infinite;";

        const wave = document.createElement("div");
        wave.style.cssText =
            "position:absolute;left:0;top:0;width:65%;height:100%;" +
            "background:linear-gradient(90deg,transparent,rgba(2,132,199,.45),rgba(125,211,252,.85),rgba(2,132,199,.45),transparent);" +
            "transform:translateX(-120%);animation:ms-wave .72s linear infinite;";

        sea.appendChild(wave);
        wrap.appendChild(sea);
        return wrap;
    }

    if (cfg.mode === 'mode1' || cfg.mode === 'mode3') {
        const skeletonBox = document.createElement("div");
        skeletonBox.style.cssText = fixed
            ? "position:absolute;inset:22%;display:flex;flex-direction:column;gap:10px;"
            : "width:min(76%,260px);display:flex;flex-direction:column;gap:7px;";

        const rows = cfg.mode === 'mode3' ? 3 : 2;
        for (let i = 0; i < rows; i++) {
            const skeleton = document.createElement("div");
            const rowWidth = i === 0 ? '100%' : (i === 1 ? '76%' : '54%');
            skeleton.style.cssText =
                `width:${rowWidth};height:${fixed ? 18 : 12}px;border-radius:4px;` +
                "background:linear-gradient(90deg,rgba(241,245,249,.85) 25%,rgba(148,163,184,.9) 37%,rgba(241,245,249,.85) 63%);" +
                "background-size:400% 100%;animation:ms-skeleton 1.05s ease infinite;";
            skeletonBox.appendChild(skeleton);
        }

        wrap.appendChild(skeletonBox);
    }

    if (cfg.mode === 'mode5' && cfg.image) {
        const img = document.createElement("img");
        img.src = cfg.image;
        img.alt = "Loading";
        img.style.cssText =
            "position:relative;" +
            (cfg.imageSize
                ? `width:${cfg.imageSize.width}px;height:${cfg.imageSize.height}px;`
                : "width:auto;height:auto;") +
            "max-width:none;max-height:none;opacity:1;filter:none;";
        img.onerror = () => {
            img.replaceWith(__ms_spinner_node(cfg));
        };
        wrap.appendChild(img);
        return wrap;
    }

    if (cfg.mode === 'mode1' || cfg.mode === 'mode2') {
        const spinner = __ms_spinner_node(cfg);
        spinner.style.cssText += cfg.mode === 'mode1'
            ? "position:absolute;right:calc(50% - 140px);"
            : "position:relative;";
        wrap.appendChild(spinner);
    }

    return wrap;
}

function __ms_create_loader_overlay(cfg, fixed) {
    __ms_ensure_loader_style();

    if (cfg.css) {
        __ms_load_css(cfg.css);
    }

    const overlay = document.createElement("div");
    overlay.setAttribute("data-ms-loader", fixed ? "global" : "target");
    overlay.setAttribute("data-ms-loader-type", cfg.type);
    const isWave = cfg.mode === 'mode4';
    const configuredOpacity = Number.isFinite(cfg.backgroundOpacity);
    const targetOpacity = configuredOpacity
        ? cfg.backgroundOpacity
        : (isWave ? 0.24 : (cfg.mode === 'mode3' ? 0.10 : 0.18));
    const globalOpacity = configuredOpacity
        ? cfg.backgroundOpacity
        : (isWave ? 0.38 : (cfg.mode === 'mode3' ? 0.28 : 0.62));
    const targetBackground = `rgba(240,249,255,${targetOpacity})`;
    const globalBackground = fixed
        ? `rgba(15,23,42,${globalOpacity})`
        : targetBackground;

    overlay.style.cssText =
        (fixed ? "position:fixed;inset:0;" : "position:absolute;inset:0;") +
        "display:flex;align-items:center;justify-content:center;" +
        `background:${fixed ? globalBackground : targetBackground};` +
        (cfg.blur ? `backdrop-filter:blur(${fixed ? 2 : 1}px);` : "") +
        `pointer-events:${cfg.lockUI ? 'auto' : 'none'};` +
        `z-index:${fixed ? '2147483646' : '9999'};`;
    overlay.appendChild(__ms_loader_content(cfg, fixed));
    return overlay;
}

function __ms_global_loader_start(cfg) {
    MS_LOADING_COUNT++;

    if (MS_GLOBAL_LOADER || MS_LOADER_TIMER) {
        return { type: 'global' };
    }

    MS_LOADER_TIMER = setTimeout(() => {
        if (MS_LOADING_COUNT === 0) {
            MS_LOADER_TIMER = null;
            return;
        }

        const overlay = __ms_create_loader_overlay(cfg, true);
        document.body.appendChild(overlay);
        MS_GLOBAL_LOADER = overlay;
        MS_LOADER_TIMER = null;
    }, cfg.delay);

    return { type: 'global' };
}

function __ms_global_loader_end() {
    if (MS_LOADING_COUNT > 0) {
        MS_LOADING_COUNT--;
    }

    if (MS_LOADING_COUNT !== 0) return;

    if (MS_LOADER_TIMER) {
        clearTimeout(MS_LOADER_TIMER);
        MS_LOADER_TIMER = null;
    }

    if (MS_GLOBAL_LOADER) {
        MS_GLOBAL_LOADER.remove();
        MS_GLOBAL_LOADER = null;
    }
}

function __ms_target_loader_start(target, cfg) {
    if (!target || !(target instanceof HTMLElement)) return null;
    if (target.tagName !== 'DIV' && !__ms_is_custom_tag_name(target.localName || target.tagName)) return null;

    let rec = MS_TARGET_LOADERS.get(target);
    if (rec) {
        rec.count++;
        return target;
    }

    const computed = getComputedStyle(target);
    rec = {
        count: 1,
        timer: null,
        overlay: null,
        oldPosition: target.style.position,
        oldMinHeight: target.style.minHeight,
        fadedChildren: [],
        changedPosition: computed.position === 'static',
        changedMinHeight: target.getBoundingClientRect().height < 32,
        cfg
    };

    if (rec.changedPosition) {
        target.style.position = 'relative';
    }

    if (rec.changedMinHeight) {
        target.style.minHeight = '48px';
    }

    rec.timer = setTimeout(() => {
        const current = MS_TARGET_LOADERS.get(target);
        if (!current || current.count <= 0) return;

        current.overlay = __ms_create_loader_overlay(cfg, false);
        current.fadedChildren = Array.from(target.children)
            .filter(child =>
                child !== current.overlay &&
                child.getAttribute('data-ms-loader') !== 'target' &&
                !child.hasAttribute('data-ms-pending-reveal')
            )
            .map(child => ({
                child,
                oldOpacity: child.style.opacity,
                oldTransition: child.style.transition
            }));

        for (const item of current.fadedChildren) {
            item.child.style.transition = item.child.style.transition || 'opacity 120ms ease';
            item.child.style.opacity = String(current.cfg?.contentOpacity ?? 0.55);
        }

        target.appendChild(current.overlay);
        current.timer = null;
    }, cfg.delay);

    MS_TARGET_LOADERS.set(target, rec);
    return target;
}

function __ms_target_loader_end(target) {
    const rec = MS_TARGET_LOADERS.get(target);
    if (!rec) return;

    rec.count--;
    if (rec.count > 0) return;

    if (rec.timer) {
        clearTimeout(rec.timer);
    }

    if (rec.overlay) {
        rec.overlay.remove();
    }

    for (const item of rec.fadedChildren || []) {
        item.child.style.opacity = item.oldOpacity;
        item.child.style.transition = item.oldTransition;
    }

    if (rec.changedPosition) {
        target.style.position = rec.oldPosition;
    }

    if (rec.changedMinHeight) {
        target.style.minHeight = rec.oldMinHeight;
    }

    MS_TARGET_LOADERS.delete(target);
}

function __ms_loader_start(targets = null, ownerInstance = null) {
    const cfg = __ms_loading_config(ownerInstance);
    if (!cfg.enabled) return { type: 'none' };

    const targetList = (Array.isArray(targets) ? targets : [targets])
        .filter(t => t instanceof HTMLElement);

    if (cfg.fullScreen) {
        return __ms_global_loader_start(cfg);
    }

    if (targetList.length) {
        const startedTargets = targetList
            .map(t => __ms_target_loader_start(t, cfg))
            .filter(Boolean);

        if (!startedTargets.length) {
            return { type: 'none' };
        }

        return {
            type: 'targets',
            targets: startedTargets
        };
    }

    return __ms_global_loader_start(cfg);
}


function __ms_loader_end(token = null) {
    if (token?.type === 'none') return;

    if (token?.type === 'targets') {
        for (const target of token.targets || []) {
            __ms_target_loader_end(target);
        }
        return;
    }

    __ms_global_loader_end();
}

function __ms_db_is_allowed(list, instanceName) {

    if (!list || list.includes("*"))
        return true;

    return list.some(rule => {

        if (!rule) return false;

        // exact logical name
        if (rule === instanceName)
            return true;

        // folder rule "./Reports/"
        if (rule.endsWith('/')) {
            return instanceName.startsWith(
                rule.replace('./', '').replace(/\/$/, '')
            );
        }

        return false;
    });
}

async function loadDbCoreOnce() {
    if (__MS_DB_CORE__) return __MS_DB_CORE__;
    if (__MS_DB_LOADING__) return __MS_DB_LOADING__;

    const src = new URL('./db.mjs', import.meta.url).href;

    __MS_DB_LOADING__ = import(src)
        .then(mod => {
            const core = mod?.default || mod;

            if (!core || typeof core.init !== 'function') {
                throw new Error('db.mjs loaded but did not export a valid DB API');
            }

            __MS_DB_CORE__ = core;
            return core;
        })
        .catch(e => {
            __MS_DB_LOADING__ = null;
            if (e?.__msDependencyError) throw e;
            throw __ms_runtime_dependency_error(
                'db.mjs',
                src,
                e?.message || String(e)
            );
        });

    return __MS_DB_LOADING__;
}


function __ms_popup_px(value) {
    if (value == null || value === '') return null;
    return typeof value === 'number' ? `${value}px` : String(value);
}

function __ms_popup_spacing(value, fallback) {
    if (value == null || value === '') return fallback;
    return typeof value === 'number' ? `${value}px` : String(value);
}

function __ms_popup_has_style(value) {
    if (value == null || value === false) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

function __ms_popup_is_css_path(value) {
    return typeof value === 'string' && /\.css(?:[?#].*)?$/i.test(value.trim());
}

function __ms_popup_apply_inline_style(el, value) {
    if (!el || !value || __ms_popup_is_css_path(value)) return;

    if (typeof value === 'string') {
        el.style.cssText += `;${value}`;
        return;
    }

    if (typeof value === 'object') {
        for (const [key, styleValue] of Object.entries(value)) {
            if (styleValue == null) continue;
            if (key.startsWith('--') || key.includes('-')) {
                el.style.setProperty(key, String(styleValue));
            }
            else {
                el.style[key] = styleValue;
            }
        }
    }
}

async function __ms_popup_append_css(root, raw, baseUrl, marker) {
    if (!raw) return;

    const css = await __ms_load_text_resource(raw, baseUrl || location.href, 'css');
    const style = (root.ownerDocument || document).createElement('style');
    style.setAttribute(marker, __ms_resolve_resource_url(raw, baseUrl || location.href, 'css'));
    style.textContent = css;
    root.appendChild(style);
}

const __MS_POPUP_STRUCTURE_CSS__ = `
    :host {
        position: absolute;
        display: block;
        width: min(92vw, 640px);
        max-width: calc(100vw - 24px);
        max-height: calc(100vh - 24px);
        pointer-events: auto;
        box-sizing: border-box;
    }
    .ms-popup-window {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: inherit;
        box-sizing: border-box;
        overflow: hidden;
    }
    .ms-popup-titlebar {
        display: flex;
        align-items: center;
        min-height: 32px;
        flex: 0 0 auto;
        background: var(--ms-popup-title-background, #173a53);
        color: var(--ms-popup-title-color, #ffffff);
        user-select: none;
        touch-action: none;
    }
    .ms-popup-title {
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .ms-popup-minimize,
    .ms-popup-close {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    :host(.ms-popup-minimized) .ms-popup-content,
    :host(.ms-popup-minimized) .ms-popup-resize-handle {
        display: none;
    }
    .ms-popup-content {
        min-width: 0;
        min-height: 0;
        flex: 1 1 auto;
        overflow: auto;
        box-sizing: border-box;
    }
    .ms-popup-content.ms-popup-content-center {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .ms-popup-resize-handle {
        position: absolute;
        z-index: 20;
        touch-action: none;
    }
    .ms-popup-resize-n,
    .ms-popup-resize-s {
        left: 8px;
        right: 8px;
        height: 8px;
        cursor: ns-resize;
    }
    .ms-popup-resize-n { top: -4px; }
    .ms-popup-resize-s { bottom: -4px; }
    .ms-popup-resize-e,
    .ms-popup-resize-w {
        top: 8px;
        bottom: 8px;
        width: 8px;
        cursor: ew-resize;
    }
    .ms-popup-resize-e { right: -4px; }
    .ms-popup-resize-w { left: -4px; }
    .ms-popup-resize-ne,
    .ms-popup-resize-nw,
    .ms-popup-resize-se,
    .ms-popup-resize-sw {
        width: 12px;
        height: 12px;
    }
    .ms-popup-resize-ne { top: -5px; right: -5px; cursor: nesw-resize; }
    .ms-popup-resize-nw { top: -5px; left: -5px; cursor: nwse-resize; }
    .ms-popup-resize-se { right: -5px; bottom: -5px; cursor: nwse-resize; }
    .ms-popup-resize-sw { left: -5px; bottom: -5px; cursor: nesw-resize; }
`;

class MSPopup {

    constructor(name) {
        this.name = name;

        // behavior
        this.modal = true;
        this.closeOnBackdrop = false;
        this.closeOnEsc = true;
        this.draggable = true;
        this.resizable = true;
        this.minimizable = true;
        this.autoShrink = true;
        this.contentMargin = '8px 0 0 8px';
        this.contentCenter = false;

        // style
        this.title = name;
        this.style = null;
        this.width = null;
        this.height = null;
        this.top = null;
        this.left = null;

        this._ref = null;
        this._overlay = null;
        this._escHandler = null;
        this._dragCleanups = [];
        this._caller = currentExecutionInstance() || activeInstance() || CURRENT_SCREEN;
        const selected = this._caller?.security?.defaultCss;
        this._defaultCssPolicy = Array.isArray(selected) ? [...selected] : selected;
    }

    async open() {

        const overlay = document.createElement('div');

        overlay.style.cssText = `
  position:fixed;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:${this.modal ? 'rgba(0,0,0,0.4)' : 'transparent'};
  z-index:2147483645;
  pointer-events:${this.modal ? 'auto' : 'none'};
`;

        const shell = document.createElement('div');
        shell.setAttribute('data-ms-popup-shell', '');
        const shellRoot = shell.attachShadow({ mode: 'open' });

        const structureStyle = document.createElement('style');
        structureStyle.textContent = __MS_POPUP_STRUCTURE_CSS__;
        shellRoot.appendChild(structureStyle);

        const box = document.createElement('div');
        box.className = 'ms-popup-window';

        const titleBar = document.createElement('div');
        titleBar.className = 'ms-popup-titlebar';

        const title = document.createElement('span');
        title.className = 'ms-popup-title';
        title.textContent = this.title == null ? '' : String(this.title);

        const closeButton = document.createElement('button');
        closeButton.className = 'ms-popup-close';
        closeButton.type = 'button';
        closeButton.title = 'Close';
        closeButton.setAttribute('aria-label', 'Close popup');
        closeButton.textContent = '\u00d7';

        const minimizeButton = document.createElement('button');
        minimizeButton.className = 'ms-popup-minimize';
        minimizeButton.type = 'button';
        minimizeButton.title = 'Minimize';
        minimizeButton.setAttribute('aria-label', 'Minimize popup');
        minimizeButton.textContent = '\u2212';
        minimizeButton.hidden = !this.minimizable;

        const content = document.createElement('div');
        content.className = 'ms-popup-content';
        if (this.contentCenter) {
            content.classList.add('ms-popup-content-center');
            content.style.padding = '0';
        }
        else {
            content.style.padding = __ms_popup_spacing(this.contentMargin, '8px 0 0 8px');
        }

        titleBar.append(title, minimizeButton, closeButton);
        box.append(titleBar, content);
        shellRoot.appendChild(box);

        const resizeHandles = [];
        if (this.resizable) {
            for (const direction of ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']) {
                const handle = document.createElement('div');
                handle.className = `ms-popup-resize-handle ms-popup-resize-${direction}`;
                handle.dataset.direction = direction;
                shellRoot.appendChild(handle);
                resizeHandles.push(handle);
            }
        }

        if (this.width != null) shell.style.width = __ms_popup_px(this.width);
        if (this.height != null) shell.style.height = __ms_popup_px(this.height);
        shell.style.minWidth = this.autoShrink
            ? 'min(220px, calc(100vw - 24px))'
            : '220px';
        shell.style.minHeight = this.autoShrink
            ? 'min(120px, calc(100vh - 24px))'
            : '120px';
        shell.style.maxWidth = this.autoShrink ? 'calc(100vw - 24px)' : 'none';
        shell.style.maxHeight = this.autoShrink ? 'calc(100vh - 24px)' : 'none';
        shell.style.resize = 'none';
        shell.style.overflow = 'hidden';

        const top = __ms_popup_px(this.top);
        const left = __ms_popup_px(this.left);
        if (top == null && left == null) {
            shell.style.top = '50%';
            shell.style.left = '50%';
            shell.style.transform = 'translate(-50%, -50%)';
        }
        else {
            shell.style.top = top || '12px';
            shell.style.left = left || '12px';
        }

        const policy = this._defaultCssPolicy;
        const hasLocalStyle = __ms_popup_has_style(this.style);
        const globalOverridesLocal = hasLocalStyle && Array.isArray(policy) && policy.some(x =>
            __ms_normalize_default_css_key(x) === '*' ||
            __ms_default_css_keys_match(x, 'popup')
        );
        const globalCssAllowed = Array.isArray(policy) && !policy.length
            ? false
            : !hasLocalStyle || globalOverridesLocal;

        overlay.appendChild(shell);
        document.body.appendChild(overlay);

        const parent = this._caller || currentExecutionInstance() || CURRENT_SCREEN;
        const desc = createDescriptorForCaller(this.name, parent);
        const loaderToken = __ms_loader_start(content, parent);
        let inst;
        try {
            let globalCssApplied = false;
            if (globalCssAllowed) {
                const popupCss = __ms_default_css_url_for('popup');
                if (popupCss) {
                    try {
                        await __ms_popup_append_css(
                            shellRoot,
                            popupCss,
                            MS_CONFIG_BASE_URL || location.href,
                            'data-ms-popup-default-css'
                        );
                        globalCssApplied = true;
                    }
                    catch (e) {
                        console.warn(`MS popup: failed to load global popup CSS. ${e?.message || e}`);
                    }
                }
            }

            const applyLocalStyle = hasLocalStyle && !(globalOverridesLocal && globalCssApplied);
            if (applyLocalStyle && __ms_popup_is_css_path(this.style)) {
                await __ms_popup_append_css(
                    shellRoot,
                    this.style.trim(),
                    this._caller?.url || location.href,
                    'data-ms-popup-local-css'
                );
            }
            else if (applyLocalStyle) {
                __ms_popup_apply_inline_style(box, this.style);
            }

            inst = await createInstance(desc, content, 'popup', undefined, parent);
            if (this.contentCenter) {
                inst.host.style.width = 'fit-content';
                inst.host.style.maxWidth = '100%';
                inst.host.style.margin = 'auto';
            }
        }
        catch (e) {
            overlay.remove();
            throw e;
        }
        finally {
            __ms_loader_end(loaderToken);
        }

        this._inst = inst;
        this.ref = inst.refId;

        inst.parentRef = parent?.refId || inst.parentRef || null;

        const ref = createRef(inst);

        ref.close = () => {
            return this.close();
        };

        this._ref = ref;
        this._overlay = overlay;
        this._shell = shell;

        closeButton.addEventListener('click', () => this.close());

        let restoreSize = null;
        const setMinimized = minimized => {
            if (!this.minimizable || shell.classList.contains('ms-popup-minimized') === minimized) return;

            const rect = shell.getBoundingClientRect();
            shell.style.transform = 'none';
            shell.style.left = `${rect.left}px`;
            shell.style.top = `${rect.top}px`;

            if (minimized) {
                restoreSize = { width: rect.width, height: rect.height };
                const compactWidth = Math.min(180, Math.max(1, window.innerWidth - 24));
                const compactHeight = Math.ceil(titleBar.getBoundingClientRect().height + 2);
                shell.classList.add('ms-popup-minimized');
                shell.style.minWidth = '0';
                shell.style.minHeight = '0';
                shell.style.width = `${compactWidth}px`;
                shell.style.height = `${compactHeight}px`;
                minimizeButton.title = 'Restore';
                minimizeButton.setAttribute('aria-label', 'Restore popup');
                minimizeButton.textContent = '\u25a1';
                return;
            }

            shell.classList.remove('ms-popup-minimized');
            shell.style.minWidth = this.autoShrink
                ? 'min(220px, calc(100vw - 24px))'
                : '220px';
            shell.style.minHeight = this.autoShrink
                ? 'min(120px, calc(100vh - 24px))'
                : '120px';

            const margin = this.autoShrink ? 12 : 0;
            const availableWidth = Math.max(1, window.innerWidth - margin - rect.left);
            const availableHeight = Math.max(1, window.innerHeight - margin - rect.top);
            shell.style.width = `${this.autoShrink
                ? Math.min(restoreSize?.width || 220, availableWidth)
                : restoreSize?.width || 220}px`;
            shell.style.height = `${this.autoShrink
                ? Math.min(restoreSize?.height || 120, availableHeight)
                : restoreSize?.height || 120}px`;
            minimizeButton.title = 'Minimize';
            minimizeButton.setAttribute('aria-label', 'Minimize popup');
            minimizeButton.textContent = '\u2212';
        };

        minimizeButton.addEventListener('click', () => {
            setMinimized(!shell.classList.contains('ms-popup-minimized'));
        });

        if (this.autoShrink) {
            const keepInsideViewport = () => {
                if (shell.style.transform && shell.style.transform !== 'none') return;
                const rect = shell.getBoundingClientRect();
                const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
                const maxTop = Math.max(12, window.innerHeight - rect.height - 12);
                shell.style.left = `${Math.min(maxLeft, Math.max(12, rect.left))}px`;
                shell.style.top = `${Math.min(maxTop, Math.max(12, rect.top))}px`;
            };

            window.addEventListener('resize', keepInsideViewport);
            this._dragCleanups.push(() => window.removeEventListener('resize', keepInsideViewport));

            if (typeof ResizeObserver === 'function') {
                const resizeObserver = new ResizeObserver(keepInsideViewport);
                resizeObserver.observe(shell);
                this._dragCleanups.push(() => resizeObserver.disconnect());
            }
        }

        if (this.resizable) {
            const onResizePointerDown = (e) => {
                if (e.button !== 0) return;

                const direction = e.currentTarget.dataset.direction || '';
                const rect = shell.getBoundingClientRect();
                const startX = e.clientX;
                const startY = e.clientY;
                const minWidth = this.autoShrink
                    ? Math.min(220, Math.max(1, window.innerWidth - 24))
                    : 220;
                const minHeight = this.autoShrink
                    ? Math.min(120, Math.max(1, window.innerHeight - 24))
                    : 120;

                shell.style.transform = 'none';
                shell.style.left = `${rect.left}px`;
                shell.style.top = `${rect.top}px`;
                shell.style.width = `${rect.width}px`;
                shell.style.height = `${rect.height}px`;

                const onPointerMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    const margin = this.autoShrink ? 12 : 0;
                    let left = rect.left;
                    let top = rect.top;
                    let width = rect.width;
                    let height = rect.height;

                    if (direction.includes('e')) {
                        width = Math.min(window.innerWidth - margin - rect.left, rect.width + dx);
                    }
                    if (direction.includes('s')) {
                        height = Math.min(window.innerHeight - margin - rect.top, rect.height + dy);
                    }
                    if (direction.includes('w')) {
                        const right = rect.right;
                        left = Math.max(margin, rect.left + dx);
                        width = right - left;
                    }
                    if (direction.includes('n')) {
                        const bottom = rect.bottom;
                        top = Math.max(margin, rect.top + dy);
                        height = bottom - top;
                    }

                    if (width < minWidth) {
                        if (direction.includes('w')) left -= minWidth - width;
                        width = minWidth;
                    }
                    if (height < minHeight) {
                        if (direction.includes('n')) top -= minHeight - height;
                        height = minHeight;
                    }

                    shell.style.left = `${left}px`;
                    shell.style.top = `${top}px`;
                    shell.style.width = `${width}px`;
                    shell.style.height = `${height}px`;
                };

                const onPointerUp = () => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp, { once: true });
                this._dragCleanups.push(() => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                });
                e.preventDefault();
                e.stopPropagation();
            };

            for (const handle of resizeHandles) {
                handle.addEventListener('pointerdown', onResizePointerDown);
                this._dragCleanups.push(() => handle.removeEventListener('pointerdown', onResizePointerDown));
            }
        }

        if (this.draggable) {
            titleBar.classList.add('ms-popup-draggable');
            titleBar.style.cursor = 'move';

            const onPointerDown = (e) => {
                if (e.button !== 0 || e.target === closeButton || e.target === minimizeButton) return;
                const rect = shell.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;

                shell.style.transform = 'none';
                shell.style.left = `${rect.left}px`;
                shell.style.top = `${rect.top}px`;

                const onPointerMove = (moveEvent) => {
                    const maxLeft = Math.max(0, window.innerWidth - shell.offsetWidth);
                    const maxTop = Math.max(0, window.innerHeight - titleBar.offsetHeight);
                    const nextLeft = Math.min(maxLeft, Math.max(0, moveEvent.clientX - offsetX));
                    const nextTop = Math.min(maxTop, Math.max(0, moveEvent.clientY - offsetY));
                    shell.style.left = `${nextLeft}px`;
                    shell.style.top = `${nextTop}px`;
                };

                const onPointerUp = () => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp, { once: true });
                this._dragCleanups.push(() => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                });
                e.preventDefault();
            };

            titleBar.addEventListener('pointerdown', onPointerDown);
            this._dragCleanups.push(() => titleBar.removeEventListener('pointerdown', onPointerDown));
        }

        for (const k of Object.keys(inst.locals || {})) {

            if (typeof inst.locals[k] === 'function') {

                this[k] = async (...args) => {

                    try {

                        const result = withInstanceContext(inst, k, () => inst.locals[k](...args));

                        return await Promise.resolve(result);

                    }
                    catch (e) {

                        const err = __ms_build_error(e, inst.name, k);
                        __ms_halt_engine(err);
                        throw e;

                    }
                };

            }
        }

        if (this.closeOnBackdrop) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    ref.close();
                }
            });
        }

        if (this.closeOnEsc) {
            const handler = (e) => {
                if (e.key === 'Escape') {
                    ref.close();
                    window.removeEventListener('keydown', handler);
                }
            };
            this._escHandler = handler;
            window.addEventListener('keydown', handler);
        }

        await callLifecycle(inst, 'onShow');

        return this;
    }

    async close() {

        if (this._inst) {
            const closed = await __ms_destroy_instance(this._inst);
            if (!closed) return false;
        }

        if (this._overlay && this._overlay.parentNode) {
            this._overlay.remove();
        }

        if (this._escHandler) {
            window.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }

        for (const cleanup of this._dragCleanups.splice(0)) {
            cleanup();
        }

        this._inst = null;
        this._ref = null;
        this._overlay = null;
        this._shell = null;

        return true;
    }
}

let __MS_LAYOUT_SEQ__ = 0;

function __ms_layout_px(value, fallback) {
    if (value == null || value === '') return fallback;
    return typeof value === 'number' ? `${value}px` : String(value);
}

function __ms_layout_to_kebab(value) {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'slot';
}

function __ms_layout_apply_style(el, style) {
    if (!el || !style) return;

    if (typeof style === 'string') {
        el.style.cssText += ';' + style;
        return;
    }

    if (typeof style === 'object') {
        Object.assign(el.style, style);
    }
}

function __ms_layout_has_style_value(value) {
    if (value == null || value === false) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

function __ms_layout_policy_allows(policy, name) {
    if (!Array.isArray(policy)) return true;
    if (!policy.length) return false;
    if (policy.some(x => __ms_normalize_default_css_key(x) === '*')) return true;
    return policy.some(x => __ms_default_css_keys_match(x, name));
}

function __ms_layout_default_css_policy(layout) {
    if (layout && Object.prototype.hasOwnProperty.call(layout, '__msDefaultCssPolicy')) {
        return layout.__msDefaultCssPolicy;
    }

    const selected = (currentExecutionInstance() || activeInstance())?.security?.defaultCss;
    return Array.isArray(selected) ? [...selected] : selected;
}

function __ms_layout_has_local_style(layout) {
    if (!layout) return false;
    if (__ms_layout_has_style_value(layout.style) || __ms_layout_has_style_value(layout.className)) {
        return true;
    }

    for (const slot of layout._slots?.values?.() || []) {
        if (
            __ms_layout_has_style_value(slot.style) ||
            __ms_layout_has_style_value(slot.className) ||
            __ms_layout_has_style_value(slot.textStyle) ||
            slot.cardType !== null ||
            slot.cardBackground !== 'white' ||
            slot.cardRadius !== 10 ||
            slot.cardPadding !== 12 ||
            slot.cardShadow !== '0 8px 18px rgba(15, 23, 42, 0.14)' ||
            slot.cardBorder !== ''
        ) {
            return true;
        }
    }

    return false;
}

function __ms_layout_default_css_url(layout) {
    const policy = __ms_layout_default_css_policy(layout);
    if (Array.isArray(policy) && !policy.length) return null;

    const url = __ms_default_css_url_for('layout');
    if (!url) return null;

    if (!__ms_layout_has_local_style(layout)) return url;
    return Array.isArray(policy) && __ms_layout_policy_allows(policy, 'layout') ? url : null;
}

async function __ms_layout_apply_default_css(root, layout, scope) {
    const url = __ms_layout_default_css_url(layout);
    if (!url || !root?.appendChild) return;

    try {
        const css = await __ms_load_text_resource(url, MS_CONFIG_BASE_URL || location.href, 'css');
        const style = (root.ownerDocument || document).createElement('style');
        style.setAttribute('data-ms-default-css', 'layout');
        style.setAttribute('data-ms-default-css-url', url);
        style.setAttribute('data-ms-layout-default-css', scope || '');
        style.textContent = css;
        root.appendChild(style);
    } catch {
        const link = (root.ownerDocument || document).createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.setAttribute('data-ms-default-css', 'layout');
        link.setAttribute('data-ms-layout-default-css', scope || '');
        root.appendChild(link);
    }
}

function __ms_layout_slot_has_content(slot) {
    return !!(
        slot &&
        (
            slot.show === true ||
            slot.src ||
            slot.html != null ||
            slot.text != null
        )
    );
}

function __ms_layout_slot_card_type_enabled(slot) {
    if (!slot) return false;
    if (slot.cardType === true) return true;
    if (slot.cardType === false) return false;
    return slot.name === 'content';
}

function __ms_layout_slot_horizontal(slot) {
    if (!slot) return false;
    if (slot.horizontal === true) return true;
    if (slot.horizontal === false) return false;
    return slot.name === 'header' || slot.name === 'footer';
}

function __ms_layout_slot_columns(slot) {
    const value = Number(slot?.columns);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.max(1, Math.floor(value));
}

class MSLayoutSlot {
    constructor(name) {
        this.name = name;
        this.src = '';
        this.params = undefined;
        this.width = null;
        this.height = null;
        this.minHeight = null;
        this.gap = null;
        this.horizontal = null;
        this.columns = null;
        this.style = null;
        this.className = '';
        this.cardType = null;
        this.cardBackground = 'white';
        this.cardRadius = 10;
        this.cardPadding = 12;
        this.cardShadow = '0 8px 18px rgba(15, 23, 42, 0.14)';
        this.cardBorder = '';
        this.html = null;
        this.text = null;
        this.textStyle = null;
        this.show = false;
        this._el = null;
        this._ref = null;
    }
}

class MSLayout {
    constructor() {
        this.__msLayoutKind = 'layout';
        this.gap = 8;
        this.minHeight = '360px';
        this.compactWidth = 720;
        this.style = null;
        this.className = '';
        this._slots = new Map();
        this._resizeObserver = null;
        this._resizeFrame = null;
        this._el = null;

        ['header', 'left', 'content', 'right', 'footer'].forEach(name => this._slot(name));
        this.main = this.content;
        this.center = this.content;
    }

    _slot(name) {
        const key = String(name || '').trim();
        if (!key) {
            throw new Error('ms.layout: slot name is required');
        }

        if (this._slots.has(key)) return this._slots.get(key);

        const slot = new MSLayoutSlot(key);
        this._slots.set(key, slot);
        this[key] = slot;

        return slot;
    }

    async mount(root) {
        if (!root) {
            throw new Error('ms.layout: mount target is required');
        }

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._resizeFrame) {
            if (typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this._resizeFrame);
            } else {
                clearTimeout(this._resizeFrame);
            }
            this._resizeFrame = null;
        }

        root.innerHTML = '';
        root.style.containerType = root.style.containerType || 'inline-size';

        const doc = root.ownerDocument || document;
        const scope = `ms-layout-${++__MS_LAYOUT_SEQ__}`;
        const style = doc.createElement('style');
        style.setAttribute('data-ms-layout-style', scope);
        style.textContent = this._styleText(scope);

        const frame = doc.createElement('div');
        frame.className = `ms-layout ${scope}`;
        if (this.className) frame.className += ' ' + this.className;
        frame.style.setProperty('--ms-layout-gap', __ms_layout_px(this.gap, '8px'));
        frame.style.setProperty('--ms-layout-left-width', __ms_layout_px(this.left?.width, '220px'));
        frame.style.setProperty('--ms-layout-right-width', __ms_layout_px(this.right?.width, '220px'));
        frame.style.setProperty('--ms-layout-header-height', __ms_layout_px(this.header?.height, 'auto'));
        frame.style.setProperty('--ms-layout-footer-height', __ms_layout_px(this.footer?.height, 'auto'));
        frame.style.minHeight = __ms_layout_px(this.minHeight, '360px');
        __ms_layout_apply_style(frame, this.style);

        root.appendChild(style);
        await __ms_layout_apply_default_css(root, this, scope);
        root.appendChild(frame);
        this._el = frame;

        const injectTargets = [];

        this._render(frame, injectTargets);

        this._attachResponsiveObserver(frame);

        const refs = {
            el: new MSDomRef(frame),
            slots: {},
            components: {}
        };

        for (const [name, slot] of this._slots) {
            if (slot._el) {
                refs.slots[name] = new MSDomRef(slot._el);
                refs[name] = refs.slots[name];
            }
        }

        if (injectTargets.length) {
            const resultRefs = await __ms_inject_bulk(injectTargets.map(item => {
                const options = { ...(item.slot.options || {}) };
                return item.slot.params === undefined
                    ? [item.slot.src, item.el, options]
                    : [item.slot.src, item.slot.params, item.el, options];
            }));

            injectTargets.forEach((item, index) => {
                const ref = resultRefs[index];
                item.slot._ref = ref;
                refs.components[item.name] = ref;
            });
        }

        return refs;
    }

    _styleText(scope) {
        return `
          .${scope} {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            gap: var(--ms-layout-gap);
            display: grid;
          }
          .${scope} * {
            box-sizing: border-box;
            min-width: 0;
          }
          .${scope} .ms-layout-slot {
            min-width: 0;
            min-height: 0;
            overflow: auto;
          }
          .${scope} .ms-layout-slot-flow {
            display: flex;
            flex-direction: var(--ms-layout-slot-direction, column);
            flex-wrap: wrap;
            gap: var(--ms-layout-slot-gap, var(--ms-layout-gap));
          }
          .${scope} .ms-layout-slot-grid {
            display: grid;
            grid-template-columns: repeat(var(--ms-layout-slot-columns), minmax(0, 1fr));
            gap: var(--ms-layout-slot-gap, var(--ms-layout-gap));
          }
          .${scope} .ms-layout-text {
            min-width: 0;
          }
          .${scope} .ms-layout-card-type > [data-ms-component-host] {
            background: var(--ms-layout-card-background);
            border-radius: var(--ms-layout-card-radius);
            padding: var(--ms-layout-card-padding);
            box-shadow: var(--ms-layout-card-shadow);
            border: var(--ms-layout-card-border);
            overflow: hidden;
          }
          .${scope}.ms-layout-compact {
            grid-template-columns: minmax(0, 1fr) !important;
            grid-template-areas: none !important;
          }
          .${scope}.ms-layout-compact > .ms-layout-slot {
            grid-column: 1 !important;
            grid-row: auto !important;
            width: auto !important;
          }
          .${scope}.ms-layout-compact .ms-layout-slot-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        `;
    }

    _attachResponsiveObserver(frame) {
        const limit = Number(this.compactWidth || 0) || 720;
        const update = () => {
            if (!frame.isConnected) return;
            const compact = frame.clientWidth > 0 && frame.clientWidth <= limit;
            if (frame.classList.contains('ms-layout-compact') !== compact) {
                frame.classList.toggle('ms-layout-compact', compact);
            }
        };
        const schedule = () => {
            if (this._resizeFrame) return;
            const run = () => {
                this._resizeFrame = null;
                update();
            };
            this._resizeFrame = typeof requestAnimationFrame === 'function'
                ? requestAnimationFrame(run)
                : setTimeout(run, 0);
        };

        update();

        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(schedule);
            this._resizeObserver.observe(frame);
        } else {
            setTimeout(update, 0);
        }
    }

    _render(frame, injectTargets) {
        const hasHeader = __ms_layout_slot_has_content(this.header);
        const hasLeft = __ms_layout_slot_has_content(this.left);
        const hasRight = __ms_layout_slot_has_content(this.right);
        const hasFooter = __ms_layout_slot_has_content(this.footer);
        const cols = [];
        if (hasLeft) cols.push('var(--ms-layout-left-width)');
        cols.push('minmax(0, 1fr)');
        if (hasRight) cols.push('var(--ms-layout-right-width)');

        const mid = `${hasLeft ? 'left ' : ''}content${hasRight ? ' right' : ''}`;
        const full = `${hasLeft ? 'header ' : ''}header${hasRight ? ' header' : ''}`;
        const foot = `${hasLeft ? 'footer ' : ''}footer${hasRight ? ' footer' : ''}`;
        const areas = [];
        if (hasHeader) areas.push(`"${full}"`);
        areas.push(`"${mid}"`);
        if (hasFooter) areas.push(`"${foot}"`);

        frame.style.gridTemplateAreas = areas.join(' ');
        frame.style.gridTemplateColumns = cols.join(' ');
        frame.style.gridTemplateRows = `${hasHeader ? 'var(--ms-layout-header-height) ' : ''}minmax(0, 1fr)${hasFooter ? ' var(--ms-layout-footer-height)' : ''}`;

        this._appendSlot(frame, 'header', 'header', injectTargets, hasHeader);
        this._appendSlot(frame, 'left', 'left', injectTargets, hasLeft);
        this._appendSlot(frame, 'content', 'content', injectTargets, true);
        this._appendSlot(frame, 'right', 'right', injectTargets, hasRight);
        this._appendSlot(frame, 'footer', 'footer', injectTargets, hasFooter);
    }

    _appendSlot(parent, name, area, injectTargets, visible) {
        const slot = this._slot(name);
        if (!visible) return null;

        const doc = parent.ownerDocument || document;
        const el = doc.createElement('div');
        el.className = `ms-layout-slot ms-layout-slot-${__ms_layout_to_kebab(name)}`;
        if (slot.className) el.className += ' ' + slot.className;
        el.setAttribute('data-ms-layout-slot', name);

        const columns = __ms_layout_slot_columns(slot);
        if (columns) {
            el.classList.add('ms-layout-slot-grid');
            el.style.setProperty('--ms-layout-slot-columns', String(columns));
        } else {
            el.classList.add('ms-layout-slot-flow');
            el.style.setProperty('--ms-layout-slot-direction', __ms_layout_slot_horizontal(slot) ? 'row' : 'column');
        }
        if (slot.gap != null) {
            el.style.setProperty('--ms-layout-slot-gap', __ms_layout_px(slot.gap, 'var(--ms-layout-gap)'));
        }

        if (__ms_layout_slot_card_type_enabled(slot)) {
            el.classList.add('ms-layout-card-type');
            el.style.setProperty('--ms-layout-card-background', String(slot.cardBackground || 'white'));
            el.style.setProperty('--ms-layout-card-radius', __ms_layout_px(slot.cardRadius, '10px'));
            el.style.setProperty('--ms-layout-card-padding', __ms_layout_px(slot.cardPadding, '12px'));
            el.style.setProperty('--ms-layout-card-shadow', String(slot.cardShadow || 'none'));
            el.style.setProperty('--ms-layout-card-border', String(slot.cardBorder || 'none'));
        }
        if (area) el.style.gridArea = area;
        if (slot.width) el.style.width = __ms_layout_px(slot.width, '');
        if (slot.height) el.style.height = __ms_layout_px(slot.height, '');
        if (slot.minHeight) el.style.minHeight = __ms_layout_px(slot.minHeight, '');
        __ms_layout_apply_style(el, slot.style);

        if (slot.html != null) {
            el.insertAdjacentHTML('beforeend', String(slot.html));
        } else if (slot.text != null) {
            const textEl = doc.createElement('div');
            textEl.className = 'ms-layout-text';
            textEl.textContent = String(slot.text);
            __ms_layout_apply_style(textEl, slot.textStyle);
            el.appendChild(textEl);
        }

        parent.appendChild(el);
        slot._el = el;

        if (slot.src) {
            injectTargets.push({ name, slot, el });
        }

        return el;
    }
}

function __ms_create_layout() {
    return new MSLayout();
}

async function __ms_inject_bulk(items, caller = null) {
    if (items.length === 1 &&
        Array.isArray(items[0]) &&
        Array.isArray(items[0][0])) {
        items = items[0];
    }

    const __caller =
        caller ||
        currentExecutionInstance() ||
        activeInstance();

    const normalizedItems = items.map(item => {
        if (!Array.isArray(item) || item.length < 2) {
            throw new Error("bulk inject item must be [component,target,options?]");
        }

        const normalized = normalizeInjectArgs(item);
        const container = resolveInjectTarget(normalized.target);
        if (!container) {
            throw new Error('Inject target not found');
        }

        return { normalized, container };
    });

    const loaderToken = __ms_loader_start(normalizedItems.map(x => x.container), __caller);

    try {
        const names = normalizedItems.map(x => x.normalized.name);
        await ms.preload(...names);

        const results = [];

        for (const entry of normalizedItems) {
            const {
                name,
                constructorParams,
                target,
                options
            } = entry.normalized;

            restoreExecutionContext(__caller);

            const internalOptions = { ...(options || {}), __skipLoader: true };
            const ref = constructorParams === undefined
                ? await ms.inject(name, target, internalOptions)
                : await ms.inject(name, constructorParams, target, internalOptions);

            results.push(ref);
        }

        restoreExecutionContext(__caller);
        return results;
    }
    finally {
        __ms_loader_end(loaderToken);
    }
}

/* =========================================================
   12. PUBLIC API ms
   ========================================================= */

const __MS_REMOTE_DATA_SOURCE__ = Symbol.for('ms.remoteDataSource');

function __ms_create_remote_data_source(service, endpoint, rowsField = null, loadOnce = false) {
    const serviceName = String(service || '').trim();
    const url = String(endpoint || '').trim();
    const responseRowsField = rowsField == null ? '' : String(rowsField).trim();

    if (!serviceName) {
        throw new Error('ms.data server service is required');
    }

    if (!url.startsWith('/') || url.startsWith('//')) {
        throw new Error('ms.data server endpoint must start with "/"');
    }

    if (rowsField != null && !responseRowsField) {
        throw new Error('ms.data server rows field cannot be empty');
    }

    if (typeof loadOnce !== 'boolean') {
        throw new Error('ms.data server load-once setting must be true or false');
    }

    const ownerInstance = currentExecutionInstance() || activeInstance();
    const source = {};

    Object.defineProperty(source, __MS_REMOTE_DATA_SOURCE__, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: Object.freeze({
            service: serviceName,
            url,
            rowsField: responseRowsField || null,
            loadOnce,
            ownerInstance,
            load(params, signal) {
                return __ms_http_request({
                    service: serviceName,
                    url,
                    method: 'GET',
                    params,
                    signal
                }, ownerInstance);
            }
        })
    });

    return Object.freeze(source);
}

function __ms_data_resolve_key(source, field) {
    if (!source || typeof source !== 'object') return field;
    if (Object.prototype.hasOwnProperty.call(source, field)) return field;

    const wanted = String(field).toLowerCase();
    const matches = Object.keys(source).filter(key => key.toLowerCase() === wanted);

    if (matches.length > 1) {
        throw new Error(`ms.data field is ambiguous: ${field}`);
    }

    return matches[0] || field;
}

function __ms_data_pick_object(source, fields) {
    if (!source || typeof source !== 'object') return source;

    if (fields.length === 1) {
        return source[__ms_data_resolve_key(source, fields[0])];
    }

    const result = {};

    fields.forEach(field => {
        const key = __ms_data_resolve_key(source, field);
        result[key] = source[key];
    });

    return result;
}

function __ms_data(source, ...fields) {
    if (
        typeof source === 'string' &&
        fields.length >= 1 &&
        typeof fields[0] === 'string'
    ) {
        if (fields.length > 3) {
            throw new Error('ms.data server source accepts service, endpoint, optional rows field, and optional load-once setting');
        }

        return __ms_create_remote_data_source(source, fields[0], fields[1], fields[2] ?? false);
    }

    const selectedFields = fields
        .flat()
        .filter(field => field != null && String(field).trim() !== '')
        .map(field => String(field).trim());

    if (selectedFields.length === 0) {
        return source;
    }

    if (Array.isArray(source)) {
        return source.map(item => __ms_data_pick_object(item, selectedFields));
    }

    return __ms_data_pick_object(source, selectedFields);
}

export const ms = {
    get loadingAnimation() {
        return __ms_create_loading_animation_api();
    },

    get http() {
        return __ms_create_http_api();
    },

    data(source, ...fields) {
        return __ms_data(source, ...fields);
    },

    __defaultCssAllowed(name) {
        return __ms_default_css_allowed_for_current(name);
    },

    __defaultCssDisabled() {
        return __ms_default_css_disabled_for_current();
    },

    __defaultCssPolicy() {
        const selected = (currentExecutionInstance() || activeInstance())?.security?.defaultCss;
        return Array.isArray(selected) ? [...selected] : selected;
    },

    __defaultCssKeysMatch(a, b) {
        return __ms_default_css_keys_match(a, b);
    },

    __defaultCssUrl(name) {
        return __ms_default_css_url_for(name);
    },

    layout() {
        return __ms_create_layout();
    },

    async ready() {
        const readyCaller = currentExecutionInstance();

        if (!readyCaller && CURRENT_SCREEN?.suppressNativeModuleReady) {
            return STANDALONE_NATIVE_READY_BLOCKER;
        }

        await __ms_ready;
        await (__MS_DB_READY__ || loadDbCoreOnce());
        await __MS_CONFIG_READY__;
        await __MS_CALL_TREE_READY__;

        await loadFormScriptOnce();

        if (!readyCaller) {
            await waitForDeclarativeComponentTasks();
        }
    },

    com(target) {
        return createDeclarativeComponentProxy(target);
    },

    component(target) {
        return createDeclarativeComponentProxy(target);
    },

    async stop() {
        throw new __MS_STOP_EXECUTION__();
    },

    async ErrorClose() {
        const shouldReturn = MS_ERROR_RETURN_TO_PARENT_ON_CLOSE;

        const errorInstance = MS_ERROR_INSTANCE;
        MS_ERROR_INSTANCE = null;

        if (MS_ERROR_MODAL) {
            MS_ERROR_MODAL.remove();
            MS_ERROR_MODAL = null;
        }

        MS_ERROR_RETURN_TO_PARENT_ON_CLOSE = false;

        if (errorInstance && INSTANCES.has(errorInstance.refId)) {
            await __ms_destroy_instance(errorInstance, { skipBeforeHide: true });
        }

        if (shouldReturn) {
            await __ms_return_to_error_parent();
        }

        MS_HALTED = false;
    },

    id(id) {

        let ctx = currentExecutionInstance();

        if (!ctx) {
            const active = activeInstance();
            if (active && active !== CURRENT_SCREEN) {
                ctx = active;
            }
        }

        if (!ctx) {
            ctx = CURRENT_SCREEN;
        }

        if (!ctx) {
            throw new Error(`ms.id(${id}) cannot resolve context`);
        }

        const root = ctx.root;

        const el = resolveElementByIdCI(root, id);
        if (el) return new MSDomRef(el);

        if (__ms_is_custom_tag_name(id)) {
            const tag = id.toLowerCase();
            const el2 = root.querySelector(tag);
            if (el2) return new MSDomRef(el2);
        }

        throw new Error(`Element not found in current component: ${id}`);
    },


    call(fn, ...presetArgs) {
        if (typeof fn !== 'function') {
            throw new Error('ms.call: first argument must be a function');
        }
        return function (event) {

            const inst = currentExecutionInstance() || activeInstance();

            return withInstanceContext(inst, fn.name || 'call', () => {
                if (fn.length === presetArgs.length) {
                    return fn.call(this, ...presetArgs);
                }

                return fn.call(this, event, ...presetArgs);
            });
        };

    },

    el: new Proxy({}, {
        get(_, tag) {
            return function (id) {
                return ms.id(id);
            };
        }
    }),


    q(sel) {
        const inst = currentExecutionInstance() || activeInstance();
        if (!inst) {
            console.warn("MS91: ms.q() before ready");
            throw new Error("MS not ready");
        }

        const el = inst.root.querySelector(sel);
        return el ? new MSDomRef(el) : null;
    },

    qa(sel) {
        const inst = currentExecutionInstance() || activeInstance();
        if (!inst) {
            console.warn("MS91: ms.qa() before ready");
            throw new Error("MS not ready");
        }
        return [...inst.root.querySelectorAll(sel)]
            .map(e => new MSDomRef(e));
    },

    async preload(...names) {

        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        const run = async () => {

            const tasks = [];

            for (const name of names) {

                const desc = createDescriptorForCaller(name, __caller);
                const cacheKey = desc.logical;

                if (PRELOAD_CACHE.has(cacheKey))
                    continue;

                tasks.push(loadComponent(desc).then(() => {
                    PRELOAD_CACHE.add(cacheKey);
                    PRELOAD_CACHE.add(desc.logical);
                    enforceRuntimeAccess(__caller, desc, 'preload');
                }));
            }

            return Promise.all(tasks);
        };

        if ('requestIdleCallback' in window) {

            return new Promise(resolve => {
                requestIdleCallback(() => {
                    run().then(resolve);
                });
            });

        } else {

            return new Promise(resolve => {
                setTimeout(() => {
                    run().then(resolve);
                }, 0);
            });

        }
    },

    preloadQueue(...names) {

        PRELOAD_QUEUE.push(...names);

        if (PRELOAD_RUNNING)
            return;

        PRELOAD_RUNNING = true;

        const run = () => {

            if (!PRELOAD_QUEUE.length) {
                PRELOAD_RUNNING = false;
                return;
            }

            const batch = PRELOAD_QUEUE.splice(0, 3);   // load 3 per idle cycle

            batch.forEach(name => {
                ms.preload(name);
            });

            if (PRELOAD_QUEUE.length) {

                if ('requestIdleCallback' in window)
                    requestIdleCallback(run);
                else
                    setTimeout(run, 50);

            }
            else {
                PRELOAD_RUNNING = false;
            }
        };

        run();
    },

    loadState(name) {
        // returns 0 = not loaded, 1 = loading, 2 = loaded
        const caller =
            currentExecutionInstance() ||
            activeInstance();
        const desc = createDescriptorForCaller(name, caller);

        if (COMPONENT_CACHE.has(desc.logical))
            return 2;   // loaded

        if (PRELOAD_PROMISES.has(desc.logical))
            return 1;   // loading

        return 0;       // not loaded
    },

    async open(name, constructorParams = undefined) {

        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        if (MS_HALTED)
            throw MS_LAST_ERROR?.original || new Error("Engine halted");

        const sys = ensureSystemRoot();
        const loaderToken = __ms_loader_start(sys, __caller);

        try {

            const desc = createDescriptorForCaller(name, __caller);
            await loadComponent(desc);
            enforceRuntimeAccess(__caller, desc, 'open');

            const previousScreen = CURRENT_SCREEN;

            let inst = findInstance(desc, sys);
            const visible = getVisibleInstancesToHide(sys, inst);

            if (!await canHideInstances(visible)) {
                return previousScreen ? createRef(previousScreen) : null;
            }

            if (!inst)
                inst = await createInstance(desc, sys, 'open', constructorParams, __caller);
            else if (__caller && inst !== __caller)
                inst.parentRef = __caller.refId;

            CURRENT_SCREEN = inst;
            await showExclusive(sys, inst, true);

            return createRef(inst);

        }
        finally {

            __ms_loader_end(loaderToken);

        }
    },

    async inject(name, target, options = {}, maybeOptions = {}) {

        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        if (Array.isArray(name)) {
            return __ms_inject_bulk(Array.from(arguments), __caller);
        }

        const op = (async () => {
            if (MS_HALTED)
                throw MS_LAST_ERROR?.original || new Error("Engine halted");

            const {
                constructorParams,
                target: actualTarget,
                options: actualOptions
            } = normalizeInjectArgs(arguments);

            const container = resolveInjectTarget(actualTarget);

            if (!container)
                throw new Error('Inject target not found');

            const skipLoader = actualOptions?.__skipLoader === true;
            const loaderToken = skipLoader ? { type: 'none' } : __ms_loader_start(container, __caller);

            try {
                const desc = createDescriptorForCaller(name, __caller);
                await loadComponent(desc);
                restoreExecutionContext(__caller);
                enforceRuntimeAccess(__caller, desc, 'inject');

                const { append = false, top = false } = actualOptions || {};

                if (!append) {

                    let inst = findInstance(desc, container);
                    const visible = getVisibleInstancesToHide(container, inst);

                    if (!await canHideInstances(visible)) {
                        restoreExecutionContext(__caller);
                        return null;
                    }

                    if (!inst)
                        inst = await createInstance(desc, container, 'inject', constructorParams, __caller);
                    else if (__caller && inst !== __caller)
                        inst.parentRef = __caller.refId;

                    await showExclusive(container, inst, true);

                    restoreExecutionContext(__caller);
                    return createRef(inst);
                }

                const inst = await createInstance(desc, container, 'append', constructorParams, __caller);

                if (top && container.firstChild)
                    container.insertBefore(inst.host, container.firstChild);

                await callLifecycle(inst, 'onShow');

                restoreExecutionContext(__caller);
                return createRef(inst);
            }
            finally {
                __ms_loader_end(loaderToken);
            }
        })();

        return await trackInstanceTask(__caller, op);
    },

    async deleteType(containerTarget, componentType) {
        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        if (!componentType) {
            throw new Error('ms.deleteType: component type is required');
        }

        const container = __ms_delete_target(containerTarget);
        if (!container) {
            throw new Error('ms.deleteType: container not found');
        }

        const desc = createDescriptorForCaller(componentType, __caller);
        const matches = __ms_collect_instances_for_container(container)
            .filter(inst => __ms_instance_matches_type(inst, desc));

        return await trackInstanceTask(__caller, __ms_delete_instances(matches));
    },

    async deleteContainer(containerTarget, includeOthers = false) {
        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        const container = __ms_delete_target(containerTarget);
        if (!container) {
            throw new Error('ms.deleteContainer: container not found');
        }

        const result = await trackInstanceTask(
            __caller,
            __ms_delete_instances(__ms_collect_instances_for_container(container))
        );

        if (result.ok && includeOthers === true) {
            container.replaceChildren();
        }

        return result;
    },

    async deleteInstance(ref) {
        const __caller =
            currentExecutionInstance() ||
            activeInstance();

        const inst = __ms_instance_from_ref(ref);
        if (!inst) {
            throw new Error('ms.deleteInstance: component reference not found');
        }

        return await trackInstanceTask(__caller, __ms_delete_instances([inst]));
    },

    store: {


        async transaction(callback) {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.store.transaction outside component");

            if (STORE_TX_ACTIVE)
                throw new Error("Nested transactions not allowed");

            STORE_TX_ACTIVE = true;
            STORE_TX_OWNER = inst;
            STORE_TX_BUFFER.clear();
            STORE_TX_LOCK = true;

            try {

                const result = await withInstanceContext(inst, 'store.transaction', callback);

                for (const [path, value] of STORE_TX_BUFFER) {

                    GLOBAL_STORE.set(path, value);

                    const subs = STORE_SUBS.get(path);
                    if (subs) {
                        for (const { instance, fn } of subs) {
                            withInstanceContext(instance, 'store.transaction', fn, null, [value]);
                        }
                    }
                }

                STORE_TX_BUFFER.clear();
                STORE_TX_ACTIVE = false;
                STORE_TX_OWNER = null;
                STORE_TX_LOCK = false;

                return result;

            } catch (e) {

                STORE_TX_BUFFER.clear();
                STORE_TX_ACTIVE = false;
                STORE_TX_OWNER = null;
                STORE_TX_LOCK = false;

                throw e;
            }
        },


        set(path, value) {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.store.set outside component");

            const root = path.split('.')[0];

            if (STORE_OWNERS.get(root) !== inst.name) {

                const err = {
                    ok: false,
                    error: {
                        code: 'STORE_WRITE_DENIED',
                        message: `${inst.name} is not owner of ${root}.*`,
                        method: 'store.set',
                        line: null,
                        origin: inst.name,
                        triggeredFrom: null
                    }
                };

                __ms_halt_engine(err);
                return err;
            }

            if (STORE_TX_ACTIVE) {

                if (STORE_TX_OWNER !== inst) {
                    return {
                        ok: false,
                        error: {
                            code: 'STORE_TX_LOCKED',
                            message: 'Another transaction is active'
                        }
                    };
                }

                STORE_TX_BUFFER.set(path, value);
                return { ok: true, value };
            }

            GLOBAL_STORE.set(path, value);

            const subs = STORE_SUBS.get(path);
            if (subs) {
                for (const { instance, fn } of subs) {
                    withInstanceContext(instance, 'store.set', fn, null, [value]);
                }
            }

            return { ok: true, value };
        },

        get(path) {
            return GLOBAL_STORE.get(path);
        },

        on(path, fn) {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.store.on outside component");

            if (!STORE_SUBS.has(path))
                STORE_SUBS.set(path, new Set());

            STORE_SUBS.get(path).add({ instance: inst, fn });

            return { ok: true };
        },

        off(path, fn) {

            const subs = STORE_SUBS.get(path);
            if (!subs) return { ok: true };

            for (const item of subs) {
                if (item.fn === fn)
                    subs.delete(item);
            }

            return { ok: true };
        }

    },
    // end ms.store

    bus: {

        emit(event, payload) {

            if (!event) return;

            EVENT_LAST.set(event, payload);

            const subs = EVENT_BUS.get(event);
            if (!subs || subs.size === 0) return;

            for (const { instance, fn } of subs) {

                try {
                    withInstanceContext(instance, event, fn, null, [payload]);
                }
                catch (e) {
                    const err = __ms_build_error(e, instance.name, event);
                    __ms_halt_engine(err);
                }
            }
        },

        on(event, fn) {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.bus.on outside component");

            if (!EVENT_BUS.has(event))
                EVENT_BUS.set(event, new Set());

            EVENT_BUS.get(event).add({ instance: inst, fn });

            if (EVENT_LAST.has(event)) {
                withInstanceContext(inst, event, fn, null, [EVENT_LAST.get(event)]);
            }

            return { ok: true };
        },

        off(event, fn) {

            const subs = EVENT_BUS.get(event);
            if (!subs) return { ok: true };

            for (const item of subs) {
                if (item.fn === fn)
                    subs.delete(item);
            }

            return { ok: true };
        },

        once(event, fn) {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.bus.once outside component");

            const wrapper = (data) => {
                try {
                    fn(data);
                }
                finally {
                    this.off(event, wrapper);
                }
            };

            return this.on(event, wrapper);
        }

    },
    // end ms.bus

    ui: {

        listen(ref, fn) {

            if (!ref || !ref.ref)
                throw new Error("ms.ui.listen: invalid ref");

            if (typeof fn !== 'function')
                throw new Error("ms.ui.listen: fn must be function");

            const childRef = ref.ref;
            const child = INSTANCES.get(childRef);

            const parent =
                currentExecutionInstance() ||
                (child?.parentRef ? INSTANCES.get(child.parentRef) : null) ||
                CURRENT_SCREEN;
            if (!parent)
                throw new Error("ms.ui.listen: no active parent");

            if (!UI_LISTENERS.has(parent.refId))
                UI_LISTENERS.set(parent.refId, new Set());

            UI_LISTENERS.get(parent.refId).add({
                fn,
                sourceRef: childRef
            });

            if (EVENT_LAST.has(ref.ref)) {

                const inst = parent;

                withInstanceContext(inst, 'ui.listen', fn, null, [EVENT_LAST.get(ref.ref)]);
            }
            return { ok: true };
        },

        unlisten(ref, fn) {

            if (!ref || !ref.ref) return { ok: true };

            const child = INSTANCES.get(ref.ref);
            const parent =
                currentExecutionInstance() ||
                (child?.parentRef ? INSTANCES.get(child.parentRef) : null) ||
                CURRENT_SCREEN;
            if (!parent) return { ok: true };

            const set = UI_LISTENERS.get(parent.refId);
            if (!set) return { ok: true };

            for (const item of set) {
                if (item.fn === fn && item.sourceRef === ref.ref) {
                    set.delete(item);
                }
            }

            return { ok: true };
        },

        emit(e, data) {

            let child = null;

            const el = e?.target;

            if (el && el.getRootNode) {
                const root = el.getRootNode();
                if (root && root.host && root.host.__ms_instance) {
                    child = root.host.__ms_instance;
                }
            }

            if (!child) return;

            const parentRef = child.parentRef;
            if (!parentRef) return;

            const parent = INSTANCES.get(parentRef);
            if (!parent) return;

            const set = UI_LISTENERS.get(parent.refId);
            if (!set || set.size === 0) return;

            const listeners = Array.from(set);

            for (const item of listeners) {

                if (item.sourceRef !== child.refId)
                    continue;

                const meta = UI_FN_META.get(item.fn);
                const fn = meta?.wrapped || item.fn;

                withInstanceContext(parent, 'ui.emit', fn, null, [e, data]);
            }
        },

        listenOnce(ref, fn) {

            const wrapper = (e, data) => {

                const inst = currentExecutionInstance() || activeInstance() || CURRENT_SCREEN;

                try {
                    withInstanceContext(inst, 'ui.listenOnce', fn, null, [e, data]);
                }
                finally {
                    ms.ui.unlisten(ref, wrapper);
                }
            };

            return this.listen(ref, wrapper);
        },

        throttle(fn, delay = 50) {

            let last = 0;

            const wrapped = function (e, data) {
                const now = Date.now();
                if (now - last >= delay) {
                    last = now;
                    fn(e, data);
                }
            };

            UI_FN_META.set(fn, { wrapped });
            return { ok: true };
        },

        debounce(fn, delay = 200) {

            let timer = null;

            const wrapped = function (e, data) {

                clearTimeout(timer);

                timer = setTimeout(() => {
                    fn(e, data);
                }, delay);
            };

            UI_FN_META.set(fn, { wrapped });
            return { ok: true };
        }

    },

    popup(name) {
        return new MSPopup(name);
    },

    async dialog(options = {}) {

        const {
            message = "",
            buttons = ["OK"],
            title = "",
            icon = null,
            css = null
        } = options;

        if (buttons.length > 3) {
            buttons.length = 3;
        }

        const legacyDialogCss = MS_CONFIG.Dialog_CSS
            ? __ms_resolve_resource_url(MS_CONFIG.Dialog_CSS, MS_CONFIG_BASE_URL || location.href, 'css')
            : null;
        const cssUrl =
            css ||
            __ms_default_css_url_for('dialog') ||
            legacyDialogCss;
        if (cssUrl) {
            __ms_load_css(cssUrl);
        }

        const overlay = document.createElement('div');

        overlay.style.cssText = `
    position:fixed;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    background:rgba(0,0,0,0.4);
    z-index:2147483645;
  `;

        const box = document.createElement('div');

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const allowedIcons = ["critical", "cool", "warn", "info"];
        const iconClass = allowedIcons.includes(icon)
            ? `ms-dialog-${icon}`
            : '';

        box.innerHTML = `
    <div class="ms-dialog ${iconClass}">
      <div class="ms-dialog-header">
        <div class="ms-dialog-title">${title}</div>
        <div class="ms-dialog-icon"></div>
      </div>
      <div class="ms-dialog-message">
        ${message}
      </div>
      <div class="ms-dialog-actions">
        ${buttons.map((b, i) => `
          <button class="ms-dialog-btn" data-i="${i}">
            ${b}
          </button>
        `).join('')}
      </div>
    </div>
  `;

        return new Promise(resolve => {

            const close = (val) => {
                window.removeEventListener('keydown', escHandler);
                overlay.remove();
                resolve(val);
            };

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    close(buttons[buttons.length - 1]);
                }
            };

            window.addEventListener('keydown', escHandler);

            box.querySelectorAll('button').forEach(btn => {
                btn.onclick = () => {
                    const i = +btn.getAttribute('data-i');
                    close(buttons[i]);
                };
            });

        });

    },

    /* =========================================================
       14. DATABASE ENGINE (Worker OPFS)  ie- Calling db.mjs
       ========================================================= */

    db: {

        async init() {

            const inst = currentExecutionInstance() || activeInstance();
            if (!inst)
                throw new Error("ms.db.init outside component");

            const allowed = __ms_db_is_allowed(
                MS_CONFIG.DbWriteComponents,
                inst.name
            );

            if (!allowed)
                return {
                    ok: false,
                    error: {
                        code: 'DB_INIT_DENIED',
                        message: `${inst.name} not allowed to init DB`
                    }
                };

            const dbCore = await loadDbCoreOnce();
            const r = await dbCore.init();

            return r.success
                ? { ok: true }
                : { ok: false, error: r };
        },

        async exec(sql, params = []) {

            const inst = activeInstance();
            if (!inst)
                throw new Error("ms.db.exec outside component");

            const allowed = __ms_db_is_allowed(
                MS_CONFIG.DbWriteComponents,
                inst.name
            );

            if (!allowed)
                return {
                    ok: false,
                    error: {
                        code: 'DB_WRITE_DENIED',
                        message: `${inst.name} not allowed to write DB`
                    }
                };

            const dbCore = await loadDbCoreOnce();
            const r = await dbCore.exec(sql, params);
            return r;
        },

        async query(sql, params = []) {

            const inst = activeInstance();
            if (!inst)
                throw new Error("ms.db.query outside component");

            const allowed = __ms_db_is_allowed(
                MS_CONFIG.DbReadComponents,
                inst.name
            );

            if (!allowed)
                return {
                    ok: false,
                    error: {
                        code: 'DB_READ_DENIED',
                        message: `${inst.name} not allowed to read DB`
                    }
                };

            const dbCore = await loadDbCoreOnce();
            const r = await dbCore.query(sql, params);
            return r;
        },

        async transaction() {
            const dbCore = await loadDbCoreOnce();
            return dbCore.transaction();
        },
        async commit() {
            const dbCore = await loadDbCoreOnce();
            return dbCore.commit();
        },
        async rollback() {
            const dbCore = await loadDbCoreOnce();
            return dbCore.rollback();
        },

        async close() {
            const dbCore = await loadDbCoreOnce();
            return dbCore.close();
        }
    },

    insert(component, target, options) {

        if (!component) {
            throw new Error('ms.insert: invalid component');
        }

        let el = null;

        // normalize target
        if (typeof target === 'string') {
            const ref = ms.id(target);
            el = ref?.el || ref;
        }
        else if (target?.el) {
            el = target.el;
        }
        else if (target instanceof HTMLElement) {
            el = target;
        }

        if (!el) {
            throw new Error('ms.insert: target not found');
        }

        if (typeof component.mount === 'function') {
            let mountTarget = el;

            if (options && typeof options === 'object') {
                mountTarget = (el.ownerDocument || document).createElement('div');
                mountTarget.setAttribute('data-ms-insert-host', '');

                if (options.top === true) {
                    el.insertBefore(mountTarget, el.firstChild);
                } else {
                    el.appendChild(mountTarget);
                }
            }

            const root = el.getRootNode?.();
            const inst = root?.host?.__ms_instance || currentExecutionInstance() || activeInstance();
            const selected = inst?.security?.defaultCss;
            component.__msDefaultCssPolicy = Array.isArray(selected) ? [...selected] : selected;
            try {
                const result = withInstanceContext(
                    inst,
                    'insert',
                    () => component.mount.call(component, mountTarget)
                );

                if (result && typeof result.then === 'function') {
                    return result.catch(e => {
                        if (mountTarget !== el) {
                            mountTarget.remove();
                        }
                        throw e;
                    });
                }

                return result;
            } catch (e) {
                if (mountTarget !== el) {
                    mountTarget.remove();
                }

                throw e;
            }
        }

        throw new Error('ms.insert: component must support mount()');
    }

} // end of ms


let __MS_FORM_LOADING__ = null;

function findFormScript(src) {
    return [...document.scripts].find(script => {
        if (!script.src) return false;
        try {
            return new URL(script.src, location.href).href === src;
        } catch {
            return false;
        }
    }) || null;
}

async function loadFormScriptOnce() {
    if (__MS_FORM_RAW__) return __MS_FORM_RAW__;
    if (__MS_FORM_LOADING__) return __MS_FORM_LOADING__;

    __MS_FORM_LOADING__ = new Promise(async (resolve, reject) => {
        try {
            if (typeof __MS_CONFIG_READY__ !== 'undefined') {
                await __MS_CONFIG_READY__;
            }

            const src = new URL('./form.js', import.meta.url).href;
            let script = findFormScript(src);

            if (script?.__msFormLoadPromise) {
                script.__msFormLoadPromise.then(resolve, reject);
                return;
            }

            const finish = () => {
                if (window.ms && window.ms.form) {
                    __MS_FORM_RAW__ = window.ms.form;
                    resolve(__MS_FORM_RAW__);
                    return;
                }

                reject(__ms_runtime_dependency_error(
                    'form.js',
                    src,
                    'Loaded, but ms.form was not registered'
                ));
            };

            if (!script) {
                script = document.createElement('script');
                script.src = src;
                script.setAttribute('data-ms-form-script', '1');
            }

            script.__msFormLoadPromise = new Promise((scriptResolve, scriptReject) => {
                script.addEventListener('load', () => {
                    try {
                        finish();
                        scriptResolve(__MS_FORM_RAW__);
                    } catch (e) {
                        scriptReject(e);
                    }
                }, { once: true });

                script.addEventListener('error', () => {
                    scriptReject(__ms_runtime_dependency_error(
                        'form.js',
                        src,
                        'Script load failed'
                    ));
                }, { once: true });
            });

            script.__msFormLoadPromise.then(resolve, reject);

            if (!script.parentNode) {
                document.head.appendChild(script);
            }
        }
        catch (e) {
            reject(e);
        }
    }).catch(e => {
        __MS_FORM_LOADING__ = null;
        throw e;
    });

    return __MS_FORM_LOADING__;
}


globalThis.__MS_CREATE_SCOPED_MS__ = createScopedMS;
globalThis.__MS_CREATE_SCOPED_DOCUMENT__ = createScopedDocument;
globalThis.__MS_CREATE_SCOPED_WINDOW__ = createScopedWindow;
window.ms = ms;
export default ms;

const __MS_DB_READY__ = loadDbCoreOnce();

if (!window.__MS_ACTIVATION_LOGGED__) {
    window.__MS_ACTIVATION_LOGGED__ = true;
    console.info("MS activated", import.meta.url);
}

/* =========================================================
   13. AUTO BOOTSTRAP
   ========================================================= */


function __ms_bootstrap() {

    if (CURRENT_SCREEN) return;

    if (!document.body) {
        document.addEventListener('DOMContentLoaded', __ms_bootstrap, { once: true });
        return;
    }

    const sys = ensureSystemRoot();

    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    const nodes = [];

    for (const child of [...document.body.children]) {
        if (child !== sys) {
            nodes.push(child);
            document.body.removeChild(child);
        }
    }

    for (const n of nodes)
        shadow.appendChild(n);

    sys.appendChild(host);

    const file =
        location.pathname.split('/').pop() || 'index.html';

    const desc = createDescriptor(file);

    const tpl = document.createElement('template');
    const html = shadow.innerHTML;
    tpl.innerHTML = html;

    const policy = parsePublicPolicy(tpl);
    shadow.querySelectorAll('ms-public').forEach(n => n.remove());
    shadow.querySelectorAll('script').forEach(n => n.remove());

    const shouldManageModuleScripts = standaloneModuleNeedsMSCapture(tpl, policy);

    const instance = {
        refId: REF_SEQ++,
        name: desc.logical,
        publicName: desc.publicName || desc.logical,
        url: desc.url,
        mode: 'standalone',
        appendMode: false,
        host,
        root: shadow,
        container: sys,
        locals: {},
        lifecycle: {},
        didLoad: false,
        constructorParams: undefined,
        security: policy,
        pendingTasks: new Set(),
        nativeCleanups: new Set(),
        parentRef: null,
        suppressNativeModuleReady: shouldManageModuleScripts
    };

    host.__ms_instance = instance;
    host.setAttribute('data-ms-component-host', '');

    INSTANCES.set(instance.refId, instance);

    captureDeclarativeFallbackNodes(shadow);
    __ms_setup_input_controls(instance);
    observeThirdPartyRenderedOutput(instance);
    refreshThirdPartyRenderedOutput(shadow);

    CURRENT_SCREEN = instance;

    const defaultCssTask = (async () => {
        await __MS_CONFIG_READY__;
        await rewriteStandaloneStylesheetLinks(shadow, desc, html);
        await applyDefaultCSSLinks(shadow, policy);
    })().catch(e => {
        const err = __ms_build_error(e, instance.name, 'default-css');
        __ms_halt_engine(err);
        throw e;
    });

    trackDeclarativeComponentTask(defaultCssTask);

    const task = (async () => {
        try {
            await defaultCssTask;

            if (shouldManageModuleScripts) {
                const declarativeElements = [...instance.root.querySelectorAll(DECLARATIVE_COMPONENT_SELECTOR)]
                    .filter(el => !hasDeclarativeComponentAncestor(el, instance.root));
                await preloadDeclarativeComponents(declarativeElements, instance);

                const sourceHtml = await __ms_load_original_html_source(desc.url, html);

                await executeScripts(instance, tpl, desc, sourceHtml, {
                    onlyModuleScripts: true,
                    skipClassicScripts: true
                });
                refreshThirdPartyRenderedOutput(shadow);
            }

            await processDeclarativeComponents(instance);
            await callOnLoad(instance);
            await callLifecycle(instance, 'onShow');
        }
        finally {
            instance.suppressNativeModuleReady = false;
        }
    })().catch(e => {
        const err = __ms_build_error(e, instance.name, 'standalone');
        __ms_halt_engine(err);
        throw e;
    });

    trackDeclarativeComponentTask(task);
}

__ms_bootstrap();

__ms_ready_resolve();


/* =======================
   EXPORT TO ms
   ======================= */

/* =========================================================
   LAZY LOAD: ms.form   <<< INSERT HERE
   ========================================================= */

(function () {
    function createStub(method) {
        return async function (...args) {

            const inst = activeInstance();

            if (!__MS_FORM_RAW__) {
                await loadFormScriptOnce();
            }

            const fn = __MS_FORM_RAW__?.[method];

            if (typeof fn !== 'function') {
                throw new Error(`ms.form.${method} not found`);
            }

            return await withInstanceContext(inst, `form.${method}`, () => fn(...args));
        };
    }

    ms.form = {
        autoFill: createStub('autoFill'),
        autoUpdate: createStub('autoUpdate'),
        combo: createStub('combo'),
        grid: createStub('grid'),
        section: createStub('section'),
        input: createStub('input'),
        checkbox: createStub('checkbox'),
        radio: createStub('radio'),
        button: createStub('button'),
        buttons: createStub('buttons'),
        image: createStub('image')
    };

})();
