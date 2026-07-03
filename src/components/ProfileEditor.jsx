import { useState } from 'react'
import { Check, Edit3, RotateCcw, X } from 'lucide-react'

const GOALS = ['Build Muscle', 'Lose Fat', 'Increase Strength', 'Improve Endurance', 'Athletic Performance', 'General Fitness']
const EXPERIENCE = ['Complete Beginner', '6-12 Months', '1-3 Years', '3-5 Years', '5+ Years']
const EQUIPMENT = ['Full Gym', 'Home Gym', 'Minimal', 'Bodyweight Only']
const DIETARY = ['No Restrictions', 'Vegan', 'Vegetarian', 'Pescatarian', 'Gluten-Free', 'Dairy-Free', 'Nut Allergy', 'Halal', 'Kosher']

function inputClass(e=false){return`w-full rounded-lg border bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#555] focus:border-accent ${e?'border-red-400':'border-line'}`}
function Label({children}){return<span className="mb-2 block font-heading text-base uppercase text-white">{children}</span>}
function Pill({label,selected,onClick}){return<button type="button" onClick={onClick} className={`min-h-10 rounded-lg border px-3 py-2 text-left font-heading text-sm uppercase transition ${selected?'border-accent bg-accent text-black':'border-line bg-[#111] text-white hover:border-accent/60'}`}>{label}</button>}

function ProfileDisplay({profile,onEdit}){
  const eqLabel=Array.isArray(profile.equipment)?profile.equipment.join(', '):profile.equipment||'—'
  const goalLabel=Array.isArray(profile.primaryGoal)?profile.primaryGoal.join(', '):profile.primaryGoal||'—'
  const dietLabel=[profile.dietaryRestrictions,profile.dietaryOther].filter(Boolean).join(', ')||'None'
  const rows=[['Name',profile.name],['Age',profile.age],['Gender',profile.gender],['Height',profile.height],['Current Weight',profile.weightLbs?`${profile.weightLbs} lbs`:null],['Desired Weight',profile.desiredWeightLbs?`${profile.desiredWeightLbs} lbs`:'Not set'],['Experience',profile.experience],['Training Days',profile.daysPerWeek?`${profile.daysPerWeek} days/week`:null],['Equipment',eqLabel],['Goals',goalLabel],['Injuries',profile.limitations||'None'],['Dietary',dietLabel]].filter(([,v])=>v)
  return(
    <div className="grid gap-4">
      <div className="rounded-lg border border-line bg-[#111] p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div><p className="font-heading text-sm uppercase text-accent">Assessment Answers</p><h4 className="font-heading text-2xl uppercase text-white">Your Profile</h4></div>
          <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-heading text-sm uppercase text-white transition hover:border-accent"><Edit3 size={14}/>Edit</button>
        </div>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{rows.map(([label,value])=><div key={label}><p className="text-xs font-medium uppercase tracking-wider text-body/60">{label}</p><p className="mt-0.5 text-sm leading-6 text-white">{value}</p></div>)}</div>
      </div>
      <div className="rounded-lg border border-line bg-[#111] p-4 text-sm leading-6 text-body">Editing your profile will regenerate your current plan based on the new answers. Your logged workout history and progress will be kept.</div>
    </div>
  )
}

function ConfirmDialog({onConfirm,onCancel,isLoading}){
  return(
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-6 text-center">
      <p className="font-heading text-xl uppercase text-white">Regenerate Your Plan?</p>
      <p className="mt-3 text-sm leading-6 text-body">Lindsay will build a fresh plan based on your updated profile. Your logged workout history is kept, only the program itself will change.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-card px-6 font-heading text-base uppercase text-white transition hover:border-accent"><X size={15}/>Go Back</button>
        <button type="button" onClick={onConfirm} disabled={isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-heading text-base uppercase text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"><RotateCcw size={15}/>Yes, Update My Plan</button>
      </div>
    </div>
  )
}

function normalizeDraft(p){
  return{...p,equipment:Array.isArray(p.equipment)?p.equipment:p.equipment?[p.equipment]:[],primaryGoal:Array.isArray(p.primaryGoal)?p.primaryGoal:p.primaryGoal?[p.primaryGoal]:[],dietaryRestrictions:p.dietaryRestrictions||'',dietaryOther:p.dietaryOther||'',limitations:p.limitations||'',desiredWeightLbs:p.desiredWeightLbs||''}
}

export default function ProfileEditor({profile,onUpdate,isLoading}){
  const[mode,setMode]=useState('view')
  const[draft,setDraft]=useState(null)
  function startEdit(){setDraft(normalizeDraft(profile));setMode('edit')}
  function cancelEdit(){setDraft(null);setMode('view')}
  function setField(k,v){setDraft(d=>({...d,[k]:v}))}
  function toggleMulti(k,opt){setDraft(d=>{const c=Array.isArray(d[k])?d[k]:[];return{...d,[k]:c.includes(opt)?c.filter(v=>v!==opt):[...c,opt]}})}
  function toggleDietary(opt){
    const c=draft.dietaryRestrictions.split(',').map(s=>s.trim()).filter(Boolean)
    let n
    if(opt==='No Restrictions'){n=c.includes(opt)?[]:['No Restrictions']}
    else{const w=c.filter(v=>v!=='No Restrictions');n=w.includes(opt)?w.filter(v=>v!==opt):[...w,opt]}
    setField('dietaryRestrictions',n.join(', '))
  }
  const isValid=draft?.name?.trim()&&draft?.age&&draft?.gender&&draft?.weightLbs&&draft?.height&&draft?.primaryGoal?.length&&draft?.experience&&draft?.daysPerWeek&&draft?.equipment?.length
  if(mode==='view')return<ProfileDisplay profile={profile} onEdit={startEdit}/>
  if(mode==='confirm')return<ConfirmDialog onConfirm={()=>{onUpdate(draft);setMode('view');setDraft(null)}} onCancel={()=>setMode('edit')} isLoading={isLoading}/>
  const dietSel=draft.dietaryRestrictions.split(',').map(s=>s.trim()).filter(Boolean)
  return(
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div><p className="font-heading text-sm uppercase text-accent">Assessment Answers</p><h4 className="font-heading text-2xl uppercase text-white">Edit Profile</h4></div>
        <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 font-heading text-sm uppercase text-white transition hover:border-accent"><X size={14}/>Cancel</button>
      </div>
      <div className="rounded-lg border border-line bg-[#111] p-4 sm:p-5">
        <p className="mb-4 font-heading text-base uppercase text-accent">Basic Info</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Name</Label><input className={inputClass(!draft.name?.trim())} value={draft.name} onChange={e=>setField('name',e.target.value)} placeholder="Your name"/></div>
          <div><Label>Age</Label><input className={inputClass(!draft.age)} type="number" min="13" max="100" value={draft.age} onChange={e=>setField('age',e.target.value)} placeholder="32"/></div>
          <div><Label>Gender</Label><select className={inputClass(!draft.gender)} value={draft.gender} onChange={e=>setField('gender',e.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></div>
          <div><Label>Height</Label><input className={inputClass(!draft.height?.trim())} value={draft.height} onChange={e=>setField('height',e.target.value)} placeholder="5'8&quot;"/></div>
          <div><Label>Current Weight (lbs)</Label><input className={inputClass(!draft.weightLbs)} type="number" min="50" max="700" value={draft.weightLbs} onChange={e=>setField('weightLbs',e.target.value)} placeholder="165"/></div>
          <div><Label>Desired Weight (lbs)</Label><input className={inputClass(false)} type="number" min="50" max="700" value={draft.desiredWeightLbs} onChange={e=>setField('desiredWeightLbs',e.target.value)} placeholder="Optional"/></div>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-[#111] p-4 sm:p-5">
        <p className="mb-4 font-heading text-base uppercase text-accent">Goals & Experience</p>
        <div className="mb-5"><Label>Primary Goal</Label><p className="mb-2 text-xs text-body">Select all that apply.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{GOALS.map(g=><Pill key={g} label={g} selected={draft.primaryGoal.includes(g)} onClick={()=>toggleMulti('primaryGoal',g)}/>)}</div>{!draft.primaryGoal.length&&<p className="mt-2 text-xs text-red-400">Choose at least one goal.</p>}</div>
        <div><Label>Training Experience</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{EXPERIENCE.map(e=><Pill key={e} label={e} selected={draft.experience===e} onClick={()=>setField('experience',e)}/>)}</div>{!draft.experience&&<p className="mt-2 text-xs text-red-400">Choose your experience level.</p>}</div>
      </div>
      <div className="rounded-lg border border-line bg-[#111] p-4 sm:p-5">
        <p className="mb-4 font-heading text-base uppercase text-accent">Training Setup</p>
        <div className="mb-5"><Label>Days Per Week</Label><div className="grid grid-cols-5 gap-2">{[2,3,4,5,6].map(d=><button key={d} type="button" onClick={()=>setField('daysPerWeek',String(d))} className={`aspect-square min-h-11 rounded-lg border font-heading text-xl transition ${draft.daysPerWeek===String(d)?'border-accent bg-accent text-black':'border-line bg-[#0b0b0b] text-white hover:border-accent/60'}`}>{d}</button>)}</div></div>
        <div><Label>Equipment Access</Label><p className="mb-2 text-xs text-body">Select all that apply.</p><div className="grid grid-cols-2 gap-2">{EQUIPMENT.map(e=><Pill key={e} label={e} selected={draft.equipment.includes(e)} onClick={()=>toggleMulti('equipment',e)}/>)}</div>{!draft.equipment.length&&<p className="mt-2 text-xs text-red-400">Choose at least one option.</p>}</div>
      </div>
      <div className="rounded-lg border border-line bg-[#111] p-4 sm:p-5">
        <p className="mb-4 font-heading text-base uppercase text-accent">Health & Diet</p>
        <div className="mb-5"><Label>Injuries / Limitations</Label><textarea className={`${inputClass(false)} min-h-24 resize-none`} value={draft.limitations} onChange={e=>setField('limitations',e.target.value)} placeholder="Shoulder history, knee pain, etc."/></div>
        <div><Label>Dietary Restrictions / Allergies</Label><p className="mb-2 text-xs text-body">Select all that apply.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{DIETARY.map(o=><Pill key={o} label={o} selected={dietSel.includes(o)} onClick={()=>toggleDietary(o)}/>)}</div><input className={`${inputClass(false)} mt-3`} value={draft.dietaryOther} onChange={e=>setField('dietaryOther',e.target.value)} placeholder="Other allergies or foods to avoid (optional)"/></div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={cancelEdit} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-card px-6 font-heading text-base uppercase text-white transition hover:border-accent">Cancel</button>
        <button type="button" disabled={!isValid} onClick={()=>setMode('confirm')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-heading text-base uppercase text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"><Check size={16}/>Save & Update Plan</button>
      </div>
    </div>
  )
}
