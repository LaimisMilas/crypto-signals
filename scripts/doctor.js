// scripts/doctor.js
import fs from 'fs';
import path from 'path';

function checkFile(p) {
    const ok = fs.existsSync(p);
    console.log(`${ok ? 'OK   ' : 'MISS '} ${p}`);
    return ok;
}

console.log('=== Files ===');
const files = [
    'package.json',
    'scripts/run-backtest.js',
    'src/strategy.js',
    'src/backtest/indicators.js',
    'src/db.js'
];
files.forEach(checkFile);

console.log('\n=== Env (tik buvimas) ===');
console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('TELEGRAM_BOT_TOKEN:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_PRIVATE_CHAT_ID:', !!process.env.TELEGRAM_PRIVATE_CHAT_ID);

console.log('\n=== package.json scripts ===');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json','utf-8'));
    console.log(pkg.scripts || {});
} catch(e) {
    console.log('Nepavyko perskaityti package.json');
}

console.log('\n=== Grep sqlite ===');
try {
    const list = ['src','scripts']
        .flatMap(dir => fs.existsSync(dir) ? fs.readdirSync(dir).map(f => path.join(dir,f)) : [])
        .filter(p => fs.statSync(p).isFile() && p.endsWith('.js'));
    let found = false;
    for (const f of list) {
        const t = fs.readFileSync(f,'utf-8');
        if (t.includes('sqlite')) { console.log('->', f); found = true; }
    }
    if (!found) console.log('Nerasta');
} catch(e) {
    console.log('Nerasta');
}
