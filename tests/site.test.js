import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {t} from '../docs/js/i18n.js';

test('Japanese messages preserve interpolated values and English remains available',()=>{
  assert.equal(t('Clear all blocks','ja'),'すべてのブロックを削除');
  assert.equal(t('1.5h still to place.','ja'),'あと1.5時間を配置してください。');
  assert.equal(t('61.5 / 61.5h planned','ja'),'61.5 / 61.5時間を配置済み');
  assert.equal(t('Client call moved: 9月14日, 10:00–11:00.','ja'),'Client callを移動しました：9月14日、10:00〜11:00。');
  assert.equal(t('My custom note','ja'),'My custom note');
  assert.equal(t('Clear all blocks','en'),'Clear all blocks');
});
test('published pages, modules and holiday data resolve within docs/',()=>{
  const root=new URL('../docs/',import.meta.url);
  for(const page of ['index.html','sources.html']){
    const source=readFileSync(new URL(page,root),'utf8');
    for(const [,path] of source.matchAll(/(?:src|href)="([^"]+)"/g)){
      if(path.includes(':')||path.startsWith('#'))continue;
      const resolved=new URL(path,new URL(page,root));
      assert.ok(resolved.href.startsWith(root.href),path);
      assert.ok(existsSync(resolved),path);
    }
  }
  for(const file of readdirSync(new URL('js/',root)).filter(f=>f.endsWith('.js'))){
    const base=new URL('js/'+file,root);
    const source=readFileSync(base,'utf8');
    for(const [,path] of source.matchAll(/(?:from |new URL\()'([^']+)'/g)){
      if(!path.startsWith('.'))continue;
      assert.ok(existsSync(new URL(path,base)),file+': '+path);
    }
  }
  assert.equal(readFileSync(new URL('licenses/LICENSE',root),'utf8'),readFileSync(new URL('../LICENSE',import.meta.url),'utf8'));
  assert.ok(existsSync(new URL('.nojekyll',root)));
});
