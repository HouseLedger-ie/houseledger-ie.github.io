// HouseLedger protected submission endpoint.
// Turnstile must be configured in Supabase Secrets as TURNSTILE_SECRET_KEY.
// Siteverify is mandatory and validated server-side, never in the browser.
const ORIGIN = "https://darraghpilko.github.io";
const headers = {"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,authorization","Content-Type":"application/json","Vary":"Origin"};
const respond=(message:string,status=400)=>new Response(JSON.stringify({message}),{status,headers});
const fields=["title","county","year","size","storeys","rooms","method","finish","structure","ber","cost","budget","include_site","breakdown_mode","site","fees","ground","shell","services","interior","external","included","excluded","notes"];
const counties=new Set(["Carlow","Cavan","Clare","Cork","Donegal","Dublin","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim","Limerick","Longford","Louth","Mayo","Meath","Monaghan","Offaly","Roscommon","Sligo","Tipperary","Waterford","Westmeath","Wexford","Wicklow"]);
function validCost(n:unknown,max=100000000){return typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=max}
function validateBuild(x:Record<string,unknown>){
 if(typeof x.title!=="string"||x.title.trim().length<2||x.title.length>140) return false;
 if(!counties.has(String(x.county))||!Number.isInteger(x.year)||Number(x.year)<2000||Number(x.year)>2100)return false;
 if(!validCost(x.size,2000)||Number(x.size)<30||!validCost(x.cost)||Number(x.cost)<1000)return false;
 for(const key of ["budget","site","fees","ground","shell","services","interior","external"]) if(x[key]!=null&&!validCost(x[key]))return false;
 if(x.storeys!=null&&(!Number.isInteger(x.storeys)||Number(x.storeys)<1||Number(x.storeys)>8))return false;
 if(x.rooms!=null&&(!Number.isInteger(x.rooms)||Number(x.rooms)<0||Number(x.rooms)>30))return false;
 for(const key of ["included","excluded","notes"])if(x[key]!=null&&(typeof x[key]!=="string"||String(x[key]).length>(key==="notes"?10000:4000)))return false;
 if(typeof x.include_site!=="boolean"||!["none","manual","file"].includes(String(x.breakdown_mode)))return false;
 const sum=["site","fees","ground","shell","services","interior","external"].reduce((v,k)=>v+Number(x[k]||0),0);
 if(sum>Number(x.cost)+1)return false;
 return true;
}
function validateContact(x:Record<string,unknown>){
 return ["correction","removal","privacy","other"].includes(String(x.request_type))
 &&typeof x.requester_email==="string"&&x.requester_email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.requester_email)
 &&typeof x.message==="string"&&x.message.trim().length>=20&&x.message.length<=3000
 &&(x.build_reference==null||(typeof x.build_reference==="string"&&x.build_reference.length<=200));
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return respond("Method not allowed",405);
 if(req.headers.get("origin")!==ORIGIN)return respond("Invalid origin",403);
 if(Number(req.headers.get("content-length")||0)>30000)return respond("Request too large",413);
 const secret=Deno.env.get("TURNSTILE_SECRET_KEY");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const url=Deno.env.get("SUPABASE_URL");
 if(!secret||!service||!url)return respond("Protected submissions are not configured yet.",503);
 let body:Record<string,unknown>;
 try{body=await req.json();if(!body||typeof body!=="object"||Array.isArray(body)||JSON.stringify(body).length>30000)return respond("Invalid request");}
 catch{return respond("Invalid JSON")}
 const token=body.turnstileToken;
 if(typeof token!=="string"||token.length<1||token.length>2048)return respond("Complete the security check first.",403);
 const kind=body.kind, payload=body.data;
 if((kind!=="build"&&kind!=="contact")||!payload||typeof payload!=="object"||Array.isArray(payload))return respond("Invalid submission");
 const record=payload as Record<string,unknown>;
 if(kind==="build"?!validateBuild(record):!validateContact(record))return respond("Check the information entered.");
 let verified:Record<string,unknown>;
 try{
   const form=new URLSearchParams({secret,response:token});
   const resp=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
   verified=await resp.json();
 }catch{return respond("Security verification unavailable. Please try again later.",503)}
 if(verified.success!==true||verified.hostname!=="darraghpilko.github.io")return respond("Security check failed or expired. Try again.",403);
 const table=kind==="build"?"builds":"privacy_requests";
 const allowed=kind==="build"?fields:["request_type","requester_email","build_reference","message"];
 const insert=Object.fromEntries(allowed.filter(k=>Object.prototype.hasOwnProperty.call(record,k)).map(k=>[k,record[k]]));
 if(kind==="build")insert.status="pending";
 try{
   const response=await fetch(url.replace(/\/$/,"")+"/rest/v1/"+table,{
    method:"POST",headers:{"apikey":service,"Authorization":"Bearer "+service,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(insert)
   });
   if(!response.ok){console.error("HouseLedger insertion failed",response.status,(await response.text()).slice(0,500));return respond(response.status===409?"This submission appears to be a duplicate.":"Unable to save your submission. Please check the information.",422)}
   return new Response(JSON.stringify({ok:true}),{status:201,headers});
 }catch(e){console.error("HouseLedger backend unavailable",e);return respond("Unable to save your submission right now.",503)}
});
