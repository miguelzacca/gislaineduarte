import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { foods } from '../src/data/nutrition.js';

// Original vector food illustrations; deterministic, local and licensed with the project.
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const ellipse = (x,y,rx,ry,c,rotation=0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rotation} ${x} ${y})"/>`;
const path = (d,c) => `<path d="${d}" fill="${c}"/>`;
const fruitColors = { apple:'#b8483a', tomato:'#d25c42', orange:'#e4a035', tangerine:'#e7a334', plum:'#72516d', guava:'#a5aa55', pear:'#b4b775', avocado:'#77965b', kiwi:'#aa9470', mango:'#e5b952' };
function art(food, index) {
  const id = food.id;
  let drawing;
  if (fruitColors[id]) {
    const c=fruitColors[id];
    drawing=ellipse(165,120,55,61,c,-9)+ellipse(226,157,46,48,c,12)+path('M165 65q-10-24 5-33q9 19-5 33','#705035')+path('M169 61q32-32 50-15q-12 27-50 15','#426d48')+ellipse(144,97,9,21,'#ffffff45',23);
    if (id==='avocado') drawing+=ellipse(219,153,33,39,'#d4d28b',15)+ellipse(219,160,20,24,'#9c673d',15);
    if (id==='kiwi') drawing+=circle(226,156,37,'#aac66b')+circle(226,156,10,'#efeed1')+Array.from({length:12},(_,i)=>circle(226+24*Math.cos(i),156+24*Math.sin(i),2,'#514a31')).join('');
  } else if (id.includes('banana')) {
    drawing=path('M101 77Q140 166 244 91Q225 186 151 176Q90 159 101 77','#e3be53')+path('M119 66Q154 135 251 76Q232 155 176 149Q118 138 119 66','#f1d570')+path('M101 77l-5-13 9-3 7 14zM246 78l4-9 10 4-4 11z','#725836');
  } else if (['watermelon','papaya','melon','pumpkin','pineapple'].includes(id)) {
    const c={watermelon:'#d77164',papaya:'#e99654',melon:'#d9dbaa',pumpkin:'#cd843d',pineapple:'#e7c56c'}[id];
    drawing=path('M85 114Q185 246 285 114Z','#6c8654')+path('M98 114Q185 223 272 114Z','#faf1cb')+path('M107 114Q185 208 263 114Z',c);
    if(id==='watermelon'||id==='papaya') drawing+=Array.from({length:8},(_,i)=>ellipse(135+i*14,139+Math.sin(i/2)*17,2.5,4,'#5b483c',i*24)).join('');
    drawing+=ellipse(151,94,46,25,c,-18);
  } else if (['grapes','strawberry'].includes(id)) {
    drawing=Array.from({length:10},(_,i)=>{const x=126+(i%4)*35, y=90+Math.floor(i/4)*33;return circle(x,y,22,id==='grapes'?'#8fa45e':'#c65243')+ellipse(x-6,y-7,4,7,'#ffffff45',30)+(id==='strawberry'?path(`M${x-15} ${y-18}l10-7 5 4 8-4 7 8-18 6z`,'#59814a'):'');}).join('');
  } else if (['egg','egg-white'].includes(id)) {
    drawing=ellipse(141,125,43,55,'#efe0c2',-18)+ellipse(224,145,47,40,'#fffcdf',-22)+(id==='egg'?ellipse(226,144,24,24,'#e5b343'):'');
  } else if (['broccoli','cauliflower'].includes(id)) {
    drawing=path('M174 177l3-64 18 2 5 62z','#a7ba79')+Array.from({length:9},(_,i)=>circle(125+(i%4)*32,99+Math.floor(i/4)*25,25,id==='broccoli'?['#598352','#426f4a','#71945d'][i%3]:'#e4dfbd')).join('');
  } else if (['lettuce','kale','arugula','cabbage'].includes(id)) {
    drawing=Array.from({length:7},(_,i)=>ellipse(180,127,33,67,['#638654','#91a971','#436d4b'][i%3],i*49)).join('')+path('M178 190l2-121 5 0-1 121z','#bcc596');
  } else if (['bread','french-bread'].includes(id)) {
    drawing=path('M92 174V101Q95 68 137 72Q183 51 199 93L209 174Z','#b68349')+path('M105 169V106Q105 82 139 87Q173 65 187 99L197 169Z','#e4c28a')+path('M169 193V124Q177 96 206 107Q246 88 263 123L271 191Z','#b7844b')+path('M181 181V126Q186 110 210 117Q242 103 253 128L259 181Z','#f0d7a2');
  } else if (['yogurt','skim-yogurt','soy-milk'].includes(id)) {
    drawing=path('M137 81h90l-10 109h-70Z','#e0decb')+path('M146 92h72l-8 86h-55Z','#fffbed')+ellipse(182,83,46,12,'#fffdf4')+path('M236 73l9-1-12 80-8-1z','#b29b77');
  } else if (id==='olive-oil') {
    drawing=path('M163 47h33v38l14 15v91h-61v-91l14-15z','#68835c')+path('M154 120h52v54h-52z','#ded4a3')+ellipse(180,146,10,15,'#8d994d',-20)+path('M164 41h31v11h-31z','#b79854')+ellipse(236,187,16,9,'#6b7743',-20)+ellipse(258,178,15,9,'#506438',20);
  } else if (['chicken','grilled-chicken','beef','ground-beef','white-fish','salmon'].includes(id)) {
    const c=id==='salmon'?'#e3a07c':id.includes('beef')?'#a97857':id==='white-fish'?'#e8dbb6':'#d8ae78';
    drawing=path('M94 147Q102 85 190 84Q268 91 267 145Q253 186 165 185Q107 178 94 147',c)+Array.from({length:5},(_,i)=>path(`M${124+i*25} 106l8-4 16 59-8 3z`,id==='white-fish'?'#d2c9a4':'#966b454a')).join('')+circle(267,106,18,'#ded985')+circle(267,106,13,'#f1e5a0');
  } else if (['carrot','sweet-potato','potato','cassava','arracacha','beet','chayote','zucchini','cucumber','eggplant'].includes(id)) {
    const c={carrot:'#df9754',beet:'#a56b79',eggplant:'#776477',zucchini:'#98ad69',cucumber:'#99b276',chayote:'#b1bf90','sweet-potato':'#dab889',potato:'#e4d4a8',cassava:'#e8debf',arracacha:'#e6d69a'}[id];
    drawing=Array.from({length:7},(_,i)=>ellipse(117+(i%3)*54,99+Math.floor(i/3)*30,29,19,c,i*23)).join('')+path('M243 170q-5-21 13-24q5 17-13 24','#56744c');
  } else {
    const dark=id==='black-beans'; const c=dark?'#645448':food.group==='Leguminosas'?'#b99770':food.group==='Gorduras e sementes'?'#aa8660':id==='couscous'?'#dfc56b':'#d9cdb1';
    drawing=ellipse(183,157,94,37,'#d5c6a5')+path('M89 132h188q-6 64-94 64q-84 0-94-64','#f4e9d3')+ellipse(183,132,94,31,'#fff7e6')+Array.from({length:40},(_,i)=>ellipse(118+(i*37)%132,114+(i*17)%37,food.group==='Gorduras e sementes'?13:7,food.group==='Gorduras e sementes'?8:4,c,i*37)).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="288" viewBox="0 0 384 288"><defs><radialGradient id="bg"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="${index%2?'#eee8da':'#e8ecdf'}"/></radialGradient><filter id="shadow"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="384" height="288" fill="url(#bg)"/><ellipse cx="192" cy="204" rx="104" ry="20" fill="#39503b" opacity=".12" filter="url(#shadow)"/><ellipse cx="192" cy="170" rx="138" ry="72" fill="#fffdf4"/><ellipse cx="192" cy="166" rx="123" ry="61" fill="none" stroke="#e3dfcd" stroke-width="2"/><g transform="translate(0 13)">${drawing}</g><path d="M302 57q18-20 31-9q-10 20-31 9M301 59q-10-16-23-10q5 17 23 10" fill="#718a5d" opacity=".6"/></svg>`;
}
await mkdir('public/images/foods', { recursive:true });
for (const [index, food] of foods.entries()) {
  const svg=art(food,index);
  await sharp(Buffer.from(svg)).jpeg({quality:88,mozjpeg:true}).toFile(`public/images/foods/${food.id}.jpg`);
}
await writeFile('public/images/foods/README.txt', '60 ilustrações vetoriais autorais, geradas por scripts/build-food-art.mjs. Imagens ilustrativas: não representam o peso ou a porção prescrita. Sem dependências externas em tempo de uso.\n');
console.log(`Food illustrations: ${foods.length}`);
