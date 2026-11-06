/* Motion engine: deterministic render of the whole timeline at any time T (seconds). */
const D = window.DATA;
const CUST = {
  mindef:{name:"MINDEF / SAF",icon:"🪖",hue:"#7ed0a0"}, ica:{name:"ICA",icon:"🛂",hue:"#ffb86b"},
  roams:{name:"ROAMS · remote operations",icon:"🛰️",hue:"#b9a7ff"}, police:{name:"Police",icon:"👮",hue:"#6fb7ff"},
  dsta:{name:"DSTA",icon:"🔬",hue:"#ff8fa3"}, htx:{name:"HTX",icon:"🧪",hue:"#8ff0e8"},
  airport:{name:"Airport",icon:"✈️",hue:"#ffd166"}, dc:{name:"Data centre",icon:"🖥️",hue:"#9fd3ff"}, "":{name:"",icon:"",hue:"#4fa3ff"}
};
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const eo=x=>{x=clamp(x,0,1);return 1-Math.pow(1-x,3);};
const eio=x=>{x=clamp(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const P=(tl,t0,d=0.6)=>eo((tl-t0)/d);
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;}
function rv(e,p,dy=26,sc=1){e.style.opacity=p;e.style.transform=`translateY(${(1-p)*dy}px) scale(${sc+(1-sc)*(1-p)*0})`;}
function pop(e,p){e.style.opacity=p;const s=0.86+0.14*p;e.style.transform=`scale(${s})`;}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}
function nl(s){return esc(s).replace(/\n/g,"<br>");}

const stage=document.getElementById('stage');
const scenes=D.scenes.map(buildScene);

function header(sc){
  const c=CUST[sc.customer||""];
  const h=el('div','hdr');
  h.innerHTML=`<div class="hk">${c.icon?`<span class="hicon">${c.icon}</span><span class="hname" style="color:${c.hue}">${esc(c.name)}</span>`:""}${sc.persona?`<span class="hpersona">· ${esc(sc.persona)}</span>`:""}</div><div class="ht">${esc(sc.title)}</div>`;
  return h;
}
function byKey(sc,key){return sc.beats.filter(b=>b[key]!==undefined);}
function beatT(sc,key,val){const b=sc.beats.find(b=>b[key]===val);return b?b.t:1e9;}
function beatTAny(sc,keys,val){let t=1e9;for(const k of keys){const b=sc.beats.find(b=>b[k]===val);if(b&&b.t<t)t=b.t;}return t;}

function buildScene(sc,idx){
  const root=el('div','scene');root.style.opacity=0;stage.appendChild(root);
  const hue=CUST[sc.customer||""].hue; root.style.setProperty('--hue',hue);
  let update=()=>{};
  const type=sc.type;

  if(type==='vignettes'){
    root.appendChild(el('div','vtitle',`<div class="vk">BEIJING · 3–4 NOVEMBER 2026 · A CUSTOMER-FIRST RECAP</div><div class="vt">Three nights, one question</div>`));
    const row=el('div','vrow');root.appendChild(row);
    const panels=[];
    const defs=[["02:00 · Camp perimeter","fence"],["06:00 · Airport lane 3","queue"],["09:00 · Land checkpoint","passport"]];
    defs.forEach(([lab,kind],i)=>{
      const p=el('div','vpanel');p.innerHTML=`<div class="vlab">${lab}</div><div class="vart" data-kind="${kind}"></div><div class="vq">?</div>`;row.appendChild(p);panels.push(p);
      const art=p.querySelector('.vart');
      if(kind==='fence'){art.innerHTML=`<svg viewBox="0 0 520 260" width="520" height="260"><g stroke="#8fb0e8" stroke-width="4" fill="none">${[0,1,2,3,4,5,6].map(k=>`<line x1="${40+k*73}" y1="40" x2="${40+k*73}" y2="230"/>`).join("")}<polyline id="w1" points=""/><polyline id="w2" points=""/><polyline id="w3" points=""/></g><text id="ftxt" x="260" y="250" fill="#ffd166" font-size="20" text-anchor="middle" opacity="0">zone 7 · movement</text></svg>`;}
      if(kind==='queue'){art.innerHTML=`<div class="qgrid"></div><div class="qcount">0 waiting</div>`;}
      if(kind==='passport'){art.innerHTML=`<div class="pp"><div class="ppbook">📖<div class="scanbar"></div></div><div class="ppst"><div class="pps" id="s1">passport · reading…</div><div class="pps" id="s2">face · no match</div><div class="pps" id="s3">car · 4 occupants · unseen</div></div></div>`;}
    });
    const q=el('div','vquestion',`Can an alert become an <span>action</span>, fast, by the right person, <span>with proof</span>?`);root.appendChild(q);
    const dt=el('div','vdate','Eight customers · what Beijing contributes, customer by customer');root.appendChild(dt);
    const tp=[0,1,2].map(i=>beatT(sc,'panel',i)), tq=beatT(sc,'question',true), td=beatT(sc,'date',true);
    const qg=panels[1].querySelector('.qgrid');for(let i=0;i<40;i++){const d=el('div','qp','🧍');qg.appendChild(d);}
    update=tl=>{
      panels.forEach((p,i)=>{const pr=P(tl,tp[i],0.8);rv(p,pr,40);
        const shrink=P(tl,tq,0.8);p.style.transform=`translateY(${(1-pr)*40}px) scale(${1-0.18*shrink})`;p.style.opacity=pr*(1-0.35*shrink);});
      // fence wobble
      const t0=tp[0];const amp=tl>t0?18*Math.exp(-(tl-t0-0.8)*0.6)*(tl>t0+0.8?1:0):0;
      ['w1','w2','w3'].forEach((id,k)=>{const y=70+k*55;const pts=[];for(let x=20;x<=500;x+=10){const near=Math.exp(-Math.pow((x-300)/60,2));pts.push(`${x},${y+amp*near*Math.sin((tl)*22+x*0.12)}`);}const e=root.querySelector('#'+id);if(e)e.setAttribute('points',pts.join(' '));});
      const ft=root.querySelector('#ftxt');if(ft)ft.setAttribute('opacity',P(tl,t0+1.2,0.5));
      // queue
      const n=Math.floor(clamp((tl-tp[1])*9,0,40));qg.querySelectorAll('.qp').forEach((d,i)=>{d.style.opacity=i<n?1:0.08;});
      panels[1].querySelector('.qcount').textContent=`${n} waiting`;
      // passport
      const sb=panels[2].querySelector('.scanbar');if(sb){const u=((tl-tp[2])%1.6)/1.6;sb.style.top=`${8+clamp(u,0,1)*70}%`;sb.style.opacity=tl>tp[2]?1:0;}
      ['s1','s2','s3'].forEach((id,k)=>{const e=panels[2].querySelector('#'+id);rv(e,P(tl,tp[2]+0.6+k*0.9,0.5),10);});
      panels.forEach((p,i)=>{p.querySelector('.vq').style.opacity=P(tl,tp[i]+1.6,0.4)*(1-P(tl,tq,0.5));});
      rv(q,P(tl,tq,0.9),30);rv(dt,P(tl,td,0.8),20);
    };
  }

  if(type==='customers'){
    root.appendChild(header(sc));
    const ring=el('div','ring');root.appendChild(ring);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1920 1080');svg.setAttribute('class','ringsvg');ring.appendChild(svg);
    const cx=960,cy=600,R=350;const lines=[];
    const core=el('div','core',`<div class="corei">ISMP / V11</div><div class="cores">event · SOP · dispatch · audit · identity</div>`);core.style.left=`${cx-150}px`;core.style.top=`${cy-80}px`;ring.appendChild(core);
    const badges=sc.customers.map((c,i)=>{const a=-Math.PI/2+i*2*Math.PI/8;const x=cx+Math.cos(a)*R*1.6,y=cy+Math.sin(a)*R*0.92;
      const b=el('div','badge',`<div class="bi">${c.icon}</div><div class="bn" style="color:${CUST[c.key].hue}">${esc(c.name)}</div><div class="bl">${esc(c.line)}</div>`);b.style.left=`${x-150}px`;b.style.top=`${y-70}px`;ring.appendChild(b);
      const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',cx);ln.setAttribute('y1',cy);ln.setAttribute('x2',x);ln.setAttribute('y2',y);ln.setAttribute('stroke',CUST[c.key].hue);ln.setAttribute('stroke-width','3');ln.setAttribute('stroke-dasharray','1000');ln.setAttribute('stroke-dashoffset','1000');ln.setAttribute('opacity','0.7');svg.appendChild(ln);lines.push(ln);return b;});
    const tc=sc.customers.map((_,i)=>beatT(sc,'c',i)), tcore=beatT(sc,'core',true);
    update=tl=>{badges.forEach((b,i)=>{pop(b,P(tl,tc[i],0.6));lines[i].setAttribute('stroke-dashoffset',1000*(1-P(tl,tc[i]+0.2,0.7)));});
      const pc=P(tl,Math.min(tc[0]-0.3,tcore),0.8);pop(core,pc);const pulse=tl>tcore?1+0.04*Math.sin((tl-tcore)*4):1;core.style.transform=`scale(${(0.86+0.14*pc)*pulse})`;core.style.boxShadow=tl>tcore?`0 0 ${40+20*Math.sin((tl-tcore)*4)}px rgba(79,163,255,.55)`:'none';};
  }

  if(type==='problem'){
    root.appendChild(header(sc));
    const body=el('div','pbody');root.appendChild(body);
    const day=el('div','day');day.innerHTML=`<div class="daytitle">A day in the life</div>`;body.appendChild(day);
    const dl=sc.day.map(t=>{const d=el('div','dayline');d.innerHTML=`<span class="dayb">›</span><span class="dayt"></span>`;day.appendChild(d);return d;});
    const grid=el('div','pgrid');body.appendChild(grid);
    const pcards=sc.problems.map(([h,t])=>{const c=el('div','pcard',`<div class="ph">${esc(h)}</div><div class="pt">${esc(t)}</div>`);grid.appendChild(c);return c;});
    const cap=el('div','capq');root.appendChild(cap);
    const tday=sc.day.map((_,i)=>beatTAny(sc,['day','day2'],i)), tp=sc.problems.map((_,i)=>beatT(sc,'p',i));const cb=sc.beats.find(b=>b.caption);cap.textContent=cb?cb.caption:'';const tcap=cb?cb.t:1e9;
    update=tl=>{dl.forEach((d,i)=>{const p=P(tl,tday[i],0.5);rv(d,p,14);const full=sc.day[i];const n=Math.floor(clamp((tl-tday[i])/1.1,0,1)*full.length);d.querySelector('.dayt').textContent=full.slice(0,n)+(n<full.length&&tl>tday[i]?'▌':'');});
      pcards.forEach((c,i)=>pop(c,P(tl,tp[i],0.6)));rv(cap,P(tl,tcap,0.7),20);};
  }

  if(type==='flow'){
    root.appendChild(header(sc));
    const fl=el('div','flowwrap');root.appendChild(fl);
    const nodes=sc.nodes.map(([ic,lab],i)=>{const n=el('div','fnode',`<div class="fi">${ic}</div><div class="fl">${nl(lab)}</div>`);fl.appendChild(n);return n;});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','flowsvg');svg.setAttribute('viewBox','0 0 1792 240');fl.appendChild(svg);
    const N=nodes.length, W=1792, nw=250, gap=(W-N*nw)/(N-1);
    nodes.forEach((n,i)=>{n.style.left=`${i*(nw+gap)}px`;n.style.width=`${nw}px`;});
    const edges=[],pulses=[];
    for(let i=0;i<N-1;i++){const x1=i*(nw+gap)+nw,x2=(i+1)*(nw+gap);const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',x1);ln.setAttribute('y1',110);ln.setAttribute('x2',x2);ln.setAttribute('y2',110);ln.setAttribute('stroke','rgba(140,175,235,.35)');ln.setAttribute('stroke-width','3');svg.appendChild(ln);edges.push({ln,x1,x2});
      const ps=[];for(let k=0;k<3;k++){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r','6');c.setAttribute('cy',110);c.setAttribute('fill',hue);c.setAttribute('opacity','0');svg.appendChild(c);ps.push(c);}pulses.push(ps);}
    const facts=el('div','facts');root.appendChild(facts);
    const fcards=sc.facts.map(([lab,txt])=>{const c=el('div','fact',`<div class="flab">${esc(lab)}</div><div class="ftxt">${esc(txt)}</div>`);facts.appendChild(c);return c;});
    const tn=sc.nodes.map((_,i)=>beatTAny(sc,['node','node2'],i)), tf=sc.facts.map((_,i)=>beatT(sc,'fact',i));
    update=tl=>{nodes.forEach((n,i)=>{const p=P(tl,tn[i],0.6);pop(n,p);n.classList.toggle('on',tl>=tn[i]);
        const latest=tn.reduce((a,t,j)=>t<=tl&&t>=tn[a]?j:a,0);n.classList.toggle('latest',i===latest&&tl>=tn[i]);
        if(tl>=tn[i]){const g=0.5+0.5*Math.sin((tl-tn[i])*3);n.style.boxShadow=`0 0 ${18+14*g}px ${hue}55`;}else n.style.boxShadow='none';});
      edges.forEach((e,i)=>{const on=tl>=tn[i]&&tl>=tn[i+1];e.ln.setAttribute('stroke',on?hue:'rgba(140,175,235,.25)');e.ln.setAttribute('opacity',on?0.8:0.4);
        pulses[i].forEach((c,k)=>{if(!on){c.setAttribute('opacity',0);return;}const u=((tl-tn[i+1])*0.55+k/3)%1;c.setAttribute('cx',e.x1+(e.x2-e.x1)*u);c.setAttribute('opacity',0.9*Math.sin(u*Math.PI));});});
      const latestF=tf.reduce((a,t,j)=>t<=tl&&t>=tf[a]?j:a,0);
      fcards.forEach((c,i)=>{rv(c,P(tl,tf[i],0.6),30);c.classList.toggle('latest',i===latestF&&tl>=tf[i]);});};
  }

  if(type==='split'){
    root.appendChild(header(sc));
    const cols=el('div','splitcols',`<div class="sct">${esc(sc.left_title)}</div><div class="sct sarr"></div><div class="sct">${esc(sc.right_title)}</div>`);root.appendChild(cols);
    const rows=sc.rows.map(([l,r])=>{const a=el('div','scell left',esc(l)),m=el('div','sarrow','›'),b=el('div','scell right',esc(r));cols.appendChild(a);cols.appendChild(m);cols.appendChild(b);return [a,m,b];});
    const pv=el('div','prove',`<div class="provel">PROVE BEFORE PROPOSING</div>`);root.appendChild(pv);
    const chips=sc.prove.map(t=>{const c=el('div','chip',esc(t));pv.appendChild(c);return c;});
    const tr=sc.rows.map((_,i)=>beatT(sc,'row',i)), tpv=sc.prove.map((_,i)=>beatT(sc,'prove',i));
    update=tl=>{rows.forEach(([a,m,b],i)=>{const latest=tr.reduce((x,t,j)=>t<=tl&&t>=tr[x]?j:x,0);const isL=latest===i&&tl>=tr[i];
        rv(a,P(tl,tr[i],0.6),22);rv(m,P(tl,tr[i]+0.25,0.5),0);rv(b,P(tl,tr[i]+0.35,0.6),22);a.classList.toggle('latest',isL);b.classList.toggle('latest',isL);});
      rv(pv,P(tl,Math.min(...tpv)-0.2,0.5),20);chips.forEach((c,i)=>pop(c,P(tl,tpv[i],0.5)));};
  }

  if(type==='hub'){
    root.appendChild(header(sc));
    const ring=el('div','ring');root.appendChild(ring);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1920 1080');svg.setAttribute('class','ringsvg');ring.appendChild(svg);
    const cx=960,cy=610;const lines=[];
    const core=el('div','core big',`<div class="corei">${nl(sc.core.split('\n')[0])}</div><div class="cores">${nl(sc.core.split('\n')[1]||'')}</div>`);core.style.left=`${cx-190}px`;core.style.top=`${cy-80}px`;ring.appendChild(core);
    const halo=document.createElementNS('http://www.w3.org/2000/svg','circle');halo.setAttribute('cx',cx);halo.setAttribute('cy',cy);halo.setAttribute('r',10);halo.setAttribute('fill','none');halo.setAttribute('stroke','#4fa3ff');halo.setAttribute('stroke-width','3');halo.setAttribute('opacity',0);svg.appendChild(halo);
    const spokes=sc.spokes.map(([key,ic,name,txt],i)=>{const a=-Math.PI/2+i*2*Math.PI/8;const x=cx+Math.cos(a)*600,y=cy+Math.sin(a)*330;
      const b=el('div','spoke',`<div class="bi">${ic}</div><div class="bn" style="color:${CUST[key].hue}">${esc(name)}</div><div class="bl">${esc(txt)}</div>`);b.style.left=`${x-170}px`;b.style.top=`${y-70}px`;ring.appendChild(b);
      const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',cx);ln.setAttribute('y1',cy);ln.setAttribute('x2',x);ln.setAttribute('y2',y);ln.setAttribute('stroke',CUST[key].hue);ln.setAttribute('stroke-width','3');ln.setAttribute('stroke-dasharray','1200');ln.setAttribute('stroke-dashoffset','1200');ln.setAttribute('opacity','0.7');svg.appendChild(ln);lines.push(ln);return b;});
    const tcore=beatT(sc,'core',true), ts=sc.spokes.map((_,i)=>beatT(sc,'spoke',i)), tring=beatT(sc,'ring',true);
    update=tl=>{pop(core,P(tl,tcore,0.7));spokes.forEach((b,i)=>{pop(b,P(tl,ts[i],0.6));lines[i].setAttribute('stroke-dashoffset',1200*(1-P(tl,ts[i]+0.15,0.7)));});
      if(tl>tring){const u=((tl-tring)%2.4)/2.4;halo.setAttribute('r',10+u*700);halo.setAttribute('opacity',0.8*(1-u));}else halo.setAttribute('opacity',0);
      const g=tl>tcore?0.5+0.5*Math.sin((tl-tcore)*3):0;core.style.boxShadow=`0 0 ${30+30*g}px rgba(79,163,255,.5)`;};
  }

  if(type==='timeline'){
    root.appendChild(header(sc));
    const wrap=el('div','tlwrap');root.appendChild(wrap);
    const bar=el('div','tlbar');wrap.appendChild(bar);const fill=el('div','tlfill');bar.appendChild(fill);
    const colsw=el('div','tlcols');wrap.appendChild(colsw);
    const cols=sc.cols.map(([title,items])=>{const c=el('div','tlcol',`<div class="tlh">${esc(title)}</div>`);colsw.appendChild(c);const its=items.map(([k,t])=>{const d=el('div','tlitem',`<span class="tli">${CUST[k].icon}</span><span class="tlt"><b style="color:${CUST[k].hue}">${esc(CUST[k].name.split(' ·')[0])}</b> · ${esc(t)}</span>`);c.appendChild(d);return d;});return {c,its};});
    const tc=sc.cols.map((_,i)=>beatT(sc,'col',i));
    update=tl=>{cols.forEach((o,i)=>{rv(o.c.querySelector('.tlh'),P(tl,tc[i],0.6),20);o.its.forEach((d,k)=>rv(d,P(tl,tc[i]+0.25+k*0.22,0.5),18));});
      const f=clamp((tl-tc[0])/(Math.max(tc[2],tc[0]+1)+3-tc[0]),0,1);fill.style.width=`${f*100}%`;};
  }

  if(type==='decisions'){
    root.appendChild(header(sc));
    const grid=el('div','dgrid');root.appendChild(grid);
    const cards=sc.execs.map(([who,dec,ev])=>{const c=el('div','dcard',`<div class="dwho">${esc(who)}</div><div class="ddec">${esc(dec)}</div><div class="dev"><span>Customer gets back:</span> ${esc(ev)}</div>`);grid.appendChild(c);return c;});
    const crit=el('div','crit');root.appendChild(crit);
    const cc=sc.criteria.map(([h,t])=>{const c=el('div','critc',`<div class="ch">${esc(h)}</div><div class="ct">${esc(t)}</div>`);crit.appendChild(c);return c;});
    const te=sc.execs.map((_,i)=>beatT(sc,'e',i)), tcr=beatT(sc,'crit',true);
    update=tl=>{cards.forEach((c,i)=>{pop(c,P(tl,te[i],0.6));const latest=te.reduce((x,t,j)=>t<=tl&&t>=te[x]?j:x,0);c.classList.toggle('latest',latest===i&&tl>=te[i]);});cc.forEach((c,i)=>rv(c,P(tl,tcr+i*0.25,0.6),20));};
  }

  if(type==='close'){
    root.appendChild(header(sc));
    const body=el('div','cbody');root.appendChild(body);
    const log=el('div','clog');body.appendChild(log);
    const lines=sc.lines.map(t=>{const d=el('div','cline');d.innerHTML=`<span class="dayb">›</span><span class="dayt"></span>`;log.appendChild(d);return d;});
    const clock=el('div','clock','02:00:00');body.appendChild(clock);
    const th=el('div','thesis',esc(sc.thesis));root.appendChild(th);
    const tlns=sc.lines.map((_,i)=>beatT(sc,'line',i)), tth=beatT(sc,'thesis',true);
    const stamps=[0,20,45,70,390,420];
    update=tl=>{lines.forEach((d,i)=>{const p=P(tl,tlns[i],0.4);rv(d,p,12);const full=sc.lines[i];const n=Math.floor(clamp((tl-tlns[i])/0.9,0,1)*full.length);d.querySelector('.dayt').textContent=full.slice(0,n);d.classList.toggle('done',i===5&&tl>tlns[5]+0.9);});
      let k=tlns.reduce((x,t,j)=>t<=tl?j:x,-1);let sec=0;if(k>=0){const a=stamps[k],b=stamps[Math.min(k+1,5)];const dur=Math.max(0.1,(tlns[Math.min(k+1,5)]-tlns[k]));sec=k===5?stamps[5]:a+(b-a)*clamp((tl-tlns[k])/dur,0,1);}
      const m=Math.floor(sec/60),s=Math.floor(sec%60);clock.textContent=`02:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;clock.style.opacity=k>=0?1:0;
      const pt=P(tl,tth,1.0);th.style.opacity=pt;th.style.transform=`scale(${0.9+0.1*pt})`;};
  }
  return {root,update,sc};
}

// chrome
const chapter=document.getElementById('chapter'), prog=document.getElementById('progress');
window.seek=function(T){
  const total=D.total;
  let i=D.scenes.findIndex(s=>T<s.start+s.dur);if(i<0)i=D.scenes.length-1;
  const cur=D.scenes[i], prev=D.scenes[i-1];
  const fadeIn=prev?eio((T-cur.start)/0.8):1;
  scenes.forEach((s,j)=>{s.root.style.display=(j===i||(j===i-1&&fadeIn<1))?'block':'none';});
  scenes[i].root.style.opacity=fadeIn;scenes[i].update(T-cur.start);
  if(prev&&fadeIn<1){scenes[i-1].root.style.opacity=1-fadeIn;scenes[i-1].update(prev.dur);}
  // background drift
  document.body.style.setProperty('--bx',`${50+12*Math.sin(T*0.07)}%`);document.body.style.setProperty('--by',`${30+10*Math.cos(T*0.05)}%`);
  const c=CUST[cur.customer||""];chapter.innerHTML=c.icon?`${c.icon} <b>${esc(c.name)}</b> · chapter ${i}/${D.scenes.length-1}`:`<b>Beijing 2026 · customer-first recap</b>`;chapter.style.color=c.hue;
  prog.style.width=`${100*T/total}%`;
  return i;
};
