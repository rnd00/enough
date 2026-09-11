import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../docs',import.meta.url));
createServer(async (req,res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) {res.writeHead(403).end(); return;}
    const data = await readFile(path);
    res.writeHead(200, {'Content-Type': ({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'})[extname(path)] || 'application/octet-stream'}).end(data);
  } catch {res.writeHead(404).end('Not found');}
}).listen(4173, '127.0.0.1', () => console.log('Enough: http://localhost:4173'));

