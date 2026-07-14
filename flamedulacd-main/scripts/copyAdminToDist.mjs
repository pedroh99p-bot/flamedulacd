import { cp, copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const landingRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const adminRoot = resolve(landingRoot, '..', 'admflamedula-main');
const destination = resolve(landingRoot, 'dist', 'admin');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(resolve(adminRoot, 'assets'), resolve(destination, 'assets'), { recursive: true });
await copyFile(resolve(adminRoot, 'index.html'), resolve(destination, 'index.html'));
await copyFile(resolve(adminRoot, 'login.html'), resolve(destination, 'login.html'));

console.log('Dashboard copied to dist/admin.');
