// db-robust.mjs - SQLite OPFS API with clean object returns
// Usage: import db from './db-robust.mjs'

export const DB_ERROR = {
    SUCCESS: 0,
    INIT_FAILED: 1001,
    OPERATION_FAILED: 1003,
    WORKER_CREATION_FAILED: 1004,
    SQLITE_LOAD_FAILED: 1005,
    DATABASE_OPEN_FAILED: 1006,
    NOT_INITIALIZED: 1009,
    WORKER_ERROR: 1010,
    TIMEOUT: 1011,
    INVALID_SQL: 1012,
    TABLE_EXISTS: 1013,
    TABLE_NOT_FOUND: 1014,
    CONSTRAINT_VIOLATION: 1015,
    DATABASE_LOCKED: 1016,
    CORRUPT_DATABASE: 1017
};

// Custom error class
class DatabaseError extends Error {
    constructor(code, message, details = null) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.userMessage = this._getUserMessage(code, message);
    }

    _getUserMessage(code, originalMessage) {
        const messages = {
            [DB_ERROR.INIT_FAILED]: 'Database initialization failed. Please check your connection.',
            [DB_ERROR.OPERATION_FAILED]: 'Database operation failed. Please try again.',
            [DB_ERROR.WORKER_CREATION_FAILED]: 'Unable to start database worker. Check browser settings.',
            [DB_ERROR.SQLITE_LOAD_FAILED]: 'SQLite engine failed to load. Check if files exist in jswasm/',
            [DB_ERROR.DATABASE_OPEN_FAILED]: 'Cannot open database file. Check permissions and storage.',
            [DB_ERROR.NOT_INITIALIZED]: 'Database not initialized. Call init() first.',
            [DB_ERROR.WORKER_ERROR]: 'Database worker communication error.',
            [DB_ERROR.TIMEOUT]: 'Operation timed out. Please try again.',
            [DB_ERROR.INVALID_SQL]: 'Invalid SQL statement provided.',
            [DB_ERROR.TABLE_EXISTS]: 'Table already exists.',
            [DB_ERROR.TABLE_NOT_FOUND]: 'Table does not exist. Create it first.',
            [DB_ERROR.CONSTRAINT_VIOLATION]: 'Data violates database constraint (unique, foreign key, etc).',
            [DB_ERROR.DATABASE_LOCKED]: 'Database is locked by another tab. Close other tabs and try again.',
            [DB_ERROR.CORRUPT_DATABASE]: 'Database file is corrupt. Try deleting and recreating.'
        };
        return messages[code] || `Database error: ${originalMessage}`;
    }

    toJSON() {
        return {
            success: false,
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

class SQLiteDB {
    constructor(options = {}) {
        this.worker = null;
        this.ready = false;
        this.initPromise = null;
        this.callbacks = new Map();
        this.nextCallbackId = 1;
        
        this.options = {
            dbName: options.dbName || 'app.db',
            sqlitePath: options.sqlitePath || './jswasm/',
            initTimeout: options.initTimeout || 2000
        };
        
        this.tabId = Math.random().toString(36).substring(2, 10);
        this.dbStatus = null;
        this.errorLog = [];
        this.stats = {
            operations: 0,
            errors: 0,
            lastError: null
        };
        
        // Attach DatabaseError to instance
        this.DatabaseError = DatabaseError;
        
        console.log(`📁 DB: ${this.options.dbName} | Tab: ${this.tabId}`);
    }

    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this._logError('Initialization timeout');
                reject(new DatabaseError(
                    DB_ERROR.TIMEOUT,
                    `Database initialization timed out after ${this.options.initTimeout}ms`,
                    'Check that SQLite files exist in jswasm/ and headers are set correctly'
                ));
            }, this.options.initTimeout);

            try {
                const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
                const jswasmPath = baseUrl + this.options.sqlitePath;

                const workerCode = this._createWorkerCode(jswasmPath);
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                this.worker = new Worker(workerUrl);

                this.worker.onmessage = (e) => this._handleWorkerMessage(e, resolve, reject, timeoutId);
                this.worker.onerror = (err) => this._handleWorkerError(err, reject, timeoutId);

            } catch (err) {
                clearTimeout(timeoutId);
                this._logError('Worker creation failed', err);
                reject(new DatabaseError(
                    DB_ERROR.WORKER_CREATION_FAILED,
                    err.message,
                    'Failed to create database worker thread'
                ));
            }
        });

        return this.initPromise;
    }

    // Returns object with success flag - doesn't throw
    async exec(sql, params = []) {
        this.stats.operations++;
        
        if (!this.ready) {
            return { 
                success: false, 
                errorCode: DB_ERROR.NOT_INITIALIZED,
                message: 'Database not initialized. Call init() first.',
                userMessage: 'Database not initialized. Call init() first.'
            };
        }
        
        if (!sql || typeof sql !== 'string') {
            return {
                success: false,
                errorCode: DB_ERROR.INVALID_SQL,
                message: 'Invalid SQL statement',
                userMessage: 'Invalid SQL statement provided.'
            };
        }
        
        try {
            const result = await this._post('exec', sql, params);
            
            if (result && result.error) {
                const dbError = this._parseSQLiteError(result.error);
                return {
                    success: false,
                    errorCode: dbError.code,
                    message: dbError.message,
                    userMessage: dbError.userMessage,
                    details: dbError.details
                };
            }
            
            return { 
                success: true, 
                changes: result?.c || 0,
                lastInsertRowid: result?.id || 0
            };
        } catch (err) {
            this.stats.errors++;
            this.stats.lastError = err;
            
            const dbError = err instanceof DatabaseError ? err : this._parseError(err);
            return {
                success: false,
                errorCode: dbError.code,
                message: dbError.message,
                userMessage: dbError.userMessage,
                details: dbError.details
            };
        }
    }

    // Returns array of objects directly - throws on error
    async query(sql, params = []) {
        this.stats.operations++;
        
        if (!this.ready) {
            throw new DatabaseError(
                DB_ERROR.NOT_INITIALIZED,
                'Database not initialized. Call init() first.'
            );
        }
        
        if (!sql || typeof sql !== 'string') {
            throw new DatabaseError(
                DB_ERROR.INVALID_SQL,
                'Invalid SQL statement'
            );
        }
        
        try {
            const rows = await this._post('query', sql, params);
            
            if (rows && rows.error) {
                throw this._parseSQLiteError(rows.error);
            }
            
            return rows || [];
        } catch (err) {
            this.stats.errors++;
            this.stats.lastError = err;
            
            if (err instanceof DatabaseError) {
                throw err;
            }
            throw this._parseError(err);
        }
    }

    async close() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.ready = false;
            this.initPromise = null;
            this.dbStatus = null;
        }
        return { success: true };
    }

    getInitStatus() {
        return this.dbStatus;
    }

    getStats() {
        return { ...this.stats, errorLog: this.errorLog.slice(-10) };
    }

    clearErrors() {
        this.errorLog = [];
        this.stats.errors = 0;
        this.stats.lastError = null;
    }

    // ==================== FILE ACCESS DIAGNOSTICS ====================

    async _checkFileAccess() {
        const issues = [];
        
        if (!navigator.storage || !navigator.storage.getDirectory) {
            issues.push({
                type: 'OPFS_UNAVAILABLE',
                message: 'Origin Private File System (OPFS) is not supported in this browser',
                severity: 'critical'
            });
            return issues;
        }
        
        try {
            const root = await navigator.storage.getDirectory();
            const testFileName = `_access_test_${Date.now()}.tmp`;
            
            try {
                const fileHandle = await root.getFileHandle(testFileName, { create: true });
                
                try {
                    const accessHandle = await fileHandle.createSyncAccessHandle();
                    
                    try {
                        const encoder = new TextEncoder();
                        const testData = encoder.encode('test');
                        accessHandle.write(testData, { at: 0 });
                        accessHandle.flush();
                        
                        const readBuffer = new ArrayBuffer(4);
                        accessHandle.read(readBuffer, { at: 0 });
                        
                        accessHandle.close();
                        await root.removeEntry(testFileName);
                        
                    } catch (writeErr) {
                        issues.push({
                            type: 'WRITE_FAILED',
                            message: `Cannot write to OPFS: ${writeErr.message}`,
                            technical: writeErr.toString(),
                            severity: 'critical'
                        });
                    }
                } catch (handleErr) {
                    issues.push({
                        type: 'SYNC_HANDLE_FAILED',
                        message: `Cannot create sync access handle: ${handleErr.message}`,
                        technical: handleErr.toString(),
                        severity: 'critical'
                    });
                    try { await root.removeEntry(testFileName); } catch (e) {}
                }
            } catch (createErr) {
                issues.push({
                    type: 'FILE_CREATION_FAILED',
                    message: `Cannot create test file: ${createErr.message}`,
                    technical: createErr.toString(),
                    severity: 'critical'
                });
            }
            
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usagePercent = (estimate.usage / estimate.quota) * 100;
                
                if (usagePercent > 90) {
                    issues.push({
                        type: 'LOW_DISK_SPACE',
                        message: `Low disk space: ${usagePercent.toFixed(1)}% used`,
                        details: {
                            used: this._formatBytes(estimate.usage),
                            quota: this._formatBytes(estimate.quota),
                            percent: usagePercent
                        },
                        severity: 'warning'
                    });
                }
            }
            
        } catch (rootErr) {
            issues.push({
                type: 'ROOT_ACCESS_FAILED',
                message: `Cannot access OPFS root: ${rootErr.message}`,
                technical: rootErr.toString(),
                severity: 'critical'
            });
        }
        
        try {
            const result = await this._checkHeaders();
            if (!result.coop || !result.coep) {
                issues.push({
                    type: 'MISSING_HEADERS',
                    message: 'Required COOP/COEP headers are missing',
                    details: result,
                    severity: 'critical',
                    fix: 'Add these headers to IIS: Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp'
                });
            }
        } catch (e) {}
        
        return issues;
    }

    async _checkHeaders() {
        try {
            const response = await fetch(window.location.href, { method: 'HEAD' });
            return {
                coop: response.headers.get('cross-origin-opener-policy'),
                coep: response.headers.get('cross-origin-embedder-policy')
            };
        } catch (e) {
            return { coop: null, coep: null };
        }
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    _parseSQLiteError(errorMsg) {
        const msg = errorMsg.toLowerCase();
        
        if (msg.includes('already exists') || msg.includes('duplicate')) {
            return new DatabaseError(
                DB_ERROR.CONSTRAINT_VIOLATION,
                errorMsg,
                'This record already exists or violates a unique constraint'
            );
        }
        if (msg.includes('no such table')) {
            return new DatabaseError(
                DB_ERROR.TABLE_NOT_FOUND,
                errorMsg,
                'The table does not exist. Create it first with CREATE TABLE'
            );
        }
        if (msg.includes('locked') || msg.includes('busy') || msg.includes('access handle')) {
            return new DatabaseError(
                DB_ERROR.DATABASE_LOCKED,
                errorMsg,
                'Database is locked by another tab. Try again or close other tabs'
            );
        }
        if (msg.includes('corrupt') || msg.includes('malformed')) {
            return new DatabaseError(
                DB_ERROR.CORRUPT_DATABASE,
                errorMsg,
                'Database file may be corrupt. Try deleting and recreating'
            );
        }
        
        return new DatabaseError(
            DB_ERROR.OPERATION_FAILED,
            errorMsg
        );
    }

    _parseError(err) {
        const msg = err.message?.toLowerCase() || '';
        
        if (msg.includes('postmessage') || msg.includes('clone')) {
            return new DatabaseError(
                DB_ERROR.WORKER_ERROR,
                err.message,
                'Check that only plain data is being sent through postMessage'
            );
        }
        if (msg.includes('timeout')) {
            return new DatabaseError(
                DB_ERROR.TIMEOUT,
                err.message
            );
        }
        
        return new DatabaseError(
            DB_ERROR.OPERATION_FAILED,
            err.message || 'Unknown error'
        );
    }

_createWorkerCode(jswasmPath) {
    return `
        const jswasmPath = '${jswasmPath}';
        const dbName = '${this.options.dbName}';
        const tabId = '${this.tabId}';

        function log(msg, level = 'info') {
            self.postMessage({ type: 'log', level, message: msg, tabId });
        }

        log('Worker starting...');
        
        import(jswasmPath + 'sqlite3.mjs')
            .then(m => {
                log('SQLite module loaded');
                return m.default;
            })
            .then(init => {
                log('Initializing SQLite...');
                return init({ locateFile: f => jswasmPath + f });
            })
            .then(sqlite3 => {
                log('SQLite initialized v' + sqlite3.version.libVersion);
                self.sqlite3 = sqlite3;
                
                try {
                    self.db = new self.sqlite3.oo1.OpfsDb('/' + dbName);
                    
                    const stmt = self.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'");
                    const isNew = !stmt.step();
                    stmt.finalize();
                    
                    self.postMessage({ 
                        type: 'ready', 
                        status: isNew ? 'created' : 'opened'
                    });
                    
                } catch (dbErr) {
                    log('Database open failed: ' + dbErr.message, 'error');
                    self.postMessage({ 
                        type: 'error', 
                        msg: dbErr.message,
                        code: 1006
                    });
                }
            })
            .catch(err => {
                log('SQLite load error: ' + err.message, 'error');
                self.postMessage({ 
                    type: 'error', 
                    msg: err.message,
                    code: 1005
                });
            });

        self.onmessage = async (e) => {
            const { id, op, sql, params } = e.data;
            
            try {
                log('Operation: ' + op);
                
                if (!self.db) {
                    throw new Error('Database not opened');
                }
                
                let response;
                
                if (op === 'exec') {
                    log('Executing: ' + sql);
                    let changes = 0;
                    let lastInsertRowid = 0;
                    
                    try {
                        if (params && params.length > 0) {
                            const stmt = self.db.prepare(sql);
                            stmt.bind(params);
                            stmt.step();
                            stmt.finalize();
                            changes = typeof self.db.changes === 'function' ? self.db.changes() : self.db.changes;
                            lastInsertRowid = typeof self.db.lastInsertRowid === 'function' ? self.db.lastInsertRowid() : self.db.lastInsertRowid;
                        } else {
                            self.db.exec(sql);
                            changes = typeof self.db.changes === 'function' ? self.db.changes() : self.db.changes;
                            lastInsertRowid = typeof self.db.lastInsertRowid === 'function' ? self.db.lastInsertRowid() : self.db.lastInsertRowid;
                        }
                        
                        log('Exec done, changes: ' + changes);
                        response = { ok: true, c: changes, id: lastInsertRowid };
                        
                    } catch (execErr) {
                        log('Exec error: ' + execErr.message, 'error');
                        response = { error: execErr.message };
                    }
                }
     else if (op === 'query') {
    log('Querying: ' + sql);
    const rows = [];
    
    try {
        // Get column names first by preparing a separate statement
        let columnNames = [];
        
        // Try to get real column names using a separate prepared statement
        try {
            const colStmt = self.db.prepare(sql);
            if (params && params.length > 0) {
                colStmt.bind(params);
            }
            
            // Step once to get metadata
            if (colStmt.step()) {
                // Try to get column names
                for (let i = 0; i < colStmt.get().length; i++) {
                    let colName = null;
                    if (colStmt.getColumnName && typeof colStmt.getColumnName === 'function') {
                        try {
                            colName = colStmt.getColumnName(i);
                        } catch (e) {}
                    }
                    columnNames.push(colName || 'col' + i);
                }
            }
            colStmt.finalize();
        } catch (e) {
            log('Error getting column names: ' + e.message, 'warn');
        }
        
        log('Column names: ' + JSON.stringify(columnNames));
        
        // Now execute the query with callback
        self.db.exec({
            sql: sql,
            bind: params,
            callback: function(row) {
                // row is an array-like object with numeric keys
                const rowObj = {};
                
                // If we have column names, use them
                if (columnNames && columnNames.length > 0) {
                    for (let i = 0; i < columnNames.length; i++) {
                        rowObj[columnNames[i]] = row[i];
                    }
                } else {
                    // Fallback to generic names
                    for (let i = 0; i < row.length; i++) {
                        rowObj['col' + i] = row[i];
                    }
                }
                
                rows.push(rowObj);
            }
        });
        
        log('Query returned ' + rows.length + ' rows');
        response = rows;
        
    } catch (queryErr) {
        log('Query error: ' + queryErr.message, 'error');
        response = { error: queryErr.message };
    }
}
                
                self.postMessage({ t: 'done', i: id, d: response });
                
            } catch (err) {
                log('Operation error: ' + err.message, 'error');
                self.postMessage({ 
                    t: 'error', 
                    i: id, 
                    m: err.message,
                    s: err.stack 
                });
            }
        };
    `;
}

    async _handleWorkerMessage(e, resolve, reject, timeoutId) {
        const { type, t, i, d, m, s, level, message, tabId, status, code } = e.data;
        
        if (type === 'log') {
            console.log(`[Worker ${tabId}] ${level}: ${message}`);
            return;
        }
        
        if (type === 'ready') {
            clearTimeout(timeoutId);
            this.ready = true;
            this.dbStatus = status;
            console.log(`✅ Worker ready - database ${status}`);
            resolve({ 
                success: true, 
                status: status,
                message: `Database ${status} successfully`
            });
        }
        else if (type === 'error') {
            clearTimeout(timeoutId);
            
            let fileIssues = [];
            if (code === 1006) {
                console.log('🔍 Database open failed - running file access diagnostics...');
                fileIssues = await this._checkFileAccess();
            }
            
            let dbError;
            if (code === 1005) {
                dbError = new DatabaseError(
                    DB_ERROR.SQLITE_LOAD_FAILED,
                    m || message || 'SQLite load failed',
                    { fileIssues: fileIssues.length > 0 ? fileIssues : undefined }
                );
            } else if (code === 1006) {
                dbError = new DatabaseError(
                    DB_ERROR.DATABASE_OPEN_FAILED,
                    m || message || 'Database open failed',
                    { fileIssues: fileIssues.length > 0 ? fileIssues : undefined }
                );
            } else {
                dbError = new DatabaseError(
                    DB_ERROR.OPERATION_FAILED,
                    m || message || 'Unknown error',
                    { fileIssues: fileIssues.length > 0 ? fileIssues : undefined }
                );
            }
            
            if (i) {
                const cb = this.callbacks.get(i);
                if (cb) {
                    cb.reject(dbError);
                    this.callbacks.delete(i);
                }
            } else {
                reject(dbError);
            }
        }
        else if (t === 'done') {
            const cb = this.callbacks.get(i);
            if (cb) {
                cb.resolve(d);
                this.callbacks.delete(i);
            }
        }
    }

    _handleWorkerError(err, reject, timeoutId) {
        clearTimeout(timeoutId);
        this._logError('Worker error event', err);
        reject(new DatabaseError(
            DB_ERROR.WORKER_CREATION_FAILED,
            err.message,
            'Worker thread error during initialization'
        ));
    }

    _logError(msg, details = null) {
        const error = {
            timestamp: new Date().toISOString(),
            message: msg,
            details: details
        };
        this.errorLog.push(error);
        console.error('❌ DB Error:', msg, details);
    }

    _post(op, sql, params) {
        return new Promise((resolve, reject) => {
            const id = this.nextCallbackId++;
            this.callbacks.set(id, { resolve, reject });
            
            try {
                this.worker.postMessage({ id, op, sql, params });
            } catch (err) {
                this._logError('postMessage failed', err);
                reject(new DatabaseError(
                    DB_ERROR.WORKER_ERROR,
                    err.message
                ));
            }
        });
    }
}

// Create and export the singleton instance
const db = new SQLiteDB();
export default db;