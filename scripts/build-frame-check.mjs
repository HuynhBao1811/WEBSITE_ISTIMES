import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('qa-dist',{recursive:true});
await build({entryPoints:['scripts/frame-check.ts'],outfile:'qa-dist/frame-check.js',bundle:true,format:'esm'});
await copyFile('src/styles.css','qa-dist/styles.css');
await copyFile('src/app/components/scanner/scanner.css','qa-dist/scanner.css');
await copyFile('scripts/frame-check.html','qa-dist/index.html');
console.log('Serve qa-dist on localhost, then open it in a visible browser tab.');
