export const DB_ERROR={SUCCESS:0,INIT_FAILED:1001,OPERATION_FAILED:1003,WORKER_CREATION_FAILED:1004,SQLITE_LOAD_FAILED:1005,DATABASE_OPEN_FAILED:1006,NOT_INITIALIZED:1009,WORKER_ERROR:1010,TIMEOUT:1011,INVALID_SQL:1012,TABLE_EXISTS:1013,TABLE_NOT_FOUND:1014,CONSTRAINT_VIOLATION:1015,DATABASE_LOCKED:1016,CORRUPT_DATABASE:1017};class e extends Error{constructor(e,t,n=null){super(t);this.name=`DatabaseError`;this.code=e;this.details=n;this.timestamp=new Date().toISOString();this.userMessage=this._getUserMessage(e,t)}_getUserMessage(e,t){const n={[DB_ERROR.INIT_FAILED]:`Database initialization failed. Please check your connection.`,[DB_ERROR.OPERATION_FAILED]:`Database operation failed. Please try again.`,[DB_ERROR.WORKER_CREATION_FAILED]:`Unable to start database worker. Check browser settings.`,[DB_ERROR.SQLITE_LOAD_FAILED]:`SQLite engine failed to load. Check if files exist in jswasm/`,[DB_ERROR.DATABASE_OPEN_FAILED]:`Cannot open database file. Check permissions and storage.`,[DB_ERROR.NOT_INITIALIZED]:`Database not initialized. Call init() first.`,[DB_ERROR.WORKER_ERROR]:`Database worker communication error.`,[DB_ERROR.TIMEOUT]:`Operation timed out. Please try again.`,[DB_ERROR.INVALID_SQL]:`Invalid SQL statement provided.`,[DB_ERROR.TABLE_EXISTS]:`Table already exists.`,[DB_ERROR.TABLE_NOT_FOUND]:`Table does not exist. Create it first.`,[DB_ERROR.CONSTRAINT_VIOLATION]:`Data violates database constraint (unique, foreign key, etc).`,[DB_ERROR.DATABASE_LOCKED]:`Database is locked by another tab. Close other tabs and try again.`,[DB_ERROR.CORRUPT_DATABASE]:`Database file is corrupt. Try deleting and recreating.`};return n[e]||`Database error: ${t}`}toJSON(){return{success:false,code:this.code,message:this.message,userMessage:this.userMessage,details:this.details,timestamp:this.timestamp}}}class t{constructor(t={}){this.worker=null;this.ready=false;this.initPromise=null;this.callbacks=new Map;this.nextCallbackId=1;this.options={dbName:t.dbName||`app.db`,sqlitePath:t.sqlitePath||`./jswasm/`,initTimeout:t.initTimeout||5e3};this.tabId=Math.random().toString(36).substring(2,10);this.dbStatus=null;this.errorLog=[];this.DatabaseError=e;console.log(`📁 DB: ${this.options.dbName} | Tab: ${this.tabId}`)}async init(){if(this.initPromise)return this.initPromise;this.initPromise=new Promise((t,n)=>{const r=setTimeout(()=>{this._logError(`Initialization timeout`);n(new e(DB_ERROR.TIMEOUT,`Database initialization timed out after ${this.options.initTimeout}ms`,`Check that SQLite files exist in jswasm/ and headers are set correctly`))},this.options.initTimeout);try{const e=window.location.href.substring(0,window.location.href.lastIndexOf(`/`)+1);const i=e+this.options.sqlitePath;const a=this._createWorkerCode(i);const o=new Blob([a],{type:`application/javascript`});const s=URL.createObjectURL(o);this.worker=new Worker(s);this.worker.onmessage=e=>this._handleWorkerMessage(e,t,n,r);this.worker.onerror=e=>this._handleWorkerError(e,n,r)}catch(t){clearTimeout(r);this._logError(`Worker creation failed`,t);n(new e(DB_ERROR.WORKER_CREATION_FAILED,t.message,`Failed to create database worker thread`))}});return this.initPromise}async exec(t,n=[]){if(!this.ready){throw new e(DB_ERROR.NOT_INITIALIZED,`Database not initialized`)}try{const e=await this._post(`exec`,t,n);if(e?.error){throw this._parseSQLiteError(e.error)}return{changes:e?.c||0,lastInsertRowid:e?.id||0}}catch(e){this._logError(e);throw e}}async query(t,n=[]){if(!this.ready){throw new e(DB_ERROR.NOT_INITIALIZED,`Database not initialized. Call init() first.`)}if(!t||typeof t!==`string`){throw new e(DB_ERROR.INVALID_SQL,`Invalid SQL statement`)}try{const e=await this._post(`query`,t,n);if(e&&e.error){throw this._parseSQLiteError(e.error)}return e||[]}catch(e){this._logError(e);throw e}}async transaction(){const e=await this.exec(`BEGIN TRANSACTION;`);return e}async commit(){const e=await this.exec(`COMMIT;`);return e}async rollback(){const e=await this.exec(`ROLLBACK;`);return e}async getTableData(e,t={}){try{let n=`SELECT * FROM ${e}`;const r=[];if(t.where){n+=` WHERE ${t.where}`}if(t.orderBy){n+=` ORDER BY ${t.orderBy}`}if(t.limit){n+=` LIMIT ?`;r.push(t.limit)}if(t.offset){n+=` OFFSET ?`;r.push(t.offset)}const i=await this.query(n,r);const a=i.length>0?Object.keys(i[0]):[];return{success:true,columns:a,rows:i,count:i.length,gridData:{columns:a.map(e=>({field:e,headerName:e,...t.columnDefs?.[e]})),rows:i}}}catch(e){return{success:false,error:e.message,code:e.code,userMessage:e.userMessage,columns:[],rows:[]}}}async tableExists(e){try{const t=await this.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,[e]);return t.length>0}catch(e){return false}}async getTables(){try{return await this.query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)}catch(e){return[]}}async close(){if(this.worker){this.worker.terminate();this.worker=null;this.ready=false;this.initPromise=null;this.dbStatus=null}return{success:true}}getInitStatus(){return this.dbStatus}clearErrors(){this.errorLog=[]}async _checkFileAccess(){const e=[];if(!navigator.storage||!navigator.storage.getDirectory){e.push({type:`OPFS_UNAVAILABLE`,message:`Origin Private File System (OPFS) is not supported in this browser`,severity:`critical`});return e}try{const t=await navigator.storage.getDirectory();const n=`_access_test_${Date.now()}.tmp`;try{const r=await t.getFileHandle(n,{create:true});try{const i=await r.createSyncAccessHandle();try{const e=new TextEncoder;const r=e.encode(`test`);i.write(r,{at:0});i.flush();const a=new ArrayBuffer(4);i.read(a,{at:0});i.close();await t.removeEntry(n)}catch(t){e.push({type:`WRITE_FAILED`,message:`Cannot write to OPFS: ${t.message}`,technical:t.toString(),severity:`critical`})}}catch(r){e.push({type:`SYNC_HANDLE_FAILED`,message:`Cannot create sync access handle: ${r.message}`,technical:r.toString(),severity:`critical`});try{await t.removeEntry(n)}catch(e){}}}catch(t){e.push({type:`FILE_CREATION_FAILED`,message:`Cannot create test file: ${t.message}`,technical:t.toString(),severity:`critical`})}if(navigator.storage&&navigator.storage.estimate){const t=await navigator.storage.estimate();const n=t.usage/t.quota*100;if(n>90){e.push({type:`LOW_DISK_SPACE`,message:`Low disk space: ${n.toFixed(1)}% used`,details:{used:this._formatBytes(t.usage),quota:this._formatBytes(t.quota),percent:n},severity:`warning`})}}}catch(t){e.push({type:`ROOT_ACCESS_FAILED`,message:`Cannot access OPFS root: ${t.message}`,technical:t.toString(),severity:`critical`})}try{const t=await this._checkHeaders();if(!t.coop||!t.coep){e.push({type:`MISSING_HEADERS`,message:`Required COOP/COEP headers are missing`,details:t,severity:`critical`,fix:`Add these headers to IIS: Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp`})}}catch(e){}return e}async _checkHeaders(){try{const e=await fetch(window.location.href,{method:`HEAD`});return{coop:e.headers.get(`cross-origin-opener-policy`),coep:e.headers.get(`cross-origin-embedder-policy`)}}catch(e){return{coop:null,coep:null}}}_formatBytes(e){if(e===0)return`0 Bytes`;const t=1024;const n=[`Bytes`,`KB`,`MB`,`GB`];const r=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,r)).toFixed(2))+` `+n[r]}_parseSQLiteError(t){const n=t.toLowerCase();if(n.includes(`already exists`)||n.includes(`duplicate`)){return new e(DB_ERROR.CONSTRAINT_VIOLATION,t,`This record already exists or violates a unique constraint`)}if(n.includes(`no such table`)){return new e(DB_ERROR.TABLE_NOT_FOUND,t,`The table does not exist. Create it first with CREATE TABLE`)}if(n.includes(`locked`)||n.includes(`busy`)||n.includes(`access handle`)){return new e(DB_ERROR.DATABASE_LOCKED,t,`Database is locked by another tab. Try again or close other tabs`)}if(n.includes(`corrupt`)||n.includes(`malformed`)){return new e(DB_ERROR.CORRUPT_DATABASE,t,`Database file may be corrupt. Try deleting and recreating`)}return new e(DB_ERROR.OPERATION_FAILED,t)}_parseError(t){const n=t.message?.toLowerCase()||``;if(n.includes(`postmessage`)||n.includes(`clone`)){return new e(DB_ERROR.WORKER_ERROR,t.message,`Check that only plain data is being sent through postMessage`)}if(n.includes(`timeout`)){return new e(DB_ERROR.TIMEOUT,t.message)}return new e(DB_ERROR.OPERATION_FAILED,t.message||`Unknown error`)}_createWorkerCode(e){return`
            const jswasmPath = '${e}';
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
                            // Use exec with rowMode: "object" to get named properties
                            self.db.exec({
                                sql: sql,
                                bind: params,
                                rowMode: "object",
                                callback: (row) => {
                                    rows.push(row);
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
        `}async _handleWorkerMessage(t,n,r,i){const{type:a,t:o,i:s,d:c,m:l,s:u,level:d,message:f,tabId:p,status:m,code:h}=t.data;if(a===`log`){console.log(`[Worker ${p}] ${d}: ${f}`);return}if(a===`ready`){clearTimeout(i);this.ready=true;this.dbStatus=m;console.log(`✅ Worker ready - database ${m}`);n({success:true,status:m,message:`Database ${m} successfully`})}else if(a===`error`){clearTimeout(i);let t=[];if(h===1006){console.log(`🔍 Database open failed - running file access diagnostics...`);t=await this._checkFileAccess()}let n;if(h===1005){n=new e(DB_ERROR.SQLITE_LOAD_FAILED,l||f||`SQLite load failed`,{fileIssues:t.length>0?t:undefined})}else if(h===1006){n=new e(DB_ERROR.DATABASE_OPEN_FAILED,l||f||`Database open failed`,{fileIssues:t.length>0?t:undefined})}else{n=new e(DB_ERROR.OPERATION_FAILED,l||f||`Unknown error`,{fileIssues:t.length>0?t:undefined})}if(s){const e=this.callbacks.get(s);if(e){e.reject(n);this.callbacks.delete(s)}}else{r(n)}}else if(o===`done`){const e=this.callbacks.get(s);if(e){e.resolve(c);this.callbacks.delete(s)}}}_handleWorkerError(t,n,r){clearTimeout(r);this._logError(`Worker error event`,t);n(new e(DB_ERROR.WORKER_CREATION_FAILED,t.message,`Worker thread error during initialization`))}_logError(e){const t={timestamp:new Date().toISOString(),message:e.message,code:e.code};this.errorLog.push(t);if(this.errorLog.length>50){this.errorLog.shift()}console.error(`❌ DB Error:`,e.userMessage||e.message)}_post(t,n,r){return new Promise((i,a)=>{const o=this.nextCallbackId++;this.callbacks.set(o,{resolve:i,reject:a});try{this.worker.postMessage({id:o,op:t,sql:n,params:r})}catch(t){this._logError(`postMessage failed`,t);a(new e(DB_ERROR.WORKER_ERROR,t.message))}})}}const n=new t;export default n;