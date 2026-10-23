import test from 'node:test';
import assert from 'node:assert/strict';
import { prefersSystemShare,xPostUrl,copyImage } from '../src/share-card.js';

test('分享：手机交给系统分享面板（可选小红书、X），电脑出菜单；X 链接只带文字和网址',()=>{
  const file={name:'card.png'};
  const touch=()=>({matches:true}),mouse=()=>({matches:false});
  const canShare={canShare:({files})=>files.length===1};
  assert.equal(prefersSystemShare(file,canShare,touch),true);
  assert.equal(prefersSystemShare(file,canShare,mouse),false,'电脑的系统面板通常没有小红书和 X');
  assert.equal(prefersSystemShare(file,{},touch),false,'不支持分享文件时退回菜单');
  assert.equal(xPostUrl('看看 & 试试','https://usageplanner.com/zh/'),
    'https://x.com/intent/post?text=%E7%9C%8B%E7%9C%8B%20%26%20%E8%AF%95%E8%AF%95&url=https%3A%2F%2Fusageplanner.com%2Fzh%2F');
});

test('复制图片：剪贴板不可用时如实返回失败，不抛错',async()=>{
  assert.equal(await copyImage({type:'image/png'},{}),false);
  assert.equal(await copyImage({type:'image/png'},{clipboard:{write:async()=>{throw new Error('denied');}}}),false);
});
