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

async function readBundle() {
    const marker = new TextEncoder().encode(BUNDLE_MARKER);
    const response = await fetch(new URL('./bundle.ms', import.meta.url));
    if (!response.ok) fail(`could not load bundle.ms (${response.status})`);
    const file = new Uint8Array(await response.arrayBuffer());
    if (!startsWith(file, marker)) fail('bundle.ms has an invalid bundle marker');

    const gzipBytes = reverseEncodedGzip(file.slice(marker.length));
    if (gzipBytes[0] !== 0x1f || gzipBytes[1] !== 0x8b) {
        fail('encoded gzip header is invalid');
    }
    if (typeof DecompressionStream !== 'function') {
        fail('this browser does not support gzip decompression');
    }

    let bundleBytes;
    try {
        const stream = new Blob([gzipBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        bundleBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
        fail(`bundle decompression failed (${error?.message || error})`);
    }

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
    if ((manifest.config != null && typeof manifest.config !== 'string') ||
        (manifest.factorySettings != null && typeof manifest.factorySettings !== 'string')) {
        fail('bundle config section is invalid');
    }

    const cssAssets = [];
    let offset = formEnd;
    for (const asset of manifest.css) {
        const size = Number(asset?.size);
        if (asset?.role !== 'config' ||
            typeof asset.path !== 'string' || !asset.path ||
            !Number.isSafeInteger(size) || size < 0 || size > bundleBytes.length - offset) {
            fail('bundle CSS section lengths do not match its payload');
        }
        cssAssets.push({ role: asset.role, path: asset.path, bytes: bundleBytes.slice(offset, offset + size) });
        offset += size;
    }
    if (offset !== bundleBytes.length) fail('bundle has unexpected trailing data');

    return {
        core: bundleBytes.slice(coreStart, formStart),
        form: bundleBytes.slice(formStart, formStart + formSize),
        bootstrap: {
            config: manifest.config ?? null,
            factorySettings: manifest.factorySettings ?? null,
            css: cssAssets
        }
    };
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

    const sections = await readBundle();
    const configUrl = new URL('../ms-config/global-config.json', import.meta.url).href;
    const factorySettingsUrl = new URL('./factory-settings/factory-settings.json', import.meta.url).href;
    globalThis.__MS_BUNDLE_BOOTSTRAP__ = sections.bootstrap ? {
        config: sections.bootstrap.config,
        factorySettings: sections.bootstrap.factorySettings,
        configUrl,
        factorySettingsUrl,
        css: sections.bootstrap.css
    } : null;
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
