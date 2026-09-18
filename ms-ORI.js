//# sourceURL=ms.js
/* =========================================================
   MS90-HYBRID-STABLE (CORE EDITION)
   Based on NEW MS90 + MS90 DOM Stability
   ========================================================= */

/* =========================================================
   1. CORE STATE
   ========================================================= */

import dbCore from './db.mjs';

const COMPONENT_CACHE = new Map();
// patch: prevent duplicate parallel injects
const INJECT_INFLIGHT = new Map();

// patch: prevent duplicate component downloads
const COMPONENT_LOADING = new Map();

const INSTANCES = new Map();
let REF_SEQ = 1;

let SYSTEM_ROOT = null;
let CURRENT_SCREEN = null;

let MS_HALTED = false;
let MS_LAST_ERROR = null;
let MS_ERROR_MODAL = null;

const ENG_DEBUG = false;

// patch: 25
class __MS_STOP_EXECUTION__ extends Error {}
// patch: 25 STOP SIGNAL

// patch: 17
const GLOBAL_STORE = new Map();          // path → value
const STORE_SUBS = new Map();            // path → Set<{instance, fn}>
const STORE_OWNERS = new Map();          // root → componentName

let STORE_TX_ACTIVE = false;      // is a transaction running
let STORE_TX_OWNER = null;        // instance that owns it
let STORE_TX_BUFFER = new Map();  // path -> value
let STORE_TX_LOCK = false;        // global write lock
//

// patch: PRELOAD SUPPORT
const PRELOAD_CACHE = new Set();      // already preloaded
const PRELOAD_PROMISES = new Map();   // prevent duplicate fetch

// patch: PRELOAD QUEUE
const PRELOAD_QUEUE = [];
let PRELOAD_RUNNING = false;

const IMAGE_PRELOAD_CACHE = new Map();

// patch: GLOBAL LOADER STATE
let MS_LOADING_COUNT = 0;
let MS_GLOBAL_LOADER = null;
let MS_LOADER_TIMER = null;

// patch: SCRIPT MODULE CACHE
const SCRIPT_MODULE_CACHE = new Map();

/* =========================================================
   2. EXECUTION CONTEXT (HYBRID)
   ========================================================= */

const EXEC_STACK = [];

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
  DbWriteComponents: ["*"]
};

(async function () {
  try {
    const r = await fetch('GlobalConfig.json', { cache: 'no-cache' });
    if (r.ok)
      MS_CONFIG = { ...MS_CONFIG, ...(await r.json()) };
  } catch {}
})();

/* =========================================================
   4. READY
   ========================================================= */

let __ms_ready_resolve;
const __ms_ready = new Promise(r => __ms_ready_resolve = r);

/* =========================================================
   5. ERROR SYSTEM
   ========================================================= */

// Patch: 1
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
      frames.push({
        raw: l.trim(),
        fn: m[1],
        file: m[2],
        line: parseInt(m[3], 10)
      });
    }
    else {
      frames.push({
        raw: l.trim(),
        fn: null,
        file: m[1],
        line: parseInt(m[2], 10)
      });
    }
  }

  return frames;
}

// patch: 11
function __ms_build_error(originalError, comp, method) {

  const frames = __ms_extract_frames(originalError);

  let primaryFrame = null;
  let triggerFrame = null;

  for (let f of frames) {
    if (f.file && f.file.includes('ms.js'))
      continue;
    if (!primaryFrame) { primaryFrame=f; continue; }
    if (!triggerFrame) { triggerFrame=f; break; }
  }

  const callerName = originalError.__msCallerComponent;

  return {
      error:{
      code:'METHOD_EXCEPTION',
      message:originalError.message,
      method:method||null,
      line:primaryFrame?.line||null,
      origin:comp||null,
      triggeredFrom: (callerName || triggerFrame)
        ? {
            file: callerName
              ? callerName + '.html'
              : triggerFrame.file,
            fn:triggerFrame?.fn||null,
            line:triggerFrame?.line||null
          }
        : null
    },
    original: ENG_DEBUG ? originalError : null
  };
}
// patch: 11 __ms_build_error

function __ms_format_file(file, origin) {

  if (!file) return '-';

  if (file.startsWith('blob:'))
    return origin ? origin + '.html' : '-';

  return file.split('/').pop();
}

function __ms_halt_engine(errObj) {

  if (MS_HALTED) return;

  MS_HALTED = true;
  MS_LAST_ERROR = errObj;

  const e = errObj.error;

  let stack = '';
  if (ENG_DEBUG)
    stack = errObj.original?.stack || new Error().stack || '';

  if (MS_CONFIG.ErrorConsole) {

    let out =
      `Message: ${e.message}\n` +
      `Origin: ${e.origin||'-'} , ${e.method||'-'} , Line ${e.line||'-'}\n`;

    if (e.triggeredFrom)
      out +=
        `Triggered From: ${__ms_format_file(e.triggeredFrom.file, e.origin)} , ` +
        `${e.triggeredFrom.fn||'-'} , Line ${e.triggeredFrom.line}\n`;

    if (ENG_DEBUG && stack)
      out += `\nStack:\n${stack}`;

    console.error(out);
  }

  if (MS_CONFIG.ErrorPopup !== false)
    __ms_show_error_popup(errObj, stack);

  if (MS_CONFIG.ErrorServerURL)
    fetch(MS_CONFIG.ErrorServerURL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(errObj)
    }).catch(()=>{});
}

function __ms_show_error_popup(errObj, stack) {

  if (MS_ERROR_MODAL) return;

  const e = errObj.error;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;" +
    "align-items:center;justify-content:center;z-index:2147483647;";

  const box = document.createElement('div');
  box.style.cssText =
    "background:#fff;padding:20px;min-width:420px;border-radius:6px;font-family:Arial;";

  box.innerHTML =
    `<b>${MS_CONFIG.ErrorWarning}</b><br><br>` +
    `Message: ${e.message}<br><br>` +
    `Origin: ${e.origin||'-'} , ${e.method||'-'} , Line ${e.line||'-'}<br>` +
 (e.triggeredFrom
  ? `Triggered From: ${__ms_format_file(e.triggeredFrom.file, e.origin)} , ${e.triggeredFrom.fn||'-'} , Line ${e.triggeredFrom.line}<br>`
  : '') +
    (ENG_DEBUG && stack
      ? `<br><pre style="white-space:pre-wrap">${stack}</pre>`
      : '') +
    `<br><button id="__ms_err_ok">OK</button>`;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector('#__ms_err_ok').onclick = ()=> ms.ErrorClose();
  MS_ERROR_MODAL = overlay;
}

// patch: 36 GLOBAL FATAL ERROR GUARD (STRICT)

function __ms_global_fatal_handler(rawError){

  if (MS_HALTED) return;

  const err =
    rawError instanceof Error
      ? rawError
      : new Error(String(rawError));

  // 🔴 IGNORE CONTROL STOP SIGNAL
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

window.addEventListener('error', function(event){

  if (event.error instanceof __MS_STOP_EXECUTION__) {
      event.preventDefault();   // suppress browser uncaught log
      return;
  }

  __ms_global_fatal_handler(event.error || event.message);
});

window.addEventListener('unhandledrejection', function(event){

  if (event.reason instanceof __MS_STOP_EXECUTION__) {
      event.preventDefault();
      return;
  }

  __ms_global_fatal_handler(event.reason);
});

// patch: 36 END

/* =========================================================
   6. COMPONENT LOADING
   ========================================================= */

function createDescriptor(name){
  const logical=name.replace(/\.html$/i,'');
  return {
    logical,
    file:logical+'.html',
    url:new URL(logical+'.html',location.href).href
  };
}

function ensureSystemRoot(){
  if (!SYSTEM_ROOT){
    SYSTEM_ROOT=document.createElement('div');
    SYSTEM_ROOT.id='__ms_screen_root';
    document.body.appendChild(SYSTEM_ROOT);
  }
  return SYSTEM_ROOT;
}

async function loadComponent(desc){

  // 1️⃣ Already cached
  if (COMPONENT_CACHE.has(desc.logical))
      return COMPONENT_CACHE.get(desc.logical);

  // 2️⃣ Already loading (reuse same Promise)
  if (PRELOAD_PROMISES.has(desc.logical))
      return PRELOAD_PROMISES.get(desc.logical);

  // 3️⃣ Start loading
  const p = (async()=>{

      try{

          const r = await fetch(desc.file,{cache:'no-cache'});

          if(!r.ok)
              throw new Error(`Failed to load ${desc.file}`);

          const html = await r.text();

          // cache component
          COMPONENT_CACHE.set(desc.logical,html);

          // preload images if enabled
          if (typeof __ms_preload_images === 'function')
              __ms_preload_images(html, desc.url);

          return html;

      }
      finally{

          // always cleanup in-flight registry
          PRELOAD_PROMISES.delete(desc.logical);

      }

  })();

  // register in-flight load
  PRELOAD_PROMISES.set(desc.logical,p);

  return p;
}

function rewriteImports(code, baseUrl) {

  code = code.replace(
    /from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_, q, rel) => {
      const abs = new URL(rel, baseUrl).href;
      return `from ${q}${abs}${q}`;
    }
  );

  code = code.replace(
    /import\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_, q, rel) => {
      const abs = new URL(rel, baseUrl).href;
      return `import ${q}${abs}${q}`;
    }
  );

  return code;
}

// patch: HTML IMAGE DETECTION
// patch: ADVANCED IMAGE DETECTION
function __ms_preload_images(html, baseUrl){

  const urls = new Set();

  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  const root = tpl.content;

  /* -----------------------------------------
     IMG SRC
  ----------------------------------------- */

  root.querySelectorAll("img[src]").forEach(el=>{
      urls.add(el.getAttribute("src"));
  });

  /* -----------------------------------------
     SRCSET
  ----------------------------------------- */

  root.querySelectorAll("[srcset]").forEach(el=>{

      const parts = el.getAttribute("srcset").split(",");

      parts.forEach(p=>{
          const url = p.trim().split(/\s+/)[0];
          if (url) urls.add(url);
      });
  });

  /* -----------------------------------------
     INLINE STYLE BACKGROUND IMAGES
  ----------------------------------------- */

  root.querySelectorAll("[style]").forEach(el=>{

      const style = el.getAttribute("style");

      const regex = /url\(["']?([^"')]+)["']?\)/g;

      let m;

      while((m = regex.exec(style)) !== null)
          urls.add(m[1]);

  });

  /* -----------------------------------------
     PREFETCH IMAGES
  ----------------------------------------- */

  urls.forEach(src=>{

      try{

          const url = new URL(src, baseUrl).href;

          if (IMAGE_PRELOAD_CACHE.has(url))
              return;

          const img = new Image();

          IMAGE_PRELOAD_CACHE.set(url, img);

          img.decoding = "async";
          img.src = url;

          img.onload = ()=> IMAGE_PRELOAD_CACHE.set(url, true);
          img.onerror = ()=> IMAGE_PRELOAD_CACHE.delete(url);

      }catch{}

  });

}

/* =========================================================
   7. PUBLIC POLICY
   ========================================================= */

// patch: 18
function parsePublicPolicy(tpl) {

  const tag = tpl.content.querySelector('ms-public');

  const base = {
    functions:{mode:'all',list:null},
    classes:{mode:'all',list:null},
    storeRoots:[]
  };

  if (!tag) return base;

  const parse = (name)=>{
    const el = tag.querySelector(name);
    if (!el) return {mode:'all',list:null};

    const txt = el.textContent.trim();
    if (txt==='*') return {mode:'all',list:null};
    if (txt==='')  return {mode:'none',list:new Set()};

    return {
      mode:'list',
      list:new Set(
        txt.split(',').map(x=>x.trim()).filter(Boolean)
      )
    };
  };

  // parse store ownership
  const storeTag = tag.querySelector('store');
  if (storeTag) {
    const roots = storeTag.textContent
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean)
      .map(x=>x.replace(/\.\*$/,''));

    base.storeRoots = roots;
  }

  return {
    functions:parse('functions'),
    classes:parse('classes'),
    storeRoots:base.storeRoots
  };
}
// patch: 18 parsePublicPolicy

/* =========================================================
   8. INSTANCE CREATION
   ========================================================= */


// patch: 27
async function executeScripts(instance, tpl, desc, html){

  const regex = /<script\b[^>]*>/gi;
  const matches = [...html.matchAll(regex)];

  const scripts = tpl.content.querySelectorAll('script');

  for (let i=0;i<scripts.length;i++){

    const s = scripts[i];

    if (s.type && s.type !== 'module') continue;

    let code = s.src
      ? await (await fetch(s.src,{cache:'no-cache'})).text()
      : s.textContent;

    let prefix = 0;

    if (matches[i]){
      const start = matches[i].index;
      prefix = html.substring(0,start).split('\n').length-1;
    }

    code = '\n'.repeat(prefix) + code;
    code = rewriteImports(code, desc.url);

    let mod;

    EXEC_STACK.push(instance);

    try{

      // 🔵 MODULE CACHE
      if (SCRIPT_MODULE_CACHE.has(code)){

        mod = SCRIPT_MODULE_CACHE.get(code);

      }else{

        const blob = URL.createObjectURL(
          new Blob([code],{type:'text/javascript'})
        );

        mod = await import(blob);

        SCRIPT_MODULE_CACHE.set(code, mod);

        URL.revokeObjectURL(blob);
      }

      Object.assign(instance.locals, mod);

    }
    catch(e){

      // 🔴 CONTROL STOP SIGNAL (NOT AN ERROR)
      if (e instanceof __MS_STOP_EXECUTION__) {
        throw e;
      }

      const err = __ms_build_error(e,instance.name,null);
      __ms_halt_engine(err);
      throw e;
    }
    finally{

      if (EXEC_STACK.length &&
          EXEC_STACK[EXEC_STACK.length-1] === instance)
        EXEC_STACK.pop();

    }

  }
}
// patch: 27 executeScripts STOP SUPPORT

async function createInstance(desc, container, mode){

  const html = await loadComponent(desc);

  const host = document.createElement('div');
  const root = host.attachShadow({mode:'open'});

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  const policy = parsePublicPolicy(tpl);
  tpl.content.querySelectorAll('ms-public').forEach(n=>n.remove());

  const instance = {
    refId: REF_SEQ++,
    name: desc.logical,
    host,
    root,
    container,
    locals:{},
    security:policy
  };

  INSTANCES.set(instance.refId,instance);

const frag = document.createDocumentFragment();

for (const n of tpl.content.childNodes){
  if (n.nodeName !== 'SCRIPT')
    frag.appendChild(n.cloneNode(true));
}

root.appendChild(frag);

  container.appendChild(host);

// patch for error sys
try{
    await executeScripts(instance,tpl,desc,html);
}
catch(e){

   if (e instanceof __MS_STOP_EXECUTION__) {

       // 🔴 REMOVE PARTIALLY INITIALIZED INSTANCE
      __ms_destroy_instance(instance);

       throw e;
   }

   const err = __ms_build_error(e,instance.name,null);
   __ms_halt_engine(err);

   // 🔴 ALSO REMOVE BROKEN INSTANCE
   __ms_destroy_instance(instance);

   throw e;
}
///

  // patch: 19
// register store ownership
if (policy.storeRoots?.length) {

  for (const root of policy.storeRoots) {

    if (STORE_OWNERS.has(root)) {

      const err = {
        ok:false,
        error:{
          code:'STORE_NAMESPACE_CONFLICT',
          message:`Namespace ${root} already owned by ${STORE_OWNERS.get(root)}`,
          method:null,
          line:null,
          origin:instance.name,
          triggeredFrom:null
        }
      };

      __ms_halt_engine(err);
      throw err;
    }

    STORE_OWNERS.set(root, instance.name);
  }
}
// patch: 19 STORE OWNERSHIP REGISTRATION

  return instance;
}

/* =========================================================
   9. EXECUTION SURFACE
   ========================================================= */

// patch: 24
function buildExecutionSurface(instance){

  const surface={};
  const policy=instance.security;

  const allowed=(name,type)=>{
    const r=policy[type];
    if (!r) return true;
    if (r.mode==='all') return true;
    if (r.mode==='none') return false;
    return r.list.has(name);
  };

  const deny=(name)=>{
    const err={
        error:{
        code:'ACCESS_DENIED',
        message:`Access denied: ${name}`,
        method:name,
        line:null,
        origin:instance.name,
        triggeredFrom:null
      }
    };
    __ms_halt_engine(err);
    return err;
  };

  for (const [k,v] of Object.entries(instance.locals)){

    /* ===== CLASS WRAP ===== */
    if (typeof v==='function' &&
        /^class\s/.test(Function.prototype.toString.call(v))){

      if (!allowed(k,'classes')){
        surface[k]=new Proxy(function(){},{
          construct(){ return deny(k); }
        });
        continue;
      }

      surface[k]=new Proxy(v,{
        construct(Target,args){

          const real=new Target(...args);

          return new Proxy(real,{
            get(t,prop){

              const val=t[prop];

              if (typeof val==='function'){
                return async(...a)=>{
                 if (MS_HALTED)
    throw MS_LAST_ERROR?.original || new Error("Engine halted");
                  EXEC_STACK.push(instance);
                  try{
                    const r=await val.apply(t,a);
                    return r;
                  }catch(e){
   const err=__ms_build_error(e,instance.name,prop);
   __ms_halt_engine(err);
   throw e;   // 🔴 critical
}finally{
                    EXEC_STACK.pop();
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
    if (typeof v==='function'){

      if (!allowed(k,'functions')){
        surface[k]=async()=>deny(k);
        continue;
      }

      surface[k]=async(...args)=>{
      if (MS_HALTED)
    throw MS_LAST_ERROR?.original || new Error("Engine halted");
        EXEC_STACK.push(instance);
        try{
          const r=await v(...args);
          return r;
        }catch(e){
   const err=__ms_build_error(e,instance.name,k);
   __ms_halt_engine(err);
   throw e;   // 🔴 critical
}finally{
          EXEC_STACK.pop();
        }
      };

      continue;
    }

    surface[k]=v;
  }

  return surface;
}
// patch: 24 buildExecutionSurface

class MSDomRef {   // UNIVERSAL

  constructor(el){
    this.el = el;

    return new Proxy(this, {

      get(target, prop, receiver){

        // If property belongs to MSDomRef itself
        if (Reflect.has(target, prop))
          return Reflect.get(target, prop, receiver);

        const value = target.el[prop];

        // If it's a function → bind to element
        if (typeof value === "function")
          return value.bind(target.el);

        return value;
      },

      set(target, prop, value, receiver){

        // If setting internal property
        if (Reflect.has(target, prop))
          return Reflect.set(target, prop, value, receiver);

        target.el[prop] = value;
        return true;
      }

    });
  }
}
// End MSDomRef

/* =========================================================
   10. REF OBJECT
   ========================================================= */

function createRef(instance){

  const surface=buildExecutionSurface(instance);

  const base={
    ref:instance.refId,
    component:instance.name,
    ...surface
};

  return new Proxy(base,{
    get(t,p){

      if (p in t) return t[p];

      const el =
        instance.root.querySelector('#'+p) ||
        instance.root.querySelector(p);

      if (el) return new MSDomRef(el);

      return undefined;
    }
  });
}

/* =========================================================
   11. LOOKUPS
   ========================================================= */

function findInstance(desc,container){
  for (const inst of INSTANCES.values()){
    if (inst.name===desc.logical &&
        inst.container===container)
      return inst;
  }
  return null;
}

function resolveInjectTarget(target){

  if (target instanceof HTMLElement)
    return target;

  if (target?.el) return target.el;

  if (typeof target!=='string')
    return null;

  const search=(root)=>
    root.querySelector('#'+target) ||
    root.querySelector(target);

  const active=activeInstance();
  if (active){
    const el=search(active.root);
    if (el) return el;
  }

  for (const inst of INSTANCES.values()){
    const el=search(inst.root);
    if (el) return el;
  }

  return document.querySelector('#'+target) ||
         document.querySelector(target);
}

function showExclusive(container,except){
  for (const inst of INSTANCES.values()){
    if (inst.container===container)
      inst.host.style.display=
        inst===except?'':'none';
  }
}

// patch: 21  - need if deleted..
function __ms_cleanup_store_subs(instance){

  for (const subs of STORE_SUBS.values()){
    for (const item of [...subs]){
      if (item.instance === instance)
        subs.delete(item);
    }
  }
}

function __ms_destroy_instance(instance){

  if (!instance) return;

  __ms_cleanup_store_subs(instance);

  if (instance.host)
    instance.host.remove();

  INSTANCES.delete(instance.refId);
}

// patch: GLOBAL LOADER ENGINE

function __ms_loader_start(){

  MS_LOADING_COUNT++;

  // already scheduled or visible
  if (MS_GLOBAL_LOADER || MS_LOADER_TIMER)
      return;

  // delay prevents flicker
  MS_LOADER_TIMER = setTimeout(()=>{

      if (MS_LOADING_COUNT === 0){
          MS_LOADER_TIMER = null;
          return;
      }

      const overlay = document.createElement("div");

      overlay.style.cssText =
        "position:fixed;" +
        "inset:0;" +
        "background:rgba(255,255,255,0.6);" +
        "backdrop-filter:blur(2px);" +
        "display:flex;" +
        "align-items:center;" +
        "justify-content:center;" +
        "z-index:2147483646;";

      const spinner = document.createElement("div");

      spinner.style.cssText =
        "width:28px;height:28px;" +
        "border:3px solid #ccc;" +
        "border-top-color:#333;" +
        "border-radius:50%;" +
        "animation:ms-spin 0.8s linear infinite;";

      overlay.appendChild(spinner);

      if (!document.getElementById("__ms_spin_style")){

          const style = document.createElement("style");
          style.id="__ms_spin_style";

          style.textContent =
            "@keyframes ms-spin{" +
            "0%{transform:rotate(0deg)}" +
            "100%{transform:rotate(360deg)}" +
            "}";

          document.head.appendChild(style);
      }

      document.body.appendChild(overlay);

      MS_GLOBAL_LOADER = overlay;
      MS_LOADER_TIMER = null;

  },80); // anti-flicker delay
}


function __ms_loader_end(){

  if (MS_LOADING_COUNT > 0)
      MS_LOADING_COUNT--;

  if (MS_LOADING_COUNT !== 0)
      return;

  // cancel delayed loader
  if (MS_LOADER_TIMER){
      clearTimeout(MS_LOADER_TIMER);
      MS_LOADER_TIMER = null;
  }

  if (MS_GLOBAL_LOADER){

      MS_GLOBAL_LOADER.remove();
      MS_GLOBAL_LOADER = null;

  }
}

// patch: 32
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
        rule.replace('./','').replace(/\/$/,'')
      );
    }

    return false;
  });
}
// patch: 32 __ms_db_is_allowed


/* =========================================================
   12. PUBLIC API
   ========================================================= */

export const ms={

  ready(){ return __ms_ready; },

  // patch: 26
async stop(){
  throw new __MS_STOP_EXECUTION__();
},
// patch: 26 ms.stop

  ErrorClose(){
    if (MS_ERROR_MODAL){
      MS_ERROR_MODAL.remove();
      MS_ERROR_MODAL=null;
    }
    MS_HALTED=false;
  },

  id(id){

    const active=activeInstance();

    if (active){
      const el=active.root.querySelector('#'+id);
      if (el) return new MSDomRef(el);
    }

    for (const inst of INSTANCES.values()){
      const el=inst.root.querySelector('#'+id);
      if (el){
        CURRENT_SCREEN=inst;
        return new MSDomRef(el);
      }
    }

    throw new Error(`Element not found: ${id}`);
  },

  q(sel){
    const inst=activeInstance();
    if (!inst) throw new Error("ms.q outside component");
    const el=inst.root.querySelector(sel);
    return el?new MSDomRef(el):null;
  },

  qa(sel){
    const inst=activeInstance();
    if (!inst) throw new Error("ms.qa outside component");
    return [...inst.root.querySelectorAll(sel)]
      .map(e=>new MSDomRef(e));
  },

  // patch: PRELOAD API
async preload(...names){

  const run = async () => {

      const tasks = [];

      for(const name of names){

          if (PRELOAD_CACHE.has(name))
              continue;

          PRELOAD_CACHE.add(name);

          const desc = createDescriptor(name);

          tasks.push(loadComponent(desc));
      }

      return Promise.all(tasks);
  };

  if ('requestIdleCallback' in window){

      return new Promise(resolve=>{
          requestIdleCallback(()=>{
              run().then(resolve);
          });
      });

  }else{

      return new Promise(resolve=>{
          setTimeout(()=>{
              run().then(resolve);
          },0);
      });

  }
},

preloadQueue(...names){

  PRELOAD_QUEUE.push(...names);

  if (PRELOAD_RUNNING)
      return;

  PRELOAD_RUNNING = true;

  const run = () => {

    if (!PRELOAD_QUEUE.length){
        PRELOAD_RUNNING = false;
        return;
    }

    const batch = PRELOAD_QUEUE.splice(0,3);   // load 3 per idle cycle

    batch.forEach(name=>{
        ms.preload(name);
    });

if (PRELOAD_QUEUE.length){

    if ('requestIdleCallback' in window)
        requestIdleCallback(run);
    else
        setTimeout(run,50);

}
else{
    PRELOAD_RUNNING = false;
}
  };

  run();
},

async open(name){

  if (MS_HALTED)
    throw MS_LAST_ERROR?.original || new Error("Engine halted");

  __ms_loader_start();

  try{

    const desc=createDescriptor(name);
    const sys=ensureSystemRoot();

    let inst=findInstance(desc,sys);

    if (!inst)
      inst=await createInstance(desc,sys,'open');

    showExclusive(sys,inst);
    CURRENT_SCREEN=inst;

    return createRef(inst);

  }
  finally{

    __ms_loader_end();

  }
},

async inject(name,target,options={}){

  if (MS_HALTED) return MS_LAST_ERROR;

  const desc = createDescriptor(name);
  const container = resolveInjectTarget(target);

  if (!container)
      throw new Error('Inject target not found');

  const {append=false,top=false} = options;

  // unique key for container + component
  const key = desc.logical + "::" + (container.id || container);

  // guard only when append=false
  if (!append && INJECT_INFLIGHT.has(key))
      return INJECT_INFLIGHT.get(key);

__ms_loader_start();
const task = (async()=>{

      try{

          if (!append){

              let inst = findInstance(desc,container);

              if (!inst)
                  inst = await createInstance(desc,container,'inject');

              showExclusive(container,inst);

              return createRef(inst);
          }

          // append mode (multiple instances allowed)
          const inst = await createInstance(desc,container,'append');

          if (top && container.firstChild)
              container.insertBefore(inst.host,container.firstChild);

          return createRef(inst);

      }
      finally{

          if (!append)
              INJECT_INFLIGHT.delete(key);

      }

 })().finally(()=>{
   __ms_loader_end();
});

  if (!append)
      INJECT_INFLIGHT.set(key,task);

  return task;
},

// patch: SMART PARALLEL MULTI INJECT
async injectMany(...items){

  __ms_loader_start();

  if (items.length === 1 && Array.isArray(items[0]))
      items = items[0];

  const names = items.map(i => i[0]);

  // STEP 1 — preload all components first
  await this.preload(...names);

  // STEP 2 — inject from cache (very fast)
  const tasks = items.map(item => {

      if (!Array.isArray(item) || item.length < 2)
          throw new Error("injectMany item must be [component,target,options?]");

      const [name, target, options] = item;

      return this.inject(name, target, options || {});
  });

  return Promise.all(tasks)
  .finally(()=>__ms_loader_end());
},

  // patch: 20
store: {

// patch: 34 STORE TRANSACTION

async transaction(callback){

  const inst = activeInstance();
  if (!inst)
    throw new Error("ms.store.transaction outside component");

  if (STORE_TX_ACTIVE)
    throw new Error("Nested transactions not allowed");

  STORE_TX_ACTIVE = true;
  STORE_TX_OWNER = inst;
  STORE_TX_BUFFER.clear();
  STORE_TX_LOCK = true;

  try{

    const result = await callback();

    // COMMIT
    for (const [path,value] of STORE_TX_BUFFER){

      GLOBAL_STORE.set(path,value);

      const subs = STORE_SUBS.get(path);
      if (subs){
        for (const {instance, fn} of subs){
          try{
            EXEC_STACK.push(instance);
            fn(value);
          }finally{
            EXEC_STACK.pop();
          }
        }
      }
    }

    STORE_TX_BUFFER.clear();
    STORE_TX_ACTIVE = false;
    STORE_TX_OWNER = null;
    STORE_TX_LOCK = false;

    return result;

  } catch(e){

    // ROLLBACK
    STORE_TX_BUFFER.clear();
    STORE_TX_ACTIVE = false;
    STORE_TX_OWNER = null;
    STORE_TX_LOCK = false;

    throw e;   // 🔴 DO NOT RETURN
  }
},

// patch: 34 MODIFY store.set

set(path, value){

  const inst = activeInstance();
  if (!inst)
    throw new Error("ms.store.set outside component");

  const root = path.split('.')[0];

  if (STORE_OWNERS.get(root) !== inst.name){

    const err = {
      ok:false,
      error:{
        code:'STORE_WRITE_DENIED',
        message:`${inst.name} is not owner of ${root}.*`,
        method:'store.set',
        line:null,
        origin:inst.name,
        triggeredFrom:null
      }
    };

    __ms_halt_engine(err);
    return err;
  }

  // 🔴 TRANSACTION MODE
  if (STORE_TX_ACTIVE) {

    if (STORE_TX_OWNER !== inst) {
      return {
        ok:false,
        error:{
          code:'STORE_TX_LOCKED',
          message:'Another transaction is active'
        }
      };
    }

    STORE_TX_BUFFER.set(path, value);
    return {ok:true, value};
  }

  // 🔴 NORMAL MODE
  GLOBAL_STORE.set(path, value);

  const subs = STORE_SUBS.get(path);
  if (subs){
    for (const {instance, fn} of subs){
      try{
        EXEC_STACK.push(instance);
        fn(value);
      }finally{
        EXEC_STACK.pop();
      }
    }
  }

  return {ok:true,value};
},

  get(path){
    return GLOBAL_STORE.get(path);
  },

  on(path, fn){

    const inst = activeInstance();
    if (!inst)
      throw new Error("ms.store.on outside component");

    if (!STORE_SUBS.has(path))
      STORE_SUBS.set(path,new Set());

    STORE_SUBS.get(path).add({instance:inst, fn});

    return {ok:true};
  },

  off(path, fn){

    const subs = STORE_SUBS.get(path);
    if (!subs) return {ok:true};

    for (const item of subs){
      if (item.fn === fn)
        subs.delete(item);
    }

    return {ok:true};
  }

},
// end patch: 20 ms.store

/* =========================================================
   14. DATABASE ENGINE (Worker OPFS)  ie- Calling db.mjs
   ========================================================= */

// patch: 33
db: {

  async init() {

    const inst = activeInstance();
    if (!inst)
      throw new Error("ms.db.init outside component");

    const allowed = __ms_db_is_allowed(
      MS_CONFIG.DbWriteComponents,
      inst.name
    );

    if (!allowed)
      return {
        ok:false,
        error:{
          code:'DB_INIT_DENIED',
          message:`${inst.name} not allowed to init DB`
        }
      };

    const r = await dbCore.init();

    return r.success
      ? { ok:true }
      : { ok:false, error:r };
  },

  async exec(sql, params=[]) {

    const inst = activeInstance();
    if (!inst)
      throw new Error("ms.db.exec outside component");

    const allowed = __ms_db_is_allowed(
      MS_CONFIG.DbWriteComponents,
      inst.name
    );

    if (!allowed)
      return {
        ok:false,
        error:{
          code:'DB_WRITE_DENIED',
          message:`${inst.name} not allowed to write DB`
        }
      };

    const r = await dbCore.exec(sql, params);
    return r;
    //return r.success
    //  ? { ok:true, value:r.result }
    //  : { ok:false, error:r };
  },

  async query(sql, params=[]) {

    const inst = activeInstance();
    if (!inst)
      throw new Error("ms.db.query outside component");

    const allowed = __ms_db_is_allowed(
      MS_CONFIG.DbReadComponents,
      inst.name
    );

    if (!allowed)
      return {
        ok:false,
        error:{
          code:'DB_READ_DENIED',
          message:`${inst.name} not allowed to read DB`
        }
      };

    const r = await dbCore.query(sql, params);
    return r;
    //return r.success
    //  ? { ok:true, value:r.data }
    //  : { ok:false, error:r };
  },

  async transaction() {
    return dbCore.transaction();
  },
  async commit() {
    return dbCore.commit();
  },
  async rollback() {
    return dbCore.rollback();
  },
  
  async close() {
    return dbCore.close();
  }
} // patch: 33 db:

} // of ms


window.ms=ms;
export default ms;

/* =========================================================
   13. AUTO BOOTSTRAP
   ========================================================= */

// patch: 22
document.addEventListener("DOMContentLoaded", function(){

  if (document.getElementById('__ms_screen_root'))
    return;
  const sys = ensureSystemRoot();

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode:'open' });

  const existing = [...document.body.children]
    .filter(n => n !== sys);

  for (const node of existing) {
    document.body.removeChild(node);
    shadow.appendChild(node);
  }

  sys.appendChild(host);

  const file = location.pathname.split('/').pop();
  if (!file?.endsWith('.html')) return;

  const desc = createDescriptor(file);

  // 🔴 Parse ms-public from current document
// patch: 23
// parse ms-public from shadow DOM (already moved content)
const tpl = document.createElement('template');
tpl.innerHTML = shadow.innerHTML;
const policy = parsePublicPolicy(tpl);
// patch: 23 parse standalone policy

  const instance = {
    refId: REF_SEQ++,
    name: desc.logical,
    host,
    root: shadow,
    container: sys,
    locals:{},
    security:policy
  };

  INSTANCES.set(instance.refId, instance);
  CURRENT_SCREEN = instance;

  // 🔴 Register store ownership for standalone mode
  if (policy.storeRoots?.length) {

    for (const root of policy.storeRoots) {

      if (STORE_OWNERS.has(root)) {

        const err = {
          ok:false,
          error:{
            code:'STORE_NAMESPACE_CONFLICT',
            message:`Namespace ${root} already owned by ${STORE_OWNERS.get(root)}`,
            method:null,
            line:null,
            origin:instance.name,
            triggeredFrom:null
          }
        };

        __ms_halt_engine(err);
        throw err;
      }

      STORE_OWNERS.set(root, instance.name);
    }
  }

    // resolve MS ready AFTER bootstrap finished
  __ms_ready_resolve();

});
// patch: 22 AUTO BOOTSTRAP STORE SUPPORT