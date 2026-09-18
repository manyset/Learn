// simple-sqlite.js - Simplified version that exactly matches your folder structure
(function () {
    // Capture console output to display on page
    const output = document.getElementById('output');
    const statusDiv = document.getElementById('status');

    function log(message) {
        console.log(message);
        output.textContent += '\n' + message;
        output.scrollTop = output.scrollHeight;
    }

    function setStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    console.log = function (...args) {
        const msg = args.join(' ');
        output.textContent += '\n' + msg;
        output.scrollTop = output.scrollHeight;
        window.originalLog ? window.originalLog.apply(console, args) : null;
    };

    console.error = function (...args) {
        const msg = '❌ ' + args.join(' ');
        output.textContent += '\n' + msg;
        output.scrollTop = output.scrollHeight;
        window.originalError ? window.originalError.apply(console, args) : null;
    };

    // Save original functions
    window.originalLog = console.log;
    window.originalError = console.error;

    // Main function
    async function runSqliteTest() {
        log('🚀 Starting simplified SQLite test...');
        setStatus('Starting test...', 'info');

        try {
            // Get the base URL
            const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            log(`📁 Base URL: ${baseUrl}`);

            // Path to jswasm folder
            const jswasmPath = baseUrl + 'jswasm/';
            log(`📁 jswasm path: ${jswasmPath}`);

            // Check if files exist
            log('🔍 Checking SQLite files...');
            const files = ['sqlite3.js', 'sqlite3.wasm', 'sqlite3.mjs', 'sqlite3-opfs-async-proxy.js'];

            let allFilesExist = true;
            for (const file of files) {
                try {
                    const response = await fetch(jswasmPath + file, { method: 'HEAD' });
                    if (response.ok) {
                        log(`  ✅ ${file} - Found`);
                    } else {
                        log(`  ❌ ${file} - Not Found (HTTP ${response.status})`);
                        allFilesExist = false;
                    }
                } catch (e) {
                    log(`  ❌ ${file} - Error: ${e.message}`);
                    allFilesExist = false;
                }
            }

            if (!allFilesExist) {
                throw new Error('Some SQLite files are missing from the jswasm folder');
            }

            log('✅ All SQLite files found');

            // Load SQLite using a worker
            log('👷 Creating worker...');

            const workerCode = `
                // Worker code
                const jswasmPath = '${jswasmPath}';
                
                // Override fetch to use correct paths
                const originalFetch = self.fetch;
                self.fetch = function(url, options) {
                    if (typeof url === 'string' && !url.startsWith('http')) {
                        // Extract filename and prepend jswasmPath
                        const filename = url.split('/').pop();
                        url = jswasmPath + filename;
                    }
                    return originalFetch.call(self, url, options);
                };
                
                // Import SQLite
                importScripts(jswasmPath + 'sqlite3.js');
                
                // Wait for initialization
                const checkInterval = setInterval(() => {
                    if (typeof sqlite3InitModule !== 'undefined') {
                        clearInterval(checkInterval);
                        
                        // Initialize with correct paths
                        sqlite3InitModule({
                            locateFile: function(file) {
                                return jswasmPath + file;
                            }
                        }).then(sqlite3 => {
                            self.postMessage({ type: 'ready', version: sqlite3.version.libVersion });
                            self.sqlite3 = sqlite3;
                        }).catch(error => {
                            self.postMessage({ type: 'error', error: error.message });
                        });
                    }
                }, 100);
                
                // Handle messages
                self.onmessage = function(e) {
                    if (e.data.type === 'run-test') {
                        try {
                            // Try OPFS first
                            let db;
                            let mode;
                            
                            if (self.sqlite3.oo1?.OpfsDb) {
                                try {
                                    db = new self.sqlite3.oo1.OpfsDb('/test.sqlite');
                                    mode = 'OPFS';
                                } catch (e) {
                                    db = new self.sqlite3.oo1.DB(':memory:');
                                    mode = 'In-Memory (OPFS failed)';
                                }
                            } else {
                                db = new self.sqlite3.oo1.DB(':memory:');
                                mode = 'In-Memory';
                            }
                            
                            // Create table
                            db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");
                            
                            // Insert data
                            db.exec("INSERT INTO test (name) VALUES ('Test 1'), ('Test 2'), ('Test 3')");
                            
                            // Query data
                            const results = [];
                            db.exec({
                                sql: "SELECT * FROM test",
                                callback: function(row) {
                                    results.push({id: row[0], name: row[1]});
                                }
                            });
                            
                            // Get count
                            let count = 0;
                            db.exec({
                                sql: "SELECT COUNT(*) FROM test",
                                callback: function(row) {
                                    count = row[0];
                                }
                            });
                            
                            db.close();
                            
                            self.postMessage({
                                type: 'result',
                                data: {
                                    results: results,
                                    count: count,
                                    mode: mode
                                }
                            });
                        } catch (error) {
                            self.postMessage({ type: 'error', error: error.message });
                        }
                    }
                };
            `;

            // Create worker from blob
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);

            log('✅ Worker created');

            // Handle worker messages
            worker.onmessage = function (e) {
                const { type, version, data, error } = e.data;

                if (type === 'ready') {
                    log(`✅ SQLite version ${version} loaded`);
                    setStatus('SQLite loaded, running test...', 'info');
                    worker.postMessage({ type: 'run-test' });
                }
                else if (type === 'result') {
                    log('\n' + '='.repeat(50));
                    log('📊 TEST RESULTS');
                    log('='.repeat(50));
                    log(`💾 Mode: ${data.mode}`);
                    log('\n📋 Records:');
                    data.results.forEach(r => log(`  ID: ${r.id}, Name: ${r.name}`));
                    log(`\n📊 Total: ${data.count}`);
                    log('='.repeat(50));

                    setStatus(`Test completed successfully using ${data.mode}`, 'success');

                    // Store for runAgain
                    window.lastWorker = worker;
                    window.lastWorkerUrl = workerUrl;
                }
                else if (type === 'error') {
                    log(`❌ Error: ${error}`);
                    setStatus(`Error: ${error}`, 'error');
                }
            };

            worker.onerror = function (error) {
                log(`❌ Worker error: ${error.message}`);
                setStatus(`Worker error: ${error.message}`, 'error');
            };

            // Store for later use
            window.currentWorker = worker;
            window.currentWorkerUrl = workerUrl;

        } catch (error) {
            log(`❌ Fatal error: ${error.message}`);
            setStatus(`Fatal error: ${error.message}`, 'error');
        }
    }

    // Function to run again
    window.runAgain = function () {
        if (window.currentWorker) {
            log('\n🔄 Running test again...');
            window.currentWorker.postMessage({ type: 'run-test' });
        } else {
            startTest();
        }
    };

    // Function to check files
    window.checkFiles = async function () {
        log('🔍 Checking files in /jswasm/ folder...');
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const jswasmPath = baseUrl + 'jswasm/';

        const files = ['sqlite3.js', 'sqlite3.wasm', 'sqlite3.mjs', 'sqlite3-opfs-async-proxy.js'];

        for (const file of files) {
            try {
                const response = await fetch(jswasmPath + file, { method: 'HEAD' });
                if (response.ok) {
                    log(`  ✅ ${file} - Found`);
                } else {
                    log(`  ❌ ${file} - Not Found (HTTP ${response.status})`);
                }
            } catch (e) {
                log(`  ❌ ${file} - Error: ${e.message}`);
            }
        }
    };

    // Start function
    window.startTest = function () {
        output.textContent = '';
        runSqliteTest();
    };

    // Auto-check files on load
    setTimeout(checkFiles, 500);
})();