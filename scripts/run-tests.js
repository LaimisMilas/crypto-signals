import { spawn } from 'child_process';

const proc = spawn('node', ['--test', 'test'], { stdio: 'inherit' });
proc.on('close', code => process.exit(code));
