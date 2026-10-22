/**
 * @license ManySet
 * ms.js V1.2.4
 *
 * Copyright (c) ManySet, Inc. and its affiliates.
 *
 * This source code is licensed under the Commercial Developer license found in the
 * LICENSE file (MS-LICENSE.rtf) in the root directory of this source tree.
 */
//# sourceURL=ms.js
//   HYBRID-STABLE (CORE EDITION)


// Bundle section lengths are checked against the generated baselines in ms-core.js and form.js.
const BUNDLE_MARKER = '// PLEASE DO NOT REMOVE THIS LINE OR EDIT FILE.\n';
const BUNDLE_MAGIC = 'MSBNDL02';
const BOOSTER_MARKER = '// PLEASE DO NOT REMOVE THIS MS STARTUP BOOSTER.\n';
const BOOSTER_MAGIC = 'MSBST001';

function fail(message) {
    throw new Error(`MS bundle startup failed: ${message}`);
}

function reverseEncodedGzip(bytes) {
    const half = Math.ceil(bytes.length / 2);
    for (let left = 0, right = half - 1; left < right; left++, right--) {
        [bytes[left], bytes[right]] = [bytes[right], bytes[left]];
    }
    for (let left = half, right = bytes.length - 1; left < right; left++, right--) {
        [bytes[left], bytes[right]] = [bytes[right], bytes[left]];
    }
    return bytes;
}

function startsWith(bytes, prefix) {
    return bytes.length >= prefix.length && prefix.every((value, i) => bytes[i] === value);
}

async function readEncodedPayload(relativeUrl, markerText, label, fallbackUrl = null) {
    const marker = new TextEncoder().encode(markerText);
    let response = await fetch(new URL(relativeUrl, import.meta.url), { cache: 'no-cache' });
    if (!response.ok && fallbackUrl) {
        response = await fetch(new URL(fallbackUrl, import.meta.url), { cache: 'no-cache' });
    }
    if (!response.ok) fail(`could not load ${label} (${response.status})`);
    const file = new Uint8Array(await response.arrayBuffer());
    if (!startsWith(file, marker)) fail(`${label} has an invalid marker`);

    const gzipBytes = reverseEncodedGzip(file.slice(marker.length));
    if (gzipBytes[0] !== 0x1f || gzipBytes[1] !== 0x8b) {
        fail(`${label} has an invalid encoded gzip header`);
    }
    if (typeof DecompressionStream !== 'function') {
        fail('this browser does not support gzip decompression');
    }

    let bundleBytes;
    try {
        const stream = new Blob([gzipBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        bundleBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
        fail(`${label} decompression failed (${error?.message || error})`);
    }

    return bundleBytes;
}

async function readBundle() {
    const bundleBytes = await readEncodedPayload(
        './bundle.ms', BUNDLE_MARKER, 'bundle.ms', './Bundle.ms'
    );
    if (bundleBytes.length < 20) fail('bundle header is invalid');
    const magic = new TextDecoder().decode(bundleBytes.subarray(0, 8));
    if (magic !== BUNDLE_MAGIC) fail('unsupported bundle format; rebuild bundle.ms');

    const header = new DataView(bundleBytes.buffer, bundleBytes.byteOffset, bundleBytes.byteLength);
    const coreSize = header.getUint32(8, true);
    const formSize = header.getUint32(12, true);
    const manifestSize = header.getUint32(16, true);
    const manifestStart = 20;
    const coreStart = manifestStart + manifestSize;
    const formStart = coreStart + coreSize;
    const formEnd = formStart + formSize;
    if (coreStart > bundleBytes.length || formStart > bundleBytes.length ||
        formEnd > bundleBytes.length) {
        fail('bundle section lengths do not match its payload');
    }

    let manifest;
    try {
        manifest = JSON.parse(new TextDecoder().decode(bundleBytes.subarray(manifestStart, coreStart)));
    } catch (error) {
        fail(`bundle manifest is invalid (${error?.message || error})`);
    }
    if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.css)) {
        fail('bundle manifest has an invalid structure');
    }
    if (manifest.css.length !== 0 || manifest.config != null || manifest.factorySettings != null ||
        formEnd !== bundleBytes.length) {
        fail('bundle.ms must contain only the MS runtime sections');
    }

    return {
        core: bundleBytes.slice(coreStart, formStart),
        form: bundleBytes.slice(formStart, formStart + formSize)
    };
}

async function readStartupBooster() {
    const payload = await readEncodedPayload(
        '../ms-config/BOOSTERS/startup_booster.ms',
        BOOSTER_MARKER,
        'startup_booster.ms'
    );
    if (payload.length < 12 || new TextDecoder().decode(payload.subarray(0, 8)) !== BOOSTER_MAGIC) {
        fail('startup_booster.ms has an invalid header');
    }

    const manifestSize = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
        .getUint32(8, true);
    const manifestEnd = 12 + manifestSize;
    if (manifestEnd > payload.length) fail('startup_booster.ms manifest is truncated');

    let manifest;
    try {
        manifest = JSON.parse(new TextDecoder().decode(payload.subarray(12, manifestEnd)));
    } catch (error) {
        fail(`startup_booster.ms manifest is invalid (${error?.message || error})`);
    }
    if (!manifest || typeof manifest !== 'object' ||
        typeof manifest.config !== 'string' ||
        (manifest.factorySettings != null && typeof manifest.factorySettings !== 'string') ||
        !Array.isArray(manifest.css)) {
        fail('startup_booster.ms manifest has an invalid structure');
    }

    let offset = manifestEnd;
    const css = manifest.css.map(asset => {
        const size = Number(asset?.size);
        if (typeof asset?.path !== 'string' || !asset.path ||
            !Number.isSafeInteger(size) || size < 0 || size > payload.length - offset) {
            fail('startup_booster.ms CSS sections are invalid');
        }
        const bytes = payload.slice(offset, offset + size);
        offset += size;
        return { role: 'config', path: asset.path, bytes };
    });
    if (offset !== payload.length) fail('startup_booster.ms has unexpected trailing data');

    return { config: manifest.config, factorySettings: manifest.factorySettings ?? null, css };
}

function loadClassicForm(formBytes) {
    return new Promise((resolve, reject) => {
        const formUrl = URL.createObjectURL(new Blob([
            formBytes,
            '\n//# sourceURL=form.js'
        ], { type: 'text/javascript' }));
        const script = document.createElement('script');
        script.async = false;
        script.src = formUrl;
        script.onload = () => {
            URL.revokeObjectURL(formUrl);
            if (typeof window.ms?.form?.combo !== 'function' ||
                typeof window.ms?.form?.grid !== 'function') {
                reject(new Error('form.js loaded but did not register its API'));
                return;
            }
            resolve();
        };
        script.onerror = () => {
            URL.revokeObjectURL(formUrl);
            reject(new Error('form.js bundle section could not be executed'));
        };
        document.head.appendChild(script);
    });
}

async function startMS() {
    if (!globalThis.fetch) fail('fetch is unavailable');

    const [sections, bootstrap] = await Promise.all([readBundle(), readStartupBooster()]);
    const configUrl = new URL('../ms-config/global-config.json', import.meta.url).href;
    const factorySettingsUrl = new URL('./factory-settings/factory-settings.json', import.meta.url).href;
    globalThis.__MS_BUNDLE_BOOTSTRAP__ = {
        config: bootstrap.config,
        factorySettings: bootstrap.factorySettings,
        configUrl,
        factorySettingsUrl,
        css: bootstrap.css
    };
    globalThis.__bn_lens__ = Object.freeze({
        core: sections.core.byteLength,
        form: sections.form.byteLength
    });
    let resolveFormReady;
    globalThis.__MS_BUNDLE_FORM_READY__ = new Promise(resolve => {
        resolveFormReady = resolve;
    });
    globalThis.__MS_RUNTIME_BASE_URL__ = import.meta.url;

    const coreUrl = URL.createObjectURL(new Blob([
        sections.core,
        '\n//# sourceURL=ms-core.js'
    ], { type: 'text/javascript' }));

    try {
        const coreModule = await import(coreUrl);
        const ms = coreModule?.default;
        if (!ms || typeof ms.ready !== 'function') fail('ms-core.js did not export the MS API');
        window.ms = ms;

        await loadClassicForm(sections.form);
        globalThis.__MS_REGISTER_FORM_API__?.(ms.form);
        resolveFormReady();
        return ms;
    } catch (error) {
        resolveFormReady();
        throw error;
    } finally {
        URL.revokeObjectURL(coreUrl);
        delete globalThis.__MS_RUNTIME_BASE_URL__;
        globalThis.__MS_BUNDLE_FORM_READY__ = null;
    }
}

const ms = await startMS();
export default ms;
