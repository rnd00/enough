import ja from './ja.js';

let language='en';
try{language=localStorage.getItem('enough-language')==='ja'?'ja':'en';}catch{}
export const locale=()=>language==='ja'?'ja-JP':'en-US';
const patterns=Object.entries(ja).filter(([key])=>key.includes('{0}')).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([key,value])=>({
  expression:new RegExp('^'+key.split(/\{\d+\}/).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.*?)')+'$'),value
}));
export function t(source,selectedLanguage=language){
  if(selectedLanguage!=='ja')return source;
  if(ja[source])return ja[source];
  for(const {expression,value} of patterns){const match=source.match(expression);if(match)return value.replace(/\{(\d+)\}/g,(_,i)=>match[Number(i)+1]);}
  return source;
}
export function initializeLanguage(onChange=()=>{}){
  const nodes=[],attributes=[];
  const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.textContent.trim()&&!node.parentElement.closest('script,style'))nodes.push([node,node.textContent]);
  }
  for(const element of document.querySelectorAll('[aria-label],[placeholder],[title],optgroup')){
    for(const attribute of ['aria-label','placeholder','title','label'])if(element.hasAttribute(attribute))attributes.push([element,attribute,element.getAttribute(attribute)]);
  }
  const select=document.getElementById('language');
  function apply(){
    document.documentElement.lang=language;
    for(const [node,source] of nodes)if(node.isConnected)node.textContent=source.replace(source.trim(),t(source.trim()));
    for(const [element,attribute,source] of attributes)element.setAttribute(attribute,t(source));
    const countries=new Intl.DisplayNames([locale()],{type:'region'});
    for(const option of document.querySelectorAll('#region option'))if(/^[A-Z]{2}$/.test(option.value))option.textContent=countries.of(option.value);
    select.value=language;
  }
  select.onchange=()=>{
    language=select.value;
    try{localStorage.setItem('enough-language',language);}catch{}
    apply();onChange();
  };
  apply();
}
