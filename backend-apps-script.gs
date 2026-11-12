/* Backend jadwal kuliah (Google Apps Script di Google Sheets): jadwal yang bisa diedit, pengumuman, token & gacha banner, obrolan, catatan, libur/dosen/ubah jam, log kunjungan, maintenance.
   GANTI PIN_UTAMA (founder) di bawah dengan PIN rahasia. */
const PIN_UTAMA='ganti-pin-utama';
const KELAS={
  SI1B:{pre:'',pins:{[PIN_UTAMA]:'founder'}}
};
const TZ='Asia/Jayapura',HARIAN=3;
const BANNER={pagi:'c',mint:'c',senja:'c',lavender:'c',aurora:'r',samudra:'r',sakura:'r',galaksi:'e',lava:'e',neon:'e',emas:'l',pelangi:'l',langit:'r',kawaii:'r',hujan:'r',shonen:'e',cyber:'e',mahou:'e',manga:'e',mata:'e',torii:'l'};
const BOBOT={c:60,r:28,e:9,l:3};
const HDR={
  libur:['tanggal','kunci','alasan','dibuat','status','jam'],
  kunjungan:['waktu','perangkat','jenis'],
  jadwal:['id','hari','mulai','selesai','nama','ruang','kode','dosen'],
  umum:['id','waktu','judul','isi','aktif'],
  akun:['cid','token','inv','klaim','pakai','dibuat']
};
function kls_(x){return KELAS[x]?x:'SI1B'}
function sheet_(n,k){
  const ss=SpreadsheetApp.getActiveSpreadsheet(),nm=KELAS[k].pre+n;
  let sh=ss.getSheetByName(nm);
  if(!sh){
    sh=ss.insertSheet(nm);
    if(n==='libur')sh.getRange('A:B').setNumberFormat('@');
    if(n==='jadwal'){sh.getRange('C:D').setNumberFormat('@');sh.getRange('G:G').setNumberFormat('@')}
    if(n==='akun')sh.getRange('C:D').setNumberFormat('@');
    sh.appendRow(HDR[n]||['waktu','kunci','nama','isi','sembunyi','admin','pemilik','banner']);
  }
  return sh;
}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function clean_(v,n){
  v=String(v||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
  return /^[=+\-@]/.test(v)?' '+v:v;
}
function cidc_(v){return String(v||'').replace(/[^A-Za-z0-9]/g,'').slice(0,32)}
function today_(){return Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd')}
function fd_(x){return x instanceof Date?Utilities.formatDate(x,TZ,'yyyy-MM-dd'):String(x)}
function ft_(x){return x instanceof Date?Utilities.formatDate(x,TZ,'HH:mm'):String(x)}
function role_(p,k){p=String(p||'');return p.length>=4&&Object.prototype.hasOwnProperty.call(KELAS[k].pins,p)?KELAS[k].pins[p]:''}
function isAdmin_(p,k){return role_(p,k)!==''}
function ok_(p,k){
  if(!isAdmin_(p,k)){Utilities.sleep(800);return false}
  return true;
}
function okF_(p,k){
  if(role_(p,k)!=='founder'){Utilities.sleep(800);return false}
  return true;
}
function maint_(k){
  try{return JSON.parse(PropertiesService.getScriptProperties().getProperty('maint_'+k)||'{"on":false,"note":""}')}
  catch(e){return{on:false,note:''}}
}
function akun_(k,cid,buat){
  const sh=sheet_('akun',k),last=sh.getLastRow();
  if(last>=2){
    const v=sh.getRange(2,1,last-1,6).getValues();
    for(let i=0;i<v.length;i++)if(String(v[i][0])===cid)return{sh:sh,row:i+2,v:v[i]};
  }
  if(!buat)return null;
  const v=[cid,0,'','','',today_()];
  sh.appendRow(v);
  return{sh:sh,row:sh.getLastRow(),v:v};
}
function inv_(a){return String(a.v[2]||'').split(',').filter(x=>BANNER[x])}
function info_(a,role){
  const f=role==='founder';
  return{token:f?-1:(Number(a.v[1])||0),inf:f,inv:f?Object.keys(BANNER):inv_(a),klaim:fd_(a.v[3]),pakai:String(a.v[4]||''),kode:String(a.v[0]).slice(0,8).toUpperCase(),hari:today_()};
}
function pick_(){
  let x=Math.random()*(BOBOT.c+BOBOT.r+BOBOT.e+BOBOT.l),r='c';
  for(const q of ['c','r','e','l']){if(x<BOBOT[q]){r=q;break}x-=BOBOT[q]}
  const ids=Object.keys(BANNER).filter(i=>BANNER[i]===r);
  return ids[Math.floor(Math.random()*ids.length)];
}
function doGet(e){
  const t=e.parameter.type,k=kls_(e.parameter.kls);
  if(t==='maint')return out_(maint_(k));
  if(t==='jadwal'){
    if(PropertiesService.getScriptProperties().getProperty('jadwal_'+k)!=='1')return out_({set:false,items:[]});
    const sh=sheet_('jadwal',k),last=sh.getLastRow();
    const v=last<2?[]:sh.getRange(2,1,last-1,8).getValues();
    return out_({set:true,items:v.map(r=>({h:Number(r[1]),a:ft_(r[2]),b:ft_(r[3]),n:String(r[4]),r:String(r[5]),c:String(r[6]),d:String(r[7])}))});
  }
  if(t==='umum'){
    const sh=sheet_('umum',k),last=sh.getLastRow();
    if(last<2)return out_([]);
    const start=Math.max(2,last-49),v=sh.getRange(start,1,last-start+1,5).getValues();
    return out_(v.filter(r=>r[4]!=='x').slice(-5).reverse().map(r=>({id:String(r[0]),t:r[1],j:String(r[2]),i:String(r[3])})));
  }
  if(t==='libur'){
    const sh=sheet_('libur',k),last=sh.getLastRow();
    if(last<2)return out_([]);
    const start=Math.max(2,last-199);
    const rows=sh.getRange(start,1,last-start+1,6).getValues();
    return out_(rows.filter(r=>r[0]).map(r=>({d:fd_(r[0]),k:String(r[1]),a:r[2],s:r[4]==='dosen'?'dosen':r[4]==='jam'?'jam':'libur',j:String(r[5]||'')})));
  }
  const chat=t==='chat';
  const sh=sheet_(chat?'chat':'catatan',k),last=sh.getLastRow();
  if(last<2)return out_([]);
  const max=chat?60:500,start=Math.max(2,last-max+1);
  const rows=sh.getRange(start,1,last-start+1,8).getValues();
  const cid=cidc_(e.parameter.cid);
  return out_(rows.map((r,i)=>({r:r,id:start+i})).filter(o=>!o.r[4]).map(o=>({id:o.id,t:o.r[0],k:String(o.r[1]),n:o.r[2],m:o.r[3],adm:String(o.r[5]||''),bn:BANNER[o.r[7]]?String(o.r[7]):'',own:cid.length>=8&&String(o.r[6])===cid})));
}
function doPost(e){
  try{
    const d=JSON.parse(e.postData.contents),k=kls_(d.kls);
    if(d.type==='admin_check'){
      const ok=ok_(d.pin,k);
      return out_({ok:ok,role:ok?role_(d.pin,k):''});
    }
    if(d.type==='jadwal_save'){
      if(!ok_(d.pin,k))return out_({ok:false});
      const it=Array.isArray(d.items)?d.items:null;
      if(!it||it.length>40)return out_({ok:false,err:'items'});
      const rows=[],wk=/^([01]\d|2[0-3]):[0-5]\d$/;
      for(const x of it){
        const h=parseInt(x.h,10),a=String(x.a||''),b=String(x.b||''),n=clean_(x.n,80);
        if(!(h>=0&&h<=6)||!wk.test(a)||!wk.test(b)||a>=b||!n)return out_({ok:false,err:'item'});
        rows.push([rows.length+1,h,a,b,n,clean_(x.r,40),clean_(x.c,40),clean_(x.d,80)]);
      }
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      try{
        const sh=sheet_('jadwal',k),last=sh.getLastRow();
        if(last>1)sh.deleteRows(2,last-1);
        if(rows.length)sh.getRange(2,1,rows.length,8).setValues(rows);
        PropertiesService.getScriptProperties().setProperty('jadwal_'+k,'1');
      }finally{lock.releaseLock()}
      return out_({ok:true});
    }
    if(d.type==='umum_add'){
      if(!ok_(d.pin,k))return out_({ok:false});
      const j=clean_(d.judul,60),i=clean_(d.isi,500);
      if(!i)return out_({ok:false,err:'isi'});
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      try{sheet_('umum',k).appendRow([new Date().getTime().toString(36)+Math.floor(Math.random()*36).toString(36),new Date().toISOString(),j,i,''])}
      finally{lock.releaseLock()}
      return out_({ok:true});
    }
    if(d.type==='umum_del'){
      if(!ok_(d.pin,k))return out_({ok:false});
      const id=String(d.id||''),sh=sheet_('umum',k),last=sh.getLastRow();
      if(last>=2){
        const v=sh.getRange(2,1,last-1,1).getValues();
        for(let r=0;r<v.length;r++)if(String(v[r][0])===id){sh.getRange(r+2,5).setValue('x');return out_({ok:true})}
      }
      return out_({ok:false});
    }
    if(d.type==='akun'||d.type==='klaim'||d.type==='gacha'||d.type==='pakai'){
      const cid=cidc_(d.cid);
      if(cid.length<8)return out_({ok:false});
      const role=role_(d.pin,k),lock=LockService.getScriptLock();
      lock.waitLock(5000);
      try{
        const a=akun_(k,cid,true),res={ok:true};
        if(d.type==='klaim'&&role!=='founder'&&fd_(a.v[3])!==today_()){
          a.v[1]=(Number(a.v[1])||0)+HARIAN;a.v[3]=today_();res.dapat=HARIAN;
        }
        if(d.type==='gacha'){
          let tok=Number(a.v[1])||0;
          if(role!=='founder'&&tok<1)return out_({ok:false,err:'token'});
          if(role!=='founder')tok-=1;
          const id=pick_(),inv=inv_(a),baru=inv.indexOf(id)<0;
          if(baru)inv.push(id);else if(role!=='founder')tok+=1;
          a.v[1]=tok;a.v[2]=inv.join(',');res.hadiah=id;res.baru=baru;
        }
        if(d.type==='pakai'){
          const bn=String(d.bn||'');
          if(bn!==''&&!BANNER[bn])return out_({ok:false});
          if(bn!==''&&role!=='founder'&&inv_(a).indexOf(bn)<0)return out_({ok:false,err:'belum punya'});
          a.v[4]=bn;
        }
        a.sh.getRange(a.row,2,1,4).setValues([[a.v[1],a.v[2],a.v[3],a.v[4]]]);
        res.info=info_(a,role);
        return out_(res);
      }finally{lock.releaseLock()}
    }
    if(d.type==='token_beri'){
      if(!okF_(d.pin,k))return out_({ok:false});
      const kode=String(d.kode||'').replace(/[^A-Za-z0-9]/g,'').toLowerCase(),n=parseInt(d.jumlah,10);
      if(kode.length<6||!(n>=0&&n<=9999))return out_({ok:false,err:'input'});
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      try{
        const sh=sheet_('akun',k),last=sh.getLastRow();
        if(last>=2){
          const v=sh.getRange(2,1,last-1,2).getValues();
          for(let i=0;i<v.length;i++)if(String(v[i][0]).toLowerCase().indexOf(kode)===0){
            const baru=d.mode==='atur'?n:(Number(v[i][1])||0)+n;
            sh.getRange(i+2,2).setValue(baru);
            return out_({ok:true,token:baru});
          }
        }
      }finally{lock.releaseLock()}
      return out_({ok:false,err:'kode'});
    }
    if(d.type==='libur_set'||d.type==='libur_del'){
      if(!ok_(d.pin,k))return out_({ok:false});
      const date=String(d.date||''),key=String(d.key||'');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^(ALL|[A-Za-z0-9]{1,20})$/.test(key))return out_({ok:false});
      const st=d.status==='dosen'?'dosen':d.status==='jam'?'jam':'libur';
      let jam='';
      if(d.type==='libur_set'&&st==='jam'){
        jam=String(d.jam||'');
        const m=/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(jam);
        if(!m||key==='ALL'||+m[1]>23||+m[3]>23||+m[2]>59||+m[4]>59||(+m[1]*60+ +m[2])>=(+m[3]*60+ +m[4]))return out_({ok:false});
      }
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      const sh=sheet_('libur',k),last=sh.getLastRow();
      for(let r=last;r>=2;r--){
        const v=sh.getRange(r,1,1,2).getValues()[0];
        if(fd_(v[0])===date&&String(v[1])===key)sh.deleteRow(r);
      }
      if(d.type==='libur_set')sh.appendRow([date,key,clean_(d.reason,100),new Date().toISOString(),st,jam]);
      lock.releaseLock();
      return out_({ok:true});
    }
    if(d.type==='visit'){
      const cid=cidc_(d.cid);
      if(cid.length<8)return out_({ok:false});
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      sheet_('kunjungan',k).appendRow([new Date().toISOString(),cid,clean_(d.dev,10)]);
      lock.releaseLock();
      return out_({ok:true});
    }
    if(d.type==='visit_log'){
      if(!okF_(d.pin,k))return out_({ok:false});
      const sh=sheet_('kunjungan',k),last=sh.getLastRow();
      if(last<2)return out_({ok:true,total:0,uniq:0,rows:[]});
      const uniq=new Set(sh.getRange(2,2,last-1,1).getValues().map(r=>r[0])).size;
      const start=Math.max(2,last-299);
      const rows=sh.getRange(start,1,last-start+1,3).getValues().map(r=>({t:r[0],c:String(r[1]),dv:String(r[2])}));
      return out_({ok:true,total:last-1,uniq:uniq,rows:rows});
    }
    if(d.type==='maint_set'){
      if(!okF_(d.pin,k))return out_({ok:false});
      PropertiesService.getScriptProperties().setProperty('maint_'+k,JSON.stringify({on:d.on===true,note:clean_(d.note,200)}));
      return out_({ok:true});
    }
    if(d.type==='del'){
      const nm=d.board==='chat'?'chat':d.board==='notes'?'catatan':null;
      if(!nm)return out_({ok:false});
      const sh=sheet_(nm,k),row=parseInt(d.id,10);
      if(!(row>=2&&row<=sh.getLastRow()))return out_({ok:false});
      const cid=cidc_(d.cid);
      const lock=LockService.getScriptLock();lock.waitLock(5000);
      const r=sh.getRange(row,1,1,7).getValues()[0];
      const boleh=isAdmin_(d.pin,k)||(cid.length>=8&&String(r[6])===cid);
      if(boleh)sh.getRange(row,5).setValue('x');
      lock.releaseLock();
      return out_({ok:boleh});
    }
    const name=d.type==='chat'?'chat':d.type==='notes'?'catatan':null;
    if(!name)return out_({ok:false});
    const role=role_(d.pin,k);
    let nama=clean_(d.name,24)||'Anonim';
    if(!role&&/\b(admin|founder)\b/i.test(nama))nama='Anonim';
    if(role==='admin'&&/\bfounder\b/i.test(nama))nama='Anonim';
    const isi=clean_(d.text,300);
    const key=String(d.key||'').replace(/[^A-Za-z0-9]/g,'').slice(0,20);
    if(!isi)return out_({ok:false});
    const cid=cidc_(d.cid);
    let bn='';
    if(cid.length>=8){
      const a=akun_(k,cid,false);
      if(a){const p=String(a.v[4]||'');if(BANNER[p]&&(role==='founder'||inv_(a).indexOf(p)>=0))bn=p}
    }
    const lock=LockService.getScriptLock();lock.waitLock(5000);
    sheet_(name,k).appendRow([new Date().toISOString(),key,nama,isi,'',role,cid,bn]);
    lock.releaseLock();
    return out_({ok:true});
  }catch(err){return out_({ok:false})}
}
