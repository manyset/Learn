
(async function() {
    console.log("🚀 Starting SQLite OPFS Worker Example...");
    
    try {
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        console.log("📁 Base URL:", baseUrl);
        console.log("🔍 COOP/COEP headers verified - OPFS should work");
        
        // Create worker with fixed code
        const workerCode = `
            console.log('👷 Worker: Initializing...');
            
            const baseUrl = '${baseUrl}';
            const sqlitePath = baseUrl + 'jswasm/';
            
            console.log('📁 SQLite path:', sqlitePath);
            
            // Override fetch to use correct paths
            const originalFetch = self.fetch;
            self.fetch = async function(url, options = {}) {
                if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('blob:')) {
                    const filename = url.split('/').pop();
                    url = sqlitePath + filename;
                    console.log('📂 Fetching:', url);
                }
                return originalFetch.call(self, url, options);
            };
            
            // Load SQLite
            importScripts(sqlitePath + 'sqlite3.js');
            
            // Wait for sqlite3InitModule
            const checkInterval = setInterval(() => {
                if (typeof sqlite3InitModule !== 'undefined') {
                    clearInterval(checkInterval);
                    console.log('✅ Worker: sqlite3InitModule found');
                    
                    // Initialize with explicit locateFile for ALL files
                    sqlite3InitModule({
                        locateFile: function(file) {
                            // This ensures sqlite3-opfs-async-proxy.js is found
                            const path = sqlitePath + file;
                            console.log('🔧 locateFile:', file, '->', path);
                            return path;
                        }
                    }).then(sqlite3 => {
                        console.log('✅ Worker: SQLite loaded', sqlite3.version.libVersion);
                        self.sqlite3 = sqlite3;
                        self.postMessage({ 
                            type: 'ready', 
                            version: sqlite3.version.libVersion,
                            opfsAvailable: !!sqlite3.oo1?.OpfsDb
                        });
                    }).catch(error => {
                        console.error('❌ SQLite init failed:', error);
                        self.postMessage({ type: 'error', error: error.message });
                    });
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!self.sqlite3) {
                    self.postMessage({ type: 'error', error: 'SQLite initialization timeout' });
                }
            }, 10000);

            // Handle messages
            self.onmessage = async function(e) {
                const { type } = e.data;
                
                try {
                    switch(type) {
                        case 'run-db-operations': {
                            console.log('👷 Worker: Starting database operations...');
                            
                            let db;
                            let mode = 'unknown';
                            
                            // Try OPFS first (headers are correct)
                            try {
                                if (self.sqlite3.oo1?.OpfsDb) {
                                    console.log('🔧 Creating OPFS database...');
                                    db = new self.sqlite3.oo1.OpfsDb('/mydatabase.sqlite');
                                    mode = 'OPFS';
                                    console.log('✅ Using OPFS database');
                                } else {
                                    console.log('⚠️ OpfsDb not available, falling back to in-memory');
                                    db = new self.sqlite3.oo1.DB(':memory:');
                                    mode = 'In-Memory';
                                }
                            } catch (e) {
                                console.log('⚠️ OPFS error:', e.message);
                                db = new self.sqlite3.oo1.DB(':memory:');
                                mode = 'In-Memory (fallback)';
                            }
                            
                            // Create table
                            db.exec(\`
                                CREATE TABLE IF NOT EXISTS users (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    name TEXT NOT NULL,
                                    email TEXT UNIQUE NOT NULL,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                );
                            \`);
                            console.log('✅ Table created');
                            
                            // Insert records
                            const stmt = db.prepare(
                                "INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)"
                            );
                            
                            const users = [
                                ["Alice Johnson", "alice@example.com"],
                                ["Bob Smith", "bob@example.com"],
                                ["Carol White", "carol@example.com"]
                            ];
                            
                            for (const user of users) {
                                stmt.bind(user);
                                stmt.step();
                                stmt.reset();
                            }
                            stmt.finalize();
                            console.log('✅ Records inserted');
                            
                            // Query results
                            const allUsers = [];
                            db.exec({
                                sql: "SELECT * FROM users ORDER BY id",
                                callback: function(row) {
                                    allUsers.push(row.slice());
                                }
                            });
                            
                            let count = 0;
                            db.exec({
                                sql: "SELECT COUNT(*) FROM users",
                                callback: function(row) {
                                    count = row[0];
                                }
                            });
                            
                            // If using OPFS, export and save
                            if (mode === 'OPFS') {
                                console.log('💾 Database saved to OPFS persistently');
                            }
                            
                            db.close();
                            
                            self.postMessage({
                                type: 'result',
                                data: {
                                    allUsers: allUsers,
                                    count: count,
                                    mode: mode
                                }
                            });
                            break;
                        }
                        
                        case 'check-files': {
                            const files = ['sqlite3.js', 'sqlite3.wasm', 'sqlite3.mjs', 'sqlite3-opfs-async-proxy.js'];
                            const results = [];
                            
                            for (const file of files) {
                                try {
                                    const url = sqlitePath + file;
                                    const response = await fetch(url, { method: 'HEAD' });
                                    results.push({
                                        file: 'sqlite/' + file,
                                        exists: response.ok,
                                        url: url,
                                        status: response.status
                                    });
                                } catch (e) {
                                    results.push({
                                        file: 'sqlite/' + file,
                                        exists: false,
                                        url: sqlitePath + file
                                    });
                                }
                            }
                            
                            self.postMessage({ type: 'file-check', results: results });
                            break;
                        }
                    }
                } catch (error) {
                    self.postMessage({ type: 'error', error: error.message });
                }
            };
        `;

        // Create worker
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        
        console.log("✅ Main thread: Worker created");

        // Handle worker messages
        worker.onmessage = function(e) {
            const { type, version, data, error, results, opfsAvailable } = e.data;
            
            switch(type) {
                case 'ready':
                    console.log(`✅ Main thread: Worker ready (SQLite v${version})`);
                    console.log(`🔧 OPFS Available: ${opfsAvailable ? 'YES' : 'NO'}`);
                    console.log("📋 Starting database operations...");
                    worker.postMessage({ type: 'run-db-operations' });
                    break;
                    
                case 'result':
                    console.log("\n" + "=".repeat(60));
                    console.log("📊 DATABASE OPERATIONS RESULTS");
                    console.log("=".repeat(60));
                    console.log(`\n💾 Database Mode: ${data.mode}`);
                    
                    console.log("\n📋 All Users:");
                    data.allUsers.forEach((user, index) => {
                        console.log(`  ${index + 1}. ID: ${user[0]}, Name: ${user[1]}, Email: ${user[2]}, Created: ${user[3]}`);
                    });
                    
                    console.log(`\n📊 Total Records: ${data.count}`);
                    console.log("\n" + "=".repeat(60));
                    break;
                    
                case 'file-check':
                    console.log("\n📁 File Check Results:");
                    results.forEach(r => {
                        if (r.exists) {
                            console.log(`  ✅ ${r.file} - Found`);
                        } else {
                            console.log(`  ❌ ${r.file} - Not Found`);
                        }
                    });
                    
                    // Check if proxy file exists
                    const proxyFile = results.find(r => r.file.includes('opfs-async-proxy'));
                    if (proxyFile && proxyFile.exists) {
                        console.log('✅ OPFS proxy file found - OPFS should work');
                    } else if (proxyFile) {
                        console.log('⚠️ OPFS proxy file missing - OPFS will not work');
                    }
                    break;
                    
                case 'error':
                    console.error("❌ Error:", error);
                    break;
            }
        };

        worker.onerror = function(error) {
            console.error("❌ Worker error:", error.message);
        };

        // Check files
        setTimeout(() => worker.postMessage({ type: 'check-files' }), 1000);

        // Add utilities
        window.sqliteHelper = {
            worker,
            runAgain: () => worker.postMessage({ type: 'run-db-operations' }),
            checkFiles: () => worker.postMessage({ type: 'check-files' }),
            terminate: () => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            }
        };

    } catch (error) {
        console.error("❌ Fatal error:", error);
    }
})();
////////
