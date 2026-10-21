import {LIMITS,LABELS,KINDS,ratingText,selectWorks,metrics,unresolved,validateCatalogue} from './model.js';
const $=id=>document.getElementById(id);
function el(tag,text='',className=''){const node=document.createElement(tag);if(text!==null)node.textContent=text;if(className)node.className=className;return node;}
function add(parent,...children){parent.append(...children);return parent;}
function link(text,href,className=''){const a=el('a',text,className);a.href=href;return a;}
function empty(text){return el('div',text,'empty');}
let data=null,limit=24,previous='#catalogue',loading=false;
const notice=$('notice');
function card(w){
  const node=el('article',null,'book-card'),a=link('',`#work/${encodeURIComponent(w.id)}`,'card-link');
  add(a,add(el('div',null,'card-top'),el('span',w.genres.join(' / ')||'ジャンル調査中'),el('span',w.first_publication_year?`${w.first_publication_year}年`:'初版年未確認')),el('h3',w.japanese_title||w.original_title));
  if(w.japanese_title)add(a,el('p',w.original_title,'original-title'));
  add(a,el('p',w.authors.map(x=>x.name).join(' / '),'author'),el('p',ratingText(w),'rating'),el('div',`邦訳：${w.translation_status}　／　権利：${w.copyright_status}`,'card-status'));
  return add(node,a);
}
function listing(id,works,fallback){$(id).replaceChildren(...(works.length?works.map(card):[empty(fallback)]));}
function showMetrics(){
  const m=metrics(data),grid=el('div',null,'metrics-grid'),main=el('div',null,'metric main-metric');
  add(main,el('small',`登録作品 / 目標 ${data.target.toLocaleString()}作品`),el('br'),el('b',String(m.total)),el('span',`作品　${m.progress.toFixed(1)}%`));
  const progress=el('progress');progress.max=data.target;progress.value=m.total;progress.setAttribute('aria-label','発掘目標への進捗');add(main,progress);add(grid,main);
  for(const [label,n] of [['高評価作品（参考点除外）',m.high],['邦訳状況を記録',m.translation],['著作権確認済み',m.rights],['出版作品',m.published]])add(grid,add(el('div',null,'metric'),el('span',label),el('b',String(n))));
  add(grid,add(el('div',null,'metric'),el('span','最新調査日'),el('p',m.latest||'未確認','subtle')),add(el('div',null,'metric'),el('span','評価について'),el('p','過去参考点は採点・星に含めません','subtle')));$('metrics').replaceChildren(grid);
}
function home(){showMetrics();listing('recent',selectWorks(data.candidates).slice(0,3),'作品はこれから加わります。');listing('featured',selectWorks(data.candidates,{sort:'rating'}).filter(w=>w.evaluation.total!==null&&w.evaluation.total>=75).slice(0,3),'評価内訳を確認できた高評価作品は、まだありません。各作品の過去参考点は作品一覧からご覧いただけます。');}
function filters(){const old=$('genre').value;const options=[el('option','すべてのジャンル')];options[0].value='';for(const g of [...new Set(data.candidates.flatMap(w=>w.genres))].sort()){const o=el('option',g);o.value=g;options.push(o);}$('genre').replaceChildren(...options);$('genre').value=old;}
function catalogue(){if(!data)return;const list=selectWorks(data.candidates,{query:$('search').value,genre:$('genre').value,sort:$('sort').value,kind:$('rating-kind').value});$('results').textContent=`${list.length} / ${data.candidates.length}作品 · ${Math.min(limit,list.length)}作品を表示`;
  listing('collection',list.slice(0,limit),'条件に合う作品はありません。検索語やフィルターを変えてみてください。');$('more').hidden=list.length<=limit;}
function activity(){
  const stats=$('research-stats');stats.replaceChildren();const m=metrics(data);
  for(const text of [`登録 ${m.total}作品`,`原文読了 ${data.candidates.filter(w=>w.original_status==='読了').length}作品`,`権利確認済み ${m.rights}作品`])add(stats,el('span',text,'chip'));
  const fragment=document.createDocumentFragment();
  for(const w of selectWorks(data.candidates,{sort:'research'})){
    const item=el('article',null,'journal-entry');add(item,el('p',`最終調査 ${w.research_date||'未確認'} · 登録 ${w.registered_on||'未確認'}`),link(w.japanese_title||w.original_title,`#work/${encodeURIComponent(w.id)}`),el('p',`邦訳：${w.translation_status} ／ 権利：${w.copyright_status}`),el('p',`確認待ち ${unresolved(w).length}項目 · ${ratingText(w)}`));add(fragment,item);
  }$('timeline').replaceChildren(fragment);
}
function publications(){listing('published',data.candidates.filter(w=>w.published),'出版作品は、まだありません。一冊ずつ準備を進めています。');}
function rows(entries){const dl=el('dl',null,'data-list');for(const [k,v] of entries)add(dl,el('dt',k),el('dd',v===null||v===''?'調査中':String(v)));return dl;}
function section(title,...children){return add(el('section',null,'detail-section'),el('h2',title),...children);}
function bullets(values){if(!values.length)return el('p','調査中','subtle');const ul=el('ul');for(const v of values)add(ul,el('li',v));return ul;}
function detail(id){
  const w=data.candidates.find(x=>x.id===id),root=$('detail');root.replaceChildren(link('← 書棚へ戻る',previous,'detail-back'));if(!w){add(root,empty('作品が見つかりません。'));return;}
  const header=el('div',null,'detail-header');add(header,el('p','DISCOVERY NOTES','eyebrow'),el('h1',w.japanese_title||w.original_title));if(w.japanese_title)add(header,el('p',w.original_title,'original-title'));add(header,el('p',w.authors.map(a=>a.name).join(' / '),'author'),el('p',ratingText(w),'rating'));add(root,header);
  const body=el('div',null,'detail-body');
  add(body,section('書誌情報',rows([['原題',w.original_title],['仮邦題',w.japanese_title],['著者',w.authors.map(a=>`${a.name}（${a.birth_year??'生年未確認'}–${a.death_year??'没年未確認'}）`).join(' / ')],['初版年',w.first_publication_year],['ジャンル',w.genres.join(' / ')],['最終調査日',w.research_date]])));
  for(const [key,title] of [['synopsis','あらすじ'],['blurb','読者向け紹介文']])add(body,section(title,el('p',w[key].text||'調査中',key==='blurb'?'prose blurb-box':'prose'),el('span',w[key].verified?'原文照合済み':'未検証','badge')));
  add(body,section('評価',el('p',ratingText(w),'rating'),rows(Object.keys(LIMITS).map(k=>[LABELS[k],w.evaluation.scores[k]===null?'未採点':`${w.evaluation.scores[k]} / ${LIMITS[k]}点`])),el('p','暫定評価と正式評価を区別します。過去参考点には内訳がないため、合計から採点や星を推定しません。','subtle'),...w.reference_scores.map(r=>el('p',`過去参考点 ${r.total}点（${r.date}） · 内訳・根拠は未確認`,'subtle'))));
  add(body,section('作品の強み',bullets(w.strengths)),section('作品の弱み',bullets(w.weaknesses)));
  add(body,section('調査状況',rows([['邦訳調査',w.translation_status],['著作権調査',w.copyright_status],['原文確認',w.original_status]]),el('p','邦訳未発見は未邦訳の確定ではありません。権利の確認は出版前に別途必要です。','subtle')));
  const links=w.original_urls.map(url=>{const a=link(url,url,'source-link');a.target='_blank';a.rel='noopener noreferrer';return a;});
  add(body,section('原文へのリンク',...(links.length?links:[el('p','調査中','subtle')])),section('未確認事項',bullets(unresolved(w))));add(root,body);
}
function route(){
  if(!data)return;
  const hash=location.hash||'#home',isDetail=hash.startsWith('#work/'),name=isDetail?'detail':['home','catalogue','activity','publications'].includes(hash.slice(1))?hash.slice(1):'home';
  if(isDetail){try{detail(decodeURIComponent(hash.slice(6)));}catch{detail('');}}else previous='#'+name;
  for(const view of document.querySelectorAll('.view'))view.hidden=view.id!==name;
  for(const a of document.querySelectorAll('.bottom-nav a')){if(a.hash==='#'+name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  document.title=`${name==='detail'?$('detail').querySelector('h1')?.textContent||'作品詳細':{home:'世界文学発掘叢書',catalogue:'発掘作品',activity:'調査の記録',publications:'出版作品'}[name]}｜星霜書店`;
}
async function load(){
  if(loading)return;loading=true;$('refresh').disabled=true;notice.hidden=false;notice.classList.remove('error');notice.textContent='公開データを確認しています…';
  try{
    const [response,schemaResponse]=await Promise.all([fetch(new URL('./public-candidates.json',import.meta.url),{cache:'no-store'}),fetch(new URL('./public-schema.json',import.meta.url),{cache:'no-store'})]);
    if(!response.ok||!schemaResponse.ok)throw Error('取得失敗');
    const next=validateCatalogue(await response.json(),await schemaResponse.json());data=next;filters();home();catalogue();activity();publications();route();notice.hidden=true;
    $('snapshot-date').textContent=`公開データ生成：${new Date(data.generated_at).toLocaleString('ja-JP')} · 自動同期ではなく、確認して更新する書棚です。`;
  }catch{notice.classList.add('error');notice.textContent=data?'更新できませんでした。前回読み込んだデータを表示しています。「最新の公開データを確認」で再試行できます。':'公開データを読み込めませんでした。通信を確認し、「最新の公開データを確認」を押してください。';}
  finally{loading=false;$('refresh').disabled=false;}
}
let timer;
$('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{limit=24;catalogue();},120);});
for(const id of ['genre','sort','rating-kind'])$(id).addEventListener('change',()=>{limit=24;catalogue();});
$('more').addEventListener('click',()=>{limit+=24;catalogue();});$('refresh').addEventListener('click',load);
addEventListener('hashchange',()=>{route();window.scrollTo(0,0);$('main').focus({preventScroll:true});});
let lastRefresh=Date.now();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRefresh>60000){lastRefresh=Date.now();load();}});
load();
