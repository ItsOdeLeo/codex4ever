import { createServer } from 'node:http';
import { randomBytes,timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Serve the built frontend only. Account data stays in memory behind a per-run
// capability; no repository files or Codex credentials are exposed over HTTP.
const assets=new Map([
  ['/','index.html'],['/app.js','app.js'],['/app.css','app.css'],
  ['/guide/','guide/index.html'],['/zh/guide/','zh/guide/index.html'],
  ['/guide.css','guide.css'],
  ['/experiments/public-reset-events.json','experiments/public-reset-events.json']
]);
const mime=file=>file.endsWith('.js') ? 'text/javascript; charset=utf-8'
  : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';

export async function startPlannerPage({root,port=0}={}) {
  const token=randomBytes(32).toString('hex');
  let session=null,revision=0,refresh=null,pendingRefresh=null,origin;
  const server=createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
    const send=(status,body,type='application/json; charset=utf-8')=>{
      res.writeHead(status,{...headers,'Content-Type':type});res.end(body);
    };
    try {
      if(req.headers.host!==new URL(origin).host || req.headers.origin&&req.headers.origin!==origin
        || req.headers['sec-fetch-site']==='cross-site')return send(403,'{"error":"Local requests only"}');
      const address=new URL(req.url,origin),path=address.pathname;
      if(path.startsWith('/api/')) {
        const supplied=Buffer.from(req.headers.authorization??''),expected=Buffer.from(`Bearer ${token}`);
        if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return send(401,'{"error":"Planner access required"}');
        if(path==='/api/session'&&req.method==='GET')return send(200,JSON.stringify({revision,
          ...(address.searchParams.get('after')===String(revision) ? {} : {session})}));
        if(path==='/api/refresh'&&req.method==='POST') {
          if(!refresh)return send(503,'{"error":"Planner is not ready"}');
          let body='';
          for await(const chunk of req) {
            body+=chunk;
            if(Buffer.byteLength(body)>2048)return send(413,'{"error":"Request too large"}');
          }
          let preferences;
          try {preferences=body ? JSON.parse(body) : {};}catch {return send(400,'{"error":"Invalid JSON"}');}
          // Serialize explicit refreshes so a late response cannot restore an
          // older set of preferences. No background account/crawler loop.
          const operation=(pendingRefresh??Promise.resolve()).catch(()=>{}).then(()=>refresh(preferences));
          pendingRefresh=operation;
          try {await operation;}finally {if(pendingRefresh===operation)pendingRefresh=null;}
          return send(200,JSON.stringify({revision,session}));
        }
        return send(404,'{"error":"Unknown endpoint"}');
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'Method not allowed','text/plain');
      const file=assets.get(path);
      if(!file)return send(404,'Not found','text/plain');
      const body=await readFile(new URL(file,root));
      res.writeHead(200,{...headers,'Content-Type':mime(file)});res.end(req.method==='HEAD' ? undefined : body);
    }catch(error){send(500,JSON.stringify({error:error.message}));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  return {
    url:`${origin}/#planner=${token}`,
    publish(value){session=structuredClone(value);revision++;},
    getSession(){return session&&structuredClone(session);},
    setRefresh(callback){refresh=callback;},
    async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  };
}
