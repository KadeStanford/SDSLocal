const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost:4207');}catch{res.writeHead(400);res.end();return;}
 const name=url.pathname==='/'?'dashboard.html':url.pathname.slice(1);
 let file;
 if(['dashboard.html','mobile.html','coverage.json'].includes(name))file=path.join(root,'offline',name);
 else if(/^runner\/public\/captures\/[a-zA-Z0-9_-]+\.png$/.test(name))file=path.join(root,name);
 else if(/^captures\/[a-zA-Z0-9_-]+\.png$/.test(name))file=path.join(root,'runner/public',name);
 else {res.writeHead(404);res.end('Review resource not found');return;}
 if(!fs.existsSync(file)){res.writeHead(404);res.end('Review resource not found');return;}
 res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json; charset=utf-8':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 fs.createReadStream(file).pipe(res);
});
server.listen(4207,'127.0.0.1',()=>console.log('READY http://localhost:4207/dashboard.html · prepared mobile review only · PID '+process.pid));
