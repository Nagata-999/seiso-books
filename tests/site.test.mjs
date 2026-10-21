import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectWorks,metrics,ratingText,validateCatalogue,unresolved} from '../model.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const data=JSON.parse(read('public-candidates.json')),schema=JSON.parse(read('public-schema.json'));
const clone=()=>structuredClone(data);
const referenceOnly=data.candidates.filter(w=>w.evaluation.kind==='unscored'&&w.reference_scores.length);
test('実データ全作品が公開スキーマに適合',()=>{assert.equal(validateCatalogue(data,schema),data);assert(data.candidates.length>=13);});
test('ホームの指標は実データから算出',()=>{const m=metrics(data);assert.equal(m.total,data.candidates.length);assert.equal(m.progress,data.candidates.length/data.target*100);assert.equal(m.high,data.candidates.filter(w=>w.evaluation.total!==null&&w.evaluation.total>=75).length);assert.equal(m.published,0);});
test('原題・著者の検索と大文字小文字',()=>{assert.equal(selectWorks(data.candidates,{query:'AIR TRUST'}).length,1);assert.equal(selectWorks(data.candidates,{query:'Bram Stoker'}).length,1);});
test('邦題・ジャンル検索とジャンル絞り込み',()=>{const d=clone();d.candidates[0].japanese_title='仮の邦題';d.candidates[0].genres=['幻想'];assert.equal(selectWorks(d.candidates,{query:'仮の邦題'}).length,1);assert.equal(selectWorks(d.candidates,{genre:'幻想'}).length,1);});
test('過去参考点から星や採点を捏造しない',()=>{assert.equal(selectWorks(referenceOnly,{sort:'rating'}).filter(w=>w.evaluation.total!==null).length,0);assert.equal(metrics({...data,candidates:referenceOnly}).high,0);assert.match(ratingText(data.candidates[0]),/過去参考点 79点/);assert.doesNotMatch(ratingText(data.candidates[0]),/★/);});
test('過去参考点順と正式評価フィルター',()=>{const a=selectWorks(data.candidates,{sort:'reference'});assert.equal(a[0].reference_scores.at(-1).total,80);assert.equal(selectWorks(referenceOnly,{kind:'formal'}).length,0);assert.equal(selectWorks(data.candidates,{kind:'reference'}).length,referenceOnly.length);});
test('年代不明は年代順の最後',()=>{const a=selectWorks(data.candidates,{sort:'year'});assert.equal(a[0].first_publication_year,Math.min(...data.candidates.map(w=>w.first_publication_year).filter(y=>y!==null)));assert.equal(a.at(-1).first_publication_year,null);});
test('未作成文章と未確認事項',()=>{assert.equal(data.candidates[0].synopsis.text,null);assert(unresolved(data.candidates[0]).some(s=>s.includes('あらすじ')));assert(unresolved(data.candidates[3]).some(s=>s.includes('1971')));});
test('未知のトップレベル・入れ子・機密フィールドを拒否',()=>{for(const mutate of [d=>d.secret='x',d=>d.candidates[0].internal_memo='x',d=>d.candidates[0].authors[0].email='x']){const d=clone();mutate(d);assert.throws(()=>validateCatalogue(d,schema));}});
test('必須項目不足・型不正・ID重複を拒否',()=>{for(const mutate of [d=>delete d.candidates[0].original_title,d=>d.candidates[0].published='yes',d=>d.candidates.push(d.candidates[0])]){const d=clone();mutate(d);assert.throws(()=>validateCatalogue(d,schema));}});
test('範囲外採点・不整合採点・原文未読の正式評価を拒否',()=>{for(const mutate of [d=>d.candidates[0].evaluation.scores.interest=31,d=>d.candidates[0].evaluation.total=79,d=>d.candidates[0].evaluation.kind='formal']){const d=clone();mutate(d);assert.throws(()=>validateCatalogue(d,schema));}});
test('危険URLを拒否',()=>{for(const url of ['javascript:alert(1)','https://user:secret@example.org/','https://example.org/?token=secret']){const d=clone();d.candidates[0].original_urls=[url];assert.throws(()=>validateCatalogue(d,schema));}});
test('1001作品の検索と並べ替え',()=>{const works=Array.from({length:1001},(_,i)=>({...data.candidates[0],id:`id-${i}`,original_title:`Book ${i}`,first_publication_year:1000+i}));assert.equal(selectWorks(works,{query:'Book 1000'}).length,1);assert.equal(selectWorks(works,{sort:'year'})[0].first_publication_year,1000);});
test('プロジェクトパスと外部依存なし',()=>{const html=read('index.html');for(const path of ['./style.css','./app.js','./manifest.webmanifest'])assert(html.includes(path));const app=read('app.js');assert(app.includes("new URL('./public-candidates.json',import.meta.url)"));assert(app.includes("cache:'no-store'"));assert(!app.includes('innerHTML'));assert(!app.includes('localStorage'));});
test('PWAは相対パス・適切なPNG寸法',()=>{const m=JSON.parse(read('manifest.webmanifest'));assert.equal(m.start_url,'./#home');assert.equal(m.scope,'./');for(const n of [192,512]){const b=readFileSync(new URL(`../assets/icon-${n}.png`,import.meta.url));assert.equal(b.readUInt32BE(16),n);assert.equal(b.readUInt32BE(20),n);}});
test('非公開管理情報を公開データに含めない',()=>{const raw=read('public-candidates.json');for(const key of ['research_history','approved_by','commercial_concerns','scoring_rationale','source_ids','content_hash'])assert(!raw.includes(`"${key}"`));});

test('同日登録は正本の後に追加された作品が先',()=>{assert.equal(selectWorks(data.candidates)[0].id,data.candidates.at(-1).id);});


test('新規3作品の紹介と暫定評価が表示用データに保持される',()=>{for(const [id,total] of [['work-clockwork-man-1923',83],['work-hampdenshire-wonder-1911',81],['work-after-london-1885',77]]){const w=data.candidates.find(w=>w.id===id);assert(w);assert(w.synopsis.text);assert(w.blurb.text);assert.equal(w.synopsis.verified,false);assert.equal(w.blurb.verified,false);assert.equal(w.evaluation.kind,'provisional');assert.equal(w.evaluation.total,total);assert.equal(w.evaluation.stars,4);assert.equal(w.translation_status,'邦訳未発見・未確認');assert.equal(w.copyright_status,'要確認');assert.equal(w.original_status,'未確認');assert.equal(w.published,false);}});
test('正式評価と新規の暫定評価を混同しない',()=>{const ids=new Set(['work-clockwork-man-1923','work-hampdenshire-wonder-1911','work-after-london-1885']);const incoming=data.candidates.filter(w=>ids.has(w.id));assert.equal(selectWorks(incoming,{kind:'provisional'}).length,3);assert.equal(selectWorks(incoming,{kind:'formal'}).length,0);assert.equal(selectWorks(incoming,{sort:'rating'})[0].evaluation.total,83);});
