'use client';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import pl from '../../../messages/pl.json';
import en from '../../../messages/en.json';
import type { MemoryCommit } from './types';

export function notifyMemoryCommit(metadata:{[key:string]:unknown},locale:'pl'|'en',onSaved?:(commit:MemoryCommit)=>void):void {
  const commit=metadata.memoryCommit;
  if(!commit || typeof commit!=='object' || !('status' in commit) || commit.status!=='failed')return;
  const t=(locale==='en'?en:pl).CampaignMemory;
  const retryToken='retryToken' in commit && typeof commit.retryToken==='string'?commit.retryToken:undefined;
  toast({title:t.failed,description:t.description,variant:'destructive',duration:Infinity,
    action:retryToken?<ToastAction altText={t.retry} onClick={()=>{
      void fetch('/api/memory/turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({retryToken})})
        .then(async r=>{const data=await r.json();if(!r.ok||data.memoryCommit?.status!=='saved')throw new Error('save');onSaved?.(data.memoryCommit);toast({title:t.saved});})
        .catch(()=>notifyMemoryCommit(metadata,locale,onSaved));
    }}>{t.retry}</ToastAction>:undefined});
}
