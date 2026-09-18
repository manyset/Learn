// app.js - Your application code that imports and uses SQLiteDB
import SQLiteDB from './sqlite-opfs-module.js';

async function main() {
    console.log('🚀 Starting SQLite OPFS example...');
    
    let db = null;
    
    try {
        // Create and initialize database
        db = new SQLiteDB({
            dbName: 'myapp.db',
            sqlitePath: './jswasm/',
            debug: true
        });
        
        console.log('📁 Initializing database...');
        await db.init();
        console.log('✅ Database initialized');
        
        // Initialize tables
        console.log('📋 Creating tables...');
        await db.initDatabase();
        console.log('✅ Tables ready');
        
        // Add sample data
        console.log('📝 Adding sample data...');
        const result = await db.addSampleData();
        console.log(`✅ Added ${result.count} sample records`);
        
        // Get and print all users
        console.log('\n👥 All Users:');
        const users = await db.getAllUsers();
        
        if (users.length === 0) {
            console.log('  No users found');
        } else {
            users.forEach(user => {
                console.log(`  [${user.id}] ${user.name} - ${user.email} (${user.created})`);
            });
        }
        
        // Get count using raw query
        const countResult = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`\n📊 Total users: ${countResult[0][0]}`);
        
        // Example of custom query
        console.log('\n🔍 Custom query (users with .com email):');
        const emailUsers = await db.query(
            'SELECT name, email FROM users WHERE email LIKE ? ORDER BY name',
            ['%.com']
        );
        emailUsers.forEach(row => {
            console.log(`  ${row[1]} (${row[0]})`);
        });
        
        console.log('\n✅ All operations completed successfully');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    } finally {
        // Always close the database
        if (db) {
            await db.close();
            console.log('👋 Database closed');
        }
    }
}

// Run the application
main().catch(console.error);