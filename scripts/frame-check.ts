// Development-only synthetic camera test. Never included in the application.
import {Html5Qrcode, Html5QrcodeSupportedFormats} from 'html5-qrcode';
import QRCode from 'qrcode';
import {FullFrameReader} from '../src/app/components/scanner/full-frame-reader';
import {createScanConfig} from '../src/app/components/scanner/scanner-config';

const canvas = document.createElement('canvas');
canvas.width=1280; canvas.height=720;
const ctx=canvas.getContext('2d')!;
const stream=canvas.captureStream(30);
Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>stream});
const cases = [
  {name:'nhỏ ở giữa',x:540,y:260,size:180,angle:0},
  {name:'góc trên trái',x:24,y:24,size:180,angle:0},
  {name:'góc trên phải',x:1076,y:24,size:180,angle:0},
  {name:'góc dưới trái',x:24,y:516,size:180,angle:0},
  {name:'góc dưới phải',x:1076,y:516,size:180,angle:0},
  {name:'mã lớn hơn khung cũ',x:400,y:120,size:440,angle:0},
  {name:'lệch trái, xoay 20 độ',x:120,y:200,size:240,angle:20},
  {name:'lệch phải, xoay -20 độ',x:800,y:200,size:240,angle:-20}
];
let current=0,resolveCase:(()=>void)|undefined;
const payloads = await Promise.all(cases.map(async(_,i)=>{
  const image=new Image();image.src=await QRCode.toDataURL('TEST'+String(i).padStart(3,'0'),{width:360,margin:4});
  await image.decode();return image;
}));
function paint() {
  ctx.fillStyle='#eee';ctx.fillRect(0,0,1280,720);
  const test=cases[current];
  ctx.save();ctx.translate(test.x+test.size/2,test.y+test.size/2);ctx.rotate(test.angle*Math.PI/180);
  ctx.drawImage(payloads[current],-test.size/2,-test.size/2,test.size,test.size);ctx.restore();
  requestAnimationFrame(paint);
}
paint();
const scan=new Html5Qrcode('qr-reader-container',{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],experimentalFeatures:{useBarCodeDetectorIfSupported:true},verbose:false});
const result=document.querySelector('#results')!;
let lastMainRead = 0;
const onCode = (text: string) => {if(text==='TEST'+String(current).padStart(3,'0')) resolveCase?.();};
const config=createScanConfig('', 'environment');
if(config.qrbox !== undefined) throw new Error('Region must be full frame');
await scan.start({facingMode:'environment'},config,text=>{
  lastMainRead=performance.now(); onCode(text);
},()=>{});
const fallback=new FullFrameReader(document.querySelector('video')!,onCode,()=>performance.now()-lastMainRead>700);
fallback.start();
let passed=0;
for(current=0;current<cases.length;current++) {
  const start=performance.now();
  try {
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('timeout')),6000);
      resolveCase=()=>{clearTimeout(timer);resolve();};
    });
    result.append(Object.assign(document.createElement('li'),{textContent:`PASS ${cases[current].name} (${Math.round(performance.now()-start)} ms)`}));passed++;
  } catch {result.append(Object.assign(document.createElement('li'),{textContent:`FAIL ${cases[current].name}`}));}
  resolveCase=undefined;
}
current=0;
fallback.stop();await scan.stop();stream.getTracks().forEach(track=>track.stop());
document.querySelector('#summary')!.textContent=`${passed}/${cases.length} kiểm tra đạt`;
