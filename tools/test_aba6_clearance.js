'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','source/html/ABA6/manikin.js'),'utf8');
const start=src.indexOf('const ERGO_BIN_FLOOR = [');
const end=src.indexOf('// 3. CINEMÁTICA INVERSA ARTICULADA',start);
assert(start>0&&end>start,'Cavidade/trajectory functions missing');
const env={ergoClamp01:x=>Math.max(0,Math.min(1,x)),
           ergoSmooth:x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}};
vm.runInNewContext(src.slice(start,end)+`
this.api={ergoInterpCurveY,ERGO_BIN_FLOOR,ERGO_BIN_CEIL,
    ergoCavityClearance,ergoStowPlan,ergoSampleBagTrajectory}`,env);
const g=env.api;
const lip=g.ergoInterpCurveY(g.ERGO_BIN_CEIL,54.5);
assert(lip>170&&lip<176,'Teto ainda escolhe ramo superior do lábio');
assert(Math.abs(g.ergoInterpCurveY(g.ERGO_BIN_FLOOR,50.61)-148.32)<1e-8);
let count=0,misplaced=0,negative=Infinity,goodFloor=Infinity,goodCeil=Infinity;
for(const mode of ['alpha2','alpha1']){
 const plan=g.ergoStowPlan(mode,{m1W:23.2,m1H:34.8,m2W:33.2,m2H:22.8},151.892);
 for(let i=0;i<=1000;i++){
  const phase=i/1000,bag=g.ergoSampleBagTrajectory(plan,phase);
  assert(Number.isFinite(bag.x)&&Number.isFinite(bag.y)&&Number.isFinite(bag.a));
  const c=g.ergoCavityClearance(bag.x,bag.y,plan.w,plan.h,bag.a);
  assert(!Number.isNaN(c.minFloor)&&!Number.isNaN(c.minCeil));
  if(mode==='alpha2'&&phase>=.62){goodFloor=Math.min(goodFloor,c.minFloor);goodCeil=Math.min(goodCeil,c.minCeil);}
  if(mode==='alpha1'&&phase>=.42){
    negative=Math.min(negative,c.minFloor);
    if(c.minFloor<.25)misplaced++;
  }
  count++;
 }
}
assert.equal(count,2002);
assert(goodFloor>.25&&goodCeil>.45,'Segunda mala perdeu as folgas de referência');
assert(negative>=-3.0,'Trajetória da primeira mala piorou em relação ao baseline');
assert(misplaced>0,'Pendência conhecida na primeira mala exige revisão do teste');
console.log('Aba 6: 2002 poses testadas, lábio segmentado e folgas da segunda mala conferidas.');
console.warn('PENDÊNCIA: primeira mala cruza o piso de referência em '+misplaced+
' amostras (mín. '+negative.toFixed(3)+' cm); exige validação CAD/visual da trajetória.');
