export const LIMITS = {interest:30,demand:25,cultural_value:20,rarity:15,publishability:10};
export const LABELS = {interest:'面白さ',demand:'市場需要',cultural_value:'文化的価値',rarity:'邦訳希少性',publishability:'出版適性'};
export const KINDS = {unscored:'未採点',provisional:'暫定評価',formal:'正式評価'};
export function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n);}
export function referenceTotal(w){return w.reference_scores.length ? w.reference_scores.at(-1).total : -1;}
export function ratingText(w){const e=w.evaluation;return e.total===null ? (referenceTotal(w)<0?'未採点':`過去参考点 ${referenceTotal(w)}点 · 未採点`) : `${stars(e.stars)} ${e.total}点 · ${KINDS[e.kind]}`;}
export function searchable(w){return [w.original_title,w.japanese_title,...w.authors.map(a=>a.name),...w.genres].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase('ja');}
export function selectWorks(works,{query='',genre='',kind='',sort='recent'}={}){
  const position=new Map(works.map((w,i)=>[w.id,i]));
  const terms=query.normalize('NFKC').toLocaleLowerCase('ja').trim().split(/\s+/).filter(Boolean);
  const result=works.filter(w=>terms.every(t=>searchable(w).includes(t))&&(!genre||w.genres.includes(genre))&&(!kind||(kind==='reference'?w.evaluation.kind==='unscored'&&w.reference_scores.length:w.evaluation.kind===kind)));
  const cmp=(a,b)=>sort==='rating'?(b.evaluation.total??-1)-(a.evaluation.total??-1):sort==='reference'?referenceTotal(b)-referenceTotal(a):sort==='year'?(a.first_publication_year??99999)-(b.first_publication_year??99999):sort==='title'?a.original_title.localeCompare(b.original_title):sort==='research'?(b.research_date??'').localeCompare(a.research_date??''):(b.registered_on??'').localeCompare(a.registered_on??'');
  return result.sort((a,b)=>cmp(a,b)||(sort==='recent'?position.get(b.id)-position.get(a.id):a.id.localeCompare(b.id)));
}
export function metrics(data){const works=data.candidates;return {total:works.length,progress:works.length/data.target*100,high:works.filter(w=>w.evaluation.total!==null&&w.evaluation.total>=75).length,translation:works.filter(w=>!['未調査','調査中'].includes(w.translation_status)).length,rights:works.filter(w=>w.copyright_status==='確認済み').length,published:works.filter(w=>w.published).length,latest:works.map(w=>w.research_date).filter(Boolean).sort().at(-1)??null};}
export function unresolved(w){return [...new Set([...w.unverified_points,...(!w.synopsis.text?['あらすじは調査中です。']:[]),...(!w.blurb.text?['紹介文は調査中です。']:[]),...(!w.first_publication_year?['初版年の確認が必要です。']:[]),...(w.original_status!=='読了'?['原文の通読は未確認です。']:[]),...(w.evaluation.kind==='unscored'?['評価内訳・採点根拠は未確認です。']:[]),...(w.copyright_status!=='確認済み'?['著作権の確認が必要です。']:[]),...(['未調査','調査中','邦訳未発見・未確認'].includes(w.translation_status)?['邦訳調査は未確定です。']:[])])];}

// Small schema reader for the limited JSON Schema keywords used by the public contract.
export function validate(value,schema,path='$'){
  const kind=value===null?'null':Array.isArray(value)?'array':typeof value==='number'&&Number.isInteger(value)?'integer':typeof value;
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  if(!types.includes(kind))throw Error(`${path}: 型が不正`);
  if(schema.enum&&!schema.enum.includes(value))throw Error(`${path}: 値が不正`);
  if(value===null)return;
  if(kind==='object'){
    for(const k of schema.required??[])if(!Object.hasOwn(value,k))throw Error(`${path}: 必須項目不足`);
    for(const k of Object.keys(value)){if(!Object.hasOwn(schema.properties??{},k)&&schema.additionalProperties===false)throw Error(`${path}: 未定義項目`);if(schema.properties?.[k])validate(value[k],schema.properties[k],`${path}.${k}`);}
  }
  if(kind==='array')value.forEach((v,i)=>validate(v,schema.items,`${path}[${i}]`));
  if(kind==='integer'&&(value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)))throw Error(`${path}: 範囲外`);
  if(kind==='string'&&schema.minLength&&value.trim().length<schema.minLength)throw Error(`${path}: 空文字`);
}
export function validateCatalogue(data,schema){
  validate(data,schema);
  const ids=new Set();
  for(const w of data.candidates){
    if(ids.has(w.id))throw Error('作品IDが重複');ids.add(w.id);
    const e=w.evaluation,values=Object.values(e.scores),complete=values.every(v=>v!==null);
    if((e.kind!=='unscored')!==complete)throw Error('評価区分が不整合');
    if(!complete&&(e.total!==null||e.stars!==null))throw Error('未採点の合計・星は使用不可');
    if(complete){const total=values.reduce((a,b)=>a+b,0),n=total>=90?5:total>=75?4:total>=60?3:total>=40?2:1;if(e.total!==total||e.stars!==n)throw Error('評価計算が不整合');if(e.kind==='formal'&&w.original_status!=='読了')throw Error('原文未読の正式評価');}
    for(const url of w.original_urls){const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('公開URLが不正');}
  }
  return data;
}
