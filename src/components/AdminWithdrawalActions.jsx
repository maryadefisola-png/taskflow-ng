import React,{useState} from 'react'
import { supabase } from '../supabase'

export default function AdminWithdrawalActions({ withdrawal, onDone, onMessage }) {
 const [busy,setBusy]=useState(false)
 const status=String(withdrawal?.status||'').toLowerCase()
 async function run(fn,args,message){try{setBusy(true);const {error}=await supabase.rpc(fn,args);if(error)throw error;onMessage?.(message);await onDone?.()}catch(e){onMessage?.(e.message||'Action failed')}finally{setBusy(false)}}
 async function approve(){if(!confirm(`Approve ₦${Number(withdrawal.amount||0).toLocaleString('en-NG')} for ${withdrawal.account_name||'this user'}?`))return;await run('approve_withdrawal',{p_withdrawal_id:withdrawal.id},'Withdrawal approved. Pay the user, then mark it Paid.')}
 async function paid(){const ref=prompt('Enter bank transfer/payment reference:');if(!ref?.trim())return;if(!confirm('Confirm that this withdrawal has been paid?'))return;await run('mark_withdrawal_paid',{p_withdrawal_id:withdrawal.id,p_payout_reference:ref.trim(),p_admin_note:''},'Withdrawal marked Paid.')}
 async function reject(){const reason=prompt('Reason for rejection:');if(!reason?.trim())return;await run('cancel_manual_withdrawal',{p_withdrawal_id:withdrawal.id,p_reason:reason.trim()},'Withdrawal rejected.')}
 if(status==='pending')return <div className="admin-actions"><button className="gv-primary compact" disabled={busy} onClick={approve}>{busy?'Working…':'Approve'}</button><button className="gv-danger compact" disabled={busy} onClick={reject}>Reject</button></div>
 if(status==='approved'||status==='processing')return <div className="admin-actions"><button className="gv-primary compact" disabled={busy} onClick={paid}>{busy?'Working…':'Mark Paid'}</button><button className="gv-danger compact" disabled={busy} onClick={reject}>Reject</button></div>
 return null
}
