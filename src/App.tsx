import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, Diamond, ExternalLink, FileText,
  Archive, Download, Eye, Flag, Layers3, LockKeyhole, LogOut, Mail, Menu,
  MoreHorizontal, Plus, Save, Search, Settings, SlidersHorizontal, Sparkles,
  Star, Trash2, UserPlus, UserRound, X, ZoomIn, History, Clock3
} from 'lucide-react'
import './index.css'

type Kind = 'bar' | 'diamond' | 'flag' | 'star'
type TechItem = {
  id: number; title: string; lane: string; start: number; end: number; kind: Kind;
  color: string; status: string; owner: string; description: string; category: string; entryYear?: string;
  openEnded?: boolean; unit?: string; subUnit?: string; technologyType?: string; nature?: string;
  trl?: string; components?: string; automation?: string; inputSource?: string; safety?: string;
  environment?: string; support?: string; experts?: string; provider?: string; country?: string;
  dependencies?: string[]; userUnits?: string; technologyParts?: string[]; documentTypes?: string[];
  archiveLocation?: string; capabilities?: Record<string,string>; strategicFactors?: Record<string,string>; urgent?: boolean
}
type Snapshot = { id: number; title: string; createdAt: string; year: string; dashboard: 'tool'|'scalable'; items: TechItem[] }
type Account = { username: string; password: string; admin?: boolean }
type HistoryEntry = { id: number; user: string; action: 'افزودن'|'ویرایش'|'حذف'|'جابه‌جایی'|'ذخیره نسخه'; target: string; detail: string; date: string; timestamp: number }
type RoadmapData = { tool: TechItem[]; scalable: TechItem[] }
type AccessEntry = { id:number; username:string; action:'ورود'|'خروج'; date:string }

const lanes = [
  { id: 'identified', title: 'شناسایی‌شده‌ها', en: 'IDENTIFIED', tint: '#f7f3ff' },
  { id: 'plan', title: 'برنامه‌ریزی', en: 'PLAN', tint: '#f4f8ff' },
  { id: 'test', title: 'آزمایش و اعتبارسنجی', en: 'TEST', tint: '#fffaf0' },
  { id: 'develop', title: 'توسعه', en: 'DEVELOP', tint: '#f3fbf7' },
  { id: 'launch', title: 'عرضه و پایش', en: 'LAUNCH', tint: '#f7f8fa' },
]
const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']
const fa = (value: number | string) => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
const monthDay = (value: number) => ({ month: Math.floor(value), day: Math.min(30, Math.max(1, Math.round((value % 1) * 30) + 1)) })
const toPosition = (month: number, day: number) => month + (day - 1) / 30

const toolItems: TechItem[] = []
const scalableItems: TechItem[] = []
const ratingOptions = ['زیاد','متوسط','کم','وجود ندارد']
const capabilityNames = ['توانمندی در بهره‌برداری','توانمندی در نگهداری','توانمندی در تعمیرات','توانمندی در تغییر، ارتقا و بهبود فناوری']
const factorNames = ['اهمیت و جایگاه فناوری در واحد','میزان ریسک توقف و خرابی','میزان فوریت در نوسازی و جایگزینی','میزان وابستگی به خارج سازمان']
const organizationUnits = ['بهره‌برداری','بازرسی فنی','مهندسی و اجرا','فناوری اطلاعات و ارتباطات','اندازه‌گیری','HSE','بهینه‌سازی و انرژی','برنامه‌ریزی','GIS']
const operationSubUnits = ['امدادرسانی','مشترکین','نگهداری و تعمیرات','نصب و انشعابات','خدمات متمرکز فنی']

const normalizeData = (value: RoadmapData): RoadmapData => ({
  tool: (value.tool || []).map(i => i.unit==='خدمات متمرکز فنی'?{...i,unit:'بهره‌برداری',subUnit:'خدمات متمرکز فنی'}:i),
  scalable: (value.scalable || []).map(i => i.unit==='خدمات متمرکز فنی'?{...i,unit:'بهره‌برداری',subUnit:'خدمات متمرکز فنی'}:i),
})

const loadRoadmapData = (): RoadmapData => {
  const keys = ['markazi-gas-roadmap-data-v2','rahnegar-data','markazi-gas-roadmap-backup']
  const candidates = keys.flatMap(key => { try { const raw=localStorage.getItem(key); return raw?[normalizeData(JSON.parse(raw))]:[] } catch { return [] } })
  const populated = candidates.find(d => d.tool.length + d.scalable.length > 0)
  return populated || candidates[0] || { tool: toolItems, scalable: scalableItems }
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('rahnegar-login') === 'gas-company-authenticated')
  const [loginStep, setLoginStep] = useState<'intro'|'form'>('intro')
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaNumbers, setCaptchaNumbers] = useState<[number,number]>(()=>[Math.ceil(Math.random()*8),Math.ceil(Math.random()*8)])
  const [accounts, setAccounts] = useState<Account[]>(() => { try { const saved:Account[]=JSON.parse(localStorage.getItem('rahnegar-users') || '[{"username":"شرکت گاز","password":"123456789","admin":true}]'); return saved.map((a,i)=>({...a,admin:a.admin??i===0})) } catch { return [{username:'شرکت گاز',password:'123456789',admin:true}] } })
  const [accessHistory,setAccessHistory]=useState<AccessEntry[]>(()=>{try{return JSON.parse(localStorage.getItem('rahnegar-access-history')||'[]')}catch{return[]}})
  const [showCredentials,setShowCredentials]=useState(false)
  const [adminName,setAdminName]=useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 650)
  const [user, setUser] = useState({ name: localStorage.getItem('rahnegar-current-user') || 'شرکت گاز', role: '', email: '' })
  const [newAccount, setNewAccount] = useState<Account>({username:'',password:''})
  const [dashboard, setDashboard] = useState<'tool'|'scalable'>('scalable')
  const [view, setView] = useState<'roadmap'|'calendar'|'archive'|'capabilities'|'history'|'settings'|'profile'>('roadmap')
  const [history, setHistory] = useState<HistoryEntry[]>(() => { try { return JSON.parse(localStorage.getItem('rahnegar-history') || '[]') } catch { return [] } })
  const [historyQuery, setHistoryQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(0)
  const [calendarDay, setCalendarDay] = useState('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => { try { return JSON.parse(localStorage.getItem('rahnegar-snapshots')||'[]') } catch { return [] } })
  const [snapshotTitle, setSnapshotTitle] = useState('نسخه رسمی نقشه راه')
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null)
  const [data, setData] = useState<RoadmapData>(loadRoadmapData)
  const [selected, setSelected] = useState<TechItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('همه وضعیت‌ها')
  const [laneFilter, setLaneFilter] = useState('همه دسته‌ها')
  const [kindFilter, setKindFilter] = useState('همه انواع')
  const [ownerFilter, setOwnerFilter] = useState('همه تیم‌ها')
  const [unitFilter, setUnitFilter] = useState('همه واحدها')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(() => Number(new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric'}).format(new Date())))
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('rahnegar-theme') as 'light'|'dark') || 'light')
  const [compactMode, setCompactMode] = useState(()=>localStorage.getItem('rahnegar-compact')==='yes')
  const [animations, setAnimations] = useState(()=>localStorage.getItem('rahnegar-animations')!=='no')
  const [notifications, setNotifications] = useState(()=>localStorage.getItem('rahnegar-notifications')!=='no')
  const [passwordChange, setPasswordChange] = useState({username:'شرکت گاز',password:''})
  const [zoom, setZoom] = useState('ماهانه')
  const timelineRef = useRef<HTMLDivElement>(null)
  const key = dashboard
  const items = data[key]
  const isAdmin = !!accounts.find(a=>a.username===user.name)?.admin
  const today = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day:'numeric', month:'long', year:'numeric' }).format(new Date())
  const currentYear = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year:'numeric' }).format(new Date())
  const currentYearNumber = Number(currentYear.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))

  useEffect(() => {
    const serialized=JSON.stringify(data)
    localStorage.setItem('markazi-gas-roadmap-data-v2', serialized)
    localStorage.setItem('markazi-gas-roadmap-backup', serialized)
  }, [data])
  useEffect(() => { localStorage.setItem('rahnegar-snapshots', JSON.stringify(snapshots)) }, [snapshots])
  useEffect(() => { localStorage.setItem('rahnegar-history', JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem('rahnegar-access-history',JSON.stringify(accessHistory)) }, [accessHistory])
  useEffect(() => { document.documentElement.dataset.theme=theme; localStorage.setItem('rahnegar-theme',theme) }, [theme])
  useEffect(() => { document.documentElement.dataset.compact=compactMode?'yes':'no'; localStorage.setItem('rahnegar-compact',compactMode?'yes':'no') }, [compactMode])
  useEffect(() => { document.documentElement.dataset.animations=animations?'yes':'no'; localStorage.setItem('rahnegar-animations',animations?'yes':'no') }, [animations])

  const recordHistory = (action: HistoryEntry['action'], target: string, detail: string) => {
    const now = new Date()
    const date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle:'medium', timeStyle:'short' }).format(now)
    setHistory(h => [{ id: now.getTime(), user: user.name, action, target, detail, date, timestamp: now.getTime() }, ...h])
  }

  const visible = useMemo(() => items.filter(i =>
    i.title.includes(query) && (statusFilter === 'همه وضعیت‌ها' || i.status === statusFilter) &&
    (laneFilter === 'همه دسته‌ها' || i.lane === laneFilter) && (unitFilter === 'همه واحدها' || i.unit === unitFilter) &&
    (kindFilter === 'همه انواع' || (kindFilter==='رویدادهای کلیدی' ? i.kind!=='bar' : i.kind===kindFilter)) &&
    (ownerFilter === 'همه تیم‌ها' || i.owner === ownerFilter) && (!urgentOnly || i.urgent) && (()=>{const y=Number((i.entryYear||currentYear).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));return y===selectedYear||(i.openEnded&&y<=selectedYear)})()
  ), [items, query, statusFilter, laneFilter, unitFilter, kindFilter, ownerFilter, urgentOnly, selectedYear, currentYear])

  const calendarItems = items.filter(i => { const y=Number((i.entryYear||currentYear).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))); return y===selectedYear||(i.openEnded&&y<=selectedYear) })

  const dependencyPairs = (laneId: string) => visible.flatMap(item =>
    (item.dependencies || []).map(title => ({ item, dependency: visible.find(i => i.title === title) }))
      .filter(pair => pair.item.lane === laneId && pair.dependency)
  )

  const updateItem = (next: TechItem) => {
    setData(d => ({ ...d, [key]: d[key].map(i => i.id === next.id ? next : i) }))
    setSelected(next)
    recordHistory('ویرایش', next.title, `اطلاعات ${next.kind==='bar'?'فناوری':'رویداد'} ویرایش و ذخیره شد`)
  }

  const beginDrag = (e: React.PointerEvent, item: TechItem, mode: 'move'|'left'|'right') => {
    e.stopPropagation(); e.preventDefault()
    const startX = e.clientX; const original = { ...item }
    const move = (ev: PointerEvent) => {
      const width = timelineRef.current?.getBoundingClientRect().width || 1200
      const delta = (ev.clientX - startX) / width * 12
      let start = original.start, end = original.end
      if (mode === 'move') { start += delta; end += delta }
      if (mode === 'left') start += delta
      if (mode === 'right') end += delta
      const duration = end - start
      if (start < 0) { start = 0; if (mode === 'move') end = duration }
      if (end > 11.85) { end = 11.85; if (mode === 'move') start = end - duration }
      if (end < start + .25 && item.kind === 'bar') mode === 'left' ? start = end - .25 : end = start + .25
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-lane]')
      const lane = mode === 'move' && target?.dataset.lane ? target.dataset.lane : item.lane
      setData(d => ({ ...d, [key]: d[key].map(i => i.id === item.id ? { ...i, start, end, lane, category: lanes.find(l=>l.id===lane)?.title || i.category } : i) }))
    }
    const up = () => { recordHistory('جابه‌جایی', item.title, mode==='move'?'موقعیت آیتم روی خط زمانی تغییر کرد':'بازه زمانی آیتم تغییر کرد'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const addItem = (lane: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const start = Math.max(0, Math.min(10.5, (e.clientX - rect.left) / rect.width * 12))
    const item: TechItem = { id: Date.now(), title: 'فناوری جدید', lane, start, end: start + 1.35, kind: 'bar', color: '#4d83dc', status: 'پیش‌نویس', owner: 'بدون مسئول', description: 'برای تکمیل اطلاعات این آیتم کلیک کنید.', category: lanes.find(l => l.id === lane)?.title || '', entryYear: currentYear }
    setData(d => ({ ...d, [key]: [...d[key], item] })); setSelected(item); setEditing(true); recordHistory('افزودن', item.title, `فناوری جدید به لایه ${item.category} اضافه شد`)
  }

  const addSpecialItem = (kind: Kind) => {
    const titles: Record<Kind,string> = {bar:'فناوری جدید',diamond:'نقطه عطف جدید',flag:'رویداد کلیدی جدید',star:'عرضه جدید'}
    const colors: Record<Kind,string> = {bar:'#4d83dc',diamond:'#e79b3d',flag:'#e45f59',star:'#3978d3'}
    const lane = kind==='star'?'launch':kind==='diamond'?'test':'plan'
    const item: TechItem={id:Date.now(),title:titles[kind],lane,start:1,end:kind==='bar'?2.2:1,kind,color:colors[kind],status:'پیش‌نویس',owner:'',description:'',category:lanes.find(l=>l.id===lane)?.title||'',entryYear:currentYear}
    setData(d=>({...d,[key]:[...d[key],item]}));setSelected(item);setEditing(true);recordHistory('افزودن',item.title,`${titles[kind]} به نقشه راه اضافه شد`)
  }

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(captcha) !== captchaNumbers[0] + captchaNumbers[1]) {
      setLoginError('پاسخ عبارت امنیتی صحیح نیست.'); setCaptcha(''); setCaptchaNumbers([Math.ceil(Math.random()*8),Math.ceil(Math.random()*8)])
      return
    }
    if (!accounts.some(a=>a.username===loginName.trim()&&a.password===password)) {
      setLoginError('نام کاربری یا رمز عبور صحیح نیست.')
      return
    }
    const savedProfiles = JSON.parse(localStorage.getItem('rahnegar-profiles') || '{}')
    const now=new Date(), username=loginName.trim(); const date=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeStyle:'short'}).format(now)
    setAccessHistory(h=>[{id:now.getTime(),username,action:'ورود',date},...h]);setLoginError(''); setUser({name:username,role:savedProfiles[username]?.role||'',email:savedProfiles[username]?.email||''}); localStorage.setItem('rahnegar-current-user',username); localStorage.setItem('rahnegar-login','gas-company-authenticated'); setLoggedIn(true)
  }

  const addAccount = () => {
    if (!isAdmin || !newAccount.username.trim() || newAccount.password.length < 4 || accounts.some(a=>a.username===newAccount.username.trim())) return
    const createdUsername=newAccount.username.trim()
    const next=[...accounts,{username:createdUsername,password:newAccount.password,admin:false}]; setAccounts(next); localStorage.setItem('rahnegar-users',JSON.stringify(next)); setNewAccount({username:'',password:''});recordHistory('افزودن',createdUsername,'حساب کاربری جدید توسط مدیر اصلی ایجاد شد')
  }

  const deleteAccount = (username: string) => {
    const target=accounts.find(a=>a.username===username)
    if (!isAdmin || !target || target.admin) return
    const next=accounts.filter(a=>a.username!==username)
    setAccounts(next);localStorage.setItem('rahnegar-users',JSON.stringify(next));recordHistory('حذف',username,'حساب کاربری توسط مدیر اصلی حذف شد')
    if(passwordChange.username===username)setPasswordChange({username:next[0]?.username||'',password:''})
  }

  const changeAccountPassword = () => {
    if (!isAdmin||passwordChange.password.length<4) return
    const next=accounts.map(a=>a.username===passwordChange.username?{...a,password:passwordChange.password}:a)
    setAccounts(next);localStorage.setItem('rahnegar-users',JSON.stringify(next));setPasswordChange(p=>({...p,password:''}));recordHistory('ویرایش',passwordChange.username,'رمز عبور حساب کاربری توسط مدیر تغییر کرد')
  }

  const renameAdmin = () => {
    const clean=adminName.trim();if(!isAdmin||!clean||accounts.some(a=>a.username===clean&&a.username!==user.name))return
    const old=user.name,next=accounts.map(a=>a.username===old?{...a,username:clean}:a);setAccounts(next);localStorage.setItem('rahnegar-users',JSON.stringify(next));localStorage.setItem('rahnegar-current-user',clean);setUser(u=>({...u,name:clean}));setPasswordChange(p=>({...p,username:p.username===old?clean:p.username}));setAdminName('');recordHistory('ویرایش','حساب مدیر',`نام کاربری اصلی از «${old}» به «${clean}» تغییر کرد`)
  }

  const logout = () => {
    const now=new Date(),date=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeStyle:'short'}).format(now);setAccessHistory(h=>[{id:now.getTime(),username:user.name,action:'خروج',date},...h]);localStorage.removeItem('rahnegar-login');setLoggedIn(false);setLoginStep('intro');setLoginName('');setPassword('');setCaptcha('');setCaptchaNumbers([Math.ceil(Math.random()*8),Math.ceil(Math.random()*8)]);setProfileOpen(false)
  }

  const toggleMulti = (field: 'technologyParts'|'documentTypes', value: string) => {
    if (!selected) return
    const list = selected[field] || []
    setSelected({...selected,[field]:list.includes(value)?list.filter(x=>x!==value):[...list,value]})
  }

  const saveSnapshot = () => {
    const snap: Snapshot = { id: Date.now(), title: snapshotTitle || 'نسخه بدون عنوان', createdAt: today, year: currentYear, dashboard, items: JSON.parse(JSON.stringify(items)) }
    setSnapshots(s => [snap, ...s]); setPreviewSnapshot(snap); setView('archive'); recordHistory('ذخیره نسخه', snap.title, `نسخه تثبیت‌شده با ${fa(items.length)} آیتم ذخیره شد`)
  }

  const printSnapshot = (snap: Snapshot) => {
    setPreviewSnapshot(snap); setTimeout(() => window.print(), 120)
  }

  if (!loggedIn) return <div className="auth-shell" dir="rtl">
    <div className="auth-decoration one"/><div className="auth-decoration two"/>
    {loginStep==='intro'?<section className="intro-card"><img className="official-gas-logo" src="/official-gas-logo.jpg" alt="آرم رسمی شرکت ملی گاز ایران"/><span>به داشبورد مدیریت نقشه راه تحول فناوری</span><h1>خوش آمدید<br/><em>شرکت گاز استان مرکزی</em></h1><p>از شناسایی تا توسعه و بهره‌برداری؛ مسیر فناوری، نقاط عطف و دانش سازمانی را در یک نمای شفاف و یکپارچه مدیریت کنید.</p><div className="intro-features"><b><CalendarDays/> تقویم رسمی شمسی</b><b><SlidersHorizontal/> برنامه‌ریزی تعاملی</b><b><Archive/> آرشیو نسخه‌های پایدار</b></div><button onClick={()=>{setCaptchaNumbers([Math.ceil(Math.random()*8),Math.ceil(Math.random()*8)]);setCaptcha('');setLoginStep('form')}}>ورود به داشبورد <ArrowLeft/></button><small>ورود فقط برای کاربران مجاز امکان‌پذیر است</small></section>:
    <section className="auth-card"><button className="back-intro" onClick={()=>setLoginStep('intro')}>بازگشت</button><img className="official-gas-logo" src="/official-gas-logo.jpg" alt="آرم رسمی شرکت ملی گاز ایران"/><h2>ورود به داشبورد</h2><p>اطلاعات حساب کاربری خود را وارد کنید.</p><form onSubmit={login}><label>نام کاربری<div><UserRound/><input value={loginName} onChange={e=>{setLoginName(e.target.value);setLoginError('')}} placeholder="نام کاربری" autoComplete="username"/></div></label><label>رمز عبور<div><LockKeyhole/><input type={showPassword?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);setLoginError('')}} placeholder="رمز عبور" autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(!showPassword)}><Eye/></button></div></label><label>عبارت امنیتی<div className="captcha-field"><strong>{fa(captchaNumbers[0])} + {fa(captchaNumbers[1])} = ؟</strong><input value={captcha} onChange={e=>{setCaptcha(e.target.value);setLoginError('')}} inputMode="numeric" placeholder="پاسخ"/></div></label>{loginError&&<div className="login-error">{loginError}</div>}<button className="login-submit" type="submit">ورود به داشبورد <ArrowLeft/></button></form><small>ورود کاربران مجاز شرکت گاز استان مرکزی</small></section>}
  </div>

  return <div className="app-shell" dir="rtl">
    <aside className={`sidebar ${sidebarOpen?'open':'collapsed'}`}>
      <div className="brand app-brand"><div className="brand-mark"><Layers3 size={20}/></div><div><b>تحول فناوری گاز</b><span>استان مرکزی</span></div></div>
      <nav>
        <p className="nav-label">فضای کاری</p>
        <button data-tooltip="فناوری‌های ابزاری" className={view==='roadmap'&&dashboard === 'tool' ? 'active' : ''} onClick={() => {setDashboard('tool');setView('roadmap')}}><SlidersHorizontal size={19}/><span>فناوری‌های ابزاری</span></button>
        <button data-tooltip="فناوری‌های قابل توسعه" className={view==='roadmap'&&dashboard === 'scalable' ? 'active' : ''} onClick={() => {setDashboard('scalable');setView('roadmap')}}><Sparkles size={19}/><span>فناوری‌های قابل توسعه</span></button>
        <p className="nav-label gap">مدیریت</p>
        <button data-tooltip="تقویم شمسی رویدادها" className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays size={19}/><span>تقویم شمسی رویدادها</span></button>
        <button data-tooltip="نسخه‌های ذخیره‌شده" className={view==='archive'?'active':''} onClick={()=>setView('archive')}><Archive size={19}/><span>نسخه‌های ذخیره‌شده</span></button>
        <button data-tooltip="توانمندی واحدها" className={view==='capabilities'?'active':''} onClick={()=>setView('capabilities')}><Layers3 size={19}/><span>توانمندی واحدها</span></button>
        <button data-tooltip="تاریخچه تغییرات" className={view==='history'?'active':''} onClick={()=>setView('history')}><History size={19}/><span>تاریخچه تغییرات</span></button>
        <button data-tooltip="تنظیمات" className={view==='settings'?'active':''} onClick={()=>setView('settings')}><Settings size={19}/><span>تنظیمات</span></button>
      </nav>
      <button className={`sidebar-foot ${view==='profile'?'active':''}`} onClick={()=>setView('profile')}><div className="avatar">{user.name.slice(0,2)}</div><div><b>{user.name}</b><span>{user.role||'حساب کاربری'}</span></div><MoreHorizontal size={18}/></button>
    </aside>
    {sidebarOpen&&<button className="mobile-nav-backdrop" onClick={()=>setSidebarOpen(false)} aria-label="بستن منو"/>}

    <main className={sidebarOpen?'sidebar-expanded':'sidebar-collapsed'}>
      <header className="topbar">
        <button className="sidebar-toggle" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="باز و بسته کردن منو"><Menu/></button>
        <div className="breadcrumb">نقشه راه تحول فناوری گاز استان مرکزی <span>/</span> <b>{view==='calendar'?'تقویم شمسی':view==='archive'?'آرشیو نسخه‌ها':view==='capabilities'?'توانمندی واحدها':view==='history'?'تاریخچه تغییرات':view==='settings'?'تنظیمات':view==='profile'?'حساب کاربری':dashboard === 'tool' ? 'فناوری‌های ابزاری' : 'فناوری‌های قابل توسعه'}</b></div>
        <div className="top-actions year-only"><label className="year year-selector"><CalendarDays size={17}/><span>سال</span><select value={selectedYear} onChange={e=>{setSelectedYear(+e.target.value);setCalendarMonth(0)}}>{Array.from({length:currentYearNumber-1360+2},(_,i)=>currentYearNumber+1-i).map(y=><option key={y} value={y}>{fa(y)}</option>)}</select><ChevronDown size={15}/></label></div>
      </header>

      <section className="content">
        {view === 'calendar' && <div className="calendar-page">
          <div className="page-title"><div><h1>تقویم شمسی رویدادهای فناوری</h1><p>نمای یکپارچه برنامه‌ها و رویدادهای نقشه راه در سال {fa(selectedYear)}</p></div><div className="calendar-controls"><div className="date-jump"><select value={selectedYear} onChange={e=>setSelectedYear(+e.target.value)}>{Array.from({length:currentYearNumber-1360+2},(_,i)=>currentYearNumber+1-i).map(y=><option key={y}>{y}</option>)}</select><select value={calendarMonth} onChange={e=>setCalendarMonth(+e.target.value)}>{months.map((m,i)=><option value={i} key={m}>{m}</option>)}</select><input value={calendarDay} onChange={e=>setCalendarDay(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="روز" inputMode="numeric"/></div><div className="calendar-nav"><button onClick={()=>{if(calendarMonth===0){setCalendarMonth(11);setSelectedYear(y=>Math.max(1360,y-1))}else setCalendarMonth(m=>m-1)}}>ماه قبل</button><b>{months[calendarMonth]} {fa(selectedYear)}</b><button onClick={()=>{if(calendarMonth===11){setCalendarMonth(0);setSelectedYear(y=>y+1)}else setCalendarMonth(m=>m+1)}}>ماه بعد</button></div></div></div>
          <div className="calendar-layout"><div className="persian-calendar"><div className="weekdays">{['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'].map(d=><span key={d}>{d}</span>)}</div><div className="days">{Array.from({length:31},(_,i)=>i+1).map(day=>{const dayEvents=calendarItems.filter(it=>monthDay(it.start).month===calendarMonth&&monthDay(it.start).day===day);return <div className={`day ${dayEvents.length?'has-event':''} ${calendarDay&&Number(calendarDay)===day?'searched-day':''}`} key={day}><b>{fa(day)}</b>{dayEvents.slice(0,3).map(it=><button key={it.id} style={{borderRightColor:it.color}} onClick={()=>setSelected(it)}>{it.title}<small>{it.status}</small></button>)}</div>})}</div></div><aside className="calendar-agenda"><h3>رویدادهای {months[calendarMonth]}</h3><p>{fa(calendarItems.filter(i=>monthDay(i.start).month===calendarMonth).length)} مورد ثبت شده</p>{calendarItems.filter(i=>monthDay(i.start).month===calendarMonth&&(!calendarDay||monthDay(i.start).day===Number(calendarDay))).sort((a,b)=>a.start-b.start).map(it=><button key={it.id} onClick={()=>setSelected(it)}><i style={{background:it.color}}/><span><b>{it.title}</b><small>{fa(monthDay(it.start).day)} {months[calendarMonth]} · {it.owner||'بدون مسئول'}</small></span></button>)}</aside></div>
        </div>}
        {view === 'archive' && <div className="archive-page">
          <div className="page-title"><div><h1>نسخه‌های تثبیت‌شده نقشه راه</h1><p>هر نسخه مستقل و غیرقابل‌تغییر است و تغییرات آینده روی آن اعمال نمی‌شود.</p></div><div className="snapshot-create"><input value={snapshotTitle} onChange={e=>setSnapshotTitle(e.target.value)} placeholder="عنوان نسخه"/><button className="primary" onClick={saveSnapshot}><Save/> ذخیره نسخه فعلی</button></div></div>
          <div className="archive-grid">{snapshots.length===0?<div className="empty-archive"><Archive/><h3>هنوز نسخه‌ای ذخیره نشده است</h3><p>با دکمه بالا، وضعیت فعلی نقشه راه را تثبیت کنید.</p></div>:snapshots.map(s=><article key={s.id} className={previewSnapshot?.id===s.id?'selected':''}><div className="archive-icon"><FileText/></div><section><span>نسخه تثبیت‌شده</span><h3>{s.title}</h3><p>ذخیره در {s.createdAt} · سال ورود {s.year}</p><div><b>{fa(s.items.length)} فناوری</b><b>{fa(s.items.filter(i=>i.status==='در حال انجام').length)} در حال انجام</b><b>{s.dashboard==='tool'?'ابزاری':'قابل توسعه'}</b></div></section><footer><button onClick={()=>setPreviewSnapshot(s)}>مشاهده</button><button onClick={()=>printSnapshot(s)}><Download/> ذخیره PDF</button></footer></article>)}</div>
          {previewSnapshot&&<div className="snapshot-report print-area"><header><div><h2>نقشه راه تحول فناوری گاز استان مرکزی</h2><p>{previewSnapshot.title}</p></div><div><b>سال ورود: {previewSnapshot.year}</b><span>تاریخ تثبیت: {previewSnapshot.createdAt}</span></div></header><div className="print-timeline"><div className="print-months">{months.map(m=><b key={m}>{m}</b>)}</div>{lanes.map(l=><div className="print-lane" key={l.id}><strong>{l.title}</strong><div>{previewSnapshot.items.filter(i=>i.lane===l.id).map(i=><span key={i.id} style={{right:`${i.start/12*100}%`,width:i.kind==='bar'?`${Math.max(.5,(i.openEnded?12:i.end)-i.start)/12*100}%`:'10px',background:i.color}} title={i.title}><em>{i.title}</em></span>)}</div></div>)}</div><h3 className="report-section-title">جدول اطلاعات فناوری‌ها</h3><table><thead><tr><th>فناوری</th><th>واحد / زیرواحد</th><th>نوع و ماهیت</th><th>TRL</th><th>وضعیت</th><th>مسئول</th><th>شروع شمسی</th><th>پایان شمسی</th></tr></thead><tbody>{previewSnapshot.items.map(i=><tr key={i.id}><td><i style={{background:i.color}}/>{i.title}</td><td>{i.unit||'—'} / {i.subUnit||'—'}</td><td>{i.technologyType||'—'} / {i.nature||'—'}</td><td>{i.trl||'—'}</td><td>{i.status}</td><td>{i.owner||'—'}</td><td>{fa(monthDay(i.start).day)} {months[monthDay(i.start).month]}</td><td>{i.openEnded?'باز':<>{fa(monthDay(i.end).day)} {months[monthDay(i.end).month]}</>}</td></tr>)}</tbody></table></div>}
        </div>}
        {view === 'capabilities' && <div className="capability-page"><div className="page-title"><div><h1>نقشه توانمندی واحدها</h1><p>نمای واحد، زیرواحد، فناوری‌ها و سطح توانمندی</p></div><div className="rating-legend">{ratingOptions.map((r,i)=><span key={r}><i className={`level-${i}`}/>{r}</span>)}</div></div>{items.length===0?<div className="empty-archive"><Layers3/><h3>هنوز فناوری ثبت نشده است</h3><p>پس از ثبت نام واحد و فناوری، ماتریس توانمندی اینجا ساخته می‌شود.</p></div>:<><div className="unit-board">{Array.from(new Set(items.map(i=>i.unit||'واحد تعیین نشده'))).map(unit=><section key={unit} className="unit-group"><header><span><b>{unit}</b><small>{fa(items.filter(i=>(i.unit||'واحد تعیین نشده')===unit).length)} فناوری</small></span><em>واحد سازمانی</em></header>{Array.from(new Set(items.filter(i=>(i.unit||'واحد تعیین نشده')===unit).map(i=>i.subUnit||'زیرواحد تعیین نشده'))).map(sub=><div className="subunit" key={sub}><h3>{sub}</h3><div className="capability-table"><div className="cap-head abilities"><b>فناوری</b>{capabilityNames.map(n=><span key={n}>{n}</span>)}</div>{items.filter(i=>(i.unit||'واحد تعیین نشده')===unit&&(i.subUnit||'زیرواحد تعیین نشده')===sub).map(tech=><button className="cap-row abilities" key={tech.id} onClick={()=>setSelected(tech)}><b><i style={{background:tech.color}}/>{tech.title}<small>TRL {tech.trl||'—'}</small></b>{capabilityNames.map(n=><span key={n} className={`score level-${ratingOptions.indexOf(tech.capabilities?.[n]||'وجود ندارد')}`}>{tech.capabilities?.[n]||'وجود ندارد'}</span>)}</button>)}</div></div>)}</section>)}</div><section className="priority-board"><header><div><span>تحلیل مستقل اولویت و ریسک</span><h2>نوار مولفه‌های راهبردی فناوری‌ها</h2></div><div className="rating-legend">{ratingOptions.map((r,i)=><span key={r}><i className={`level-${i}`}/>{r}</span>)}</div></header>{factorNames.map(f=><div className="factor-block" key={f}><h3>{f}</h3>{[...items].sort((a,b)=>ratingOptions.indexOf(a.strategicFactors?.[f]||'وجود ندارد')-ratingOptions.indexOf(b.strategicFactors?.[f]||'وجود ندارد')).map(t=>{const level=ratingOptions.indexOf(t.strategicFactors?.[f]||'وجود ندارد');return <button key={t.id} onClick={()=>setSelected(t)}><b>{t.title}<small>{t.unit||'بدون واحد'}</small></b><div><i className={`level-${level}`} style={{width:`${[100,70,40,8][level]}%`}}/></div><span>{t.strategicFactors?.[f]||'وجود ندارد'}</span></button>})}</div>)}</section></>}</div>}
        {view === 'history' && <div className="history-page"><div className="page-title"><div><h1>تاریخچه تغییرات</h1><p>ردیابی کامل افزودن، ویرایش، حذف و جابه‌جایی توسط کاربران</p></div><div className="history-search"><Search/><input value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)} placeholder="جستجو در تاریخچه..."/></div></div><div className="history-stats"><div><History/><span><b>{fa(history.length)}</b><small>کل فعالیت‌ها</small></span></div><div><UserRound/><span><b>{fa(new Set(history.map(h=>h.user)).size)}</b><small>کاربر فعال</small></span></div><div><Clock3/><span><b>{history[0]?.date||'—'}</b><small>آخرین تغییر</small></span></div></div><section className="activity-card"><header><b>گزارش فعالیت کاربران</b><span>این سوابق به‌صورت دائمی ذخیره می‌شوند</span></header>{history.filter(h=>`${h.user} ${h.target} ${h.detail} ${h.action}`.includes(historyQuery)).length===0?<div className="empty-history"><History/><h3>فعالیتی ثبت نشده است</h3><p>تغییرات بعدی کاربران در این قسمت نمایش داده می‌شود.</p></div>:<div className="activity-list">{history.filter(h=>`${h.user} ${h.target} ${h.detail} ${h.action}`.includes(historyQuery)).map(h=><article key={h.id}><div className={`activity-icon action-${h.action}`}><History/></div><div><span><b>{h.user}</b> <em>{h.action}</em> روی <strong>{h.target}</strong></span><p>{h.detail}</p></div><time><Clock3/>{h.date}</time></article>)}</div>}</section></div>}
        {view === 'profile' && <div className="account-page"><div className="page-title"><div><h1>حساب کاربری</h1><p>مدیریت مشخصات، امنیت و کاربران داشبورد</p></div></div><div className="account-hero"><div className="profile-avatar">{user.name.slice(0,2)}</div><div><span>کاربر واردشده</span><h2>{user.name}</h2><p>{isAdmin?'مدیر اصلی داشبورد':'کاربر داشبورد'}</p></div><button className="logout" onClick={logout}><LogOut/> خروج از حساب</button></div><div className="account-grid"><section className="account-panel"><header><UserRound/><div><h3>مشخصات فردی</h3><p>اطلاعات نمایشی حساب شما</p></div></header><label>نام کاربری<input value={user.name} disabled/></label><label>سمت سازمانی<input value={user.role} placeholder="وارد نشده" onChange={e=>setUser({...user,role:e.target.value})}/></label><label>ایمیل<div className="profile-email"><Mail/><input value={user.email} placeholder="وارد نشده" onChange={e=>setUser({...user,email:e.target.value})}/></div></label><button className="primary profile-save" onClick={()=>{const profiles=JSON.parse(localStorage.getItem('rahnegar-profiles')||'{}');localStorage.setItem('rahnegar-profiles',JSON.stringify({...profiles,[user.name]:{role:user.role,email:user.email}}))}}><Check/> ذخیره مشخصات</button></section>{isAdmin&&<><section className="account-panel"><header><UserPlus/><div><h3>مدیریت کاربران</h3><p>ایجاد و حذف حساب فقط برای مدیر اصلی</p></div></header><div className="add-user account-form"><input value={newAccount.username} onChange={e=>setNewAccount({...newAccount,username:e.target.value})} placeholder="نام کاربری جدید"/><input type="password" value={newAccount.password} onChange={e=>setNewAccount({...newAccount,password:e.target.value})} placeholder="رمز عبور جدید"/><button onClick={addAccount}><Plus/> ایجاد حساب</button></div><div className="registered-accounts"><header><h3>حساب‌های ثبت‌شده</h3><button onClick={()=>setShowCredentials(!showCredentials)}><Eye/> {showCredentials?'پنهان کردن':'نمایش رمزها'}</button></header>{accounts.map(a=><div key={a.username}><span><b>{a.username}</b><small>{a.admin?'مدیر اصلی':'کاربر'}</small></span><code>{showCredentials?a.password:'••••••••'}</code>{!a.admin&&<button className="account-delete" onClick={()=>deleteAccount(a.username)} title="حذف حساب"><Trash2/></button>}</div>)}</div></section><section className="account-panel"><header><LockKeyhole/><div><h3>امنیت حساب‌ها</h3><p>تغییر نام مدیر و رمز عبور</p></div></header><label>نام کاربری مدیر اصلی<input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder={user.name}/></label><button className="secondary-action" onClick={renameAdmin}><Save/> ذخیره نام مدیر</button><label>انتخاب حساب<select value={passwordChange.username} onChange={e=>setPasswordChange({...passwordChange,username:e.target.value})}>{accounts.map(a=><option key={a.username}>{a.username}</option>)}</select></label><label>رمز عبور جدید<input type="password" value={passwordChange.password} onChange={e=>setPasswordChange({...passwordChange,password:e.target.value})}/></label><button className="secondary-action" onClick={changeAccountPassword}><Save/> تغییر رمز عبور</button></section><section className="account-panel access-panel"><header><History/><div><h3>تاریخچه ورود و خروج</h3><p>آخرین فعالیت‌های احراز هویت</p></div></header><div className="access-log">{accessHistory.length===0?<p>هنوز سابقه‌ای ثبت نشده است.</p>:accessHistory.slice(0,20).map(a=><div key={a.id}><i className={a.action==='ورود'?'login':'logout'}/><span><b>{a.username}</b><small>{a.action}</small></span><time>{a.date}</time></div>)}</div></section></>}</div></div>}
        {view === 'settings' && <div className="settings-page"><div className="page-title"><div><h1>تنظیمات داشبورد</h1><p>شخصی‌سازی ظاهر، نمایش و مدیریت داده‌ها</p></div></div><div className="settings-grid"><section><header><span><Eye/></span><div><h3>ظاهر داشبورد</h3><p>رنگ و نحوه نمایش رابط کاربری</p></div></header><div className="theme-options"><button className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}><i className="light-preview"/><b>تم روشن</b><small>پس‌زمینه روشن و خوانا</small></button><button className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}><i className="dark-preview"/><b>تم تاریک</b><small>مناسب محیط کم‌نور</small></button></div><label className="setting-row"><span><b>نمایش فشرده</b><small>فاصله کمتر بین آیتم‌ها و جدول‌ها</small></span><input type="checkbox" checked={compactMode} onChange={e=>setCompactMode(e.target.checked)}/></label><label className="setting-row"><span><b>جلوه‌های حرکتی</b><small>انیمیشن بازشدن پنل‌ها و منو</small></span><input type="checkbox" checked={animations} onChange={e=>setAnimations(e.target.checked)}/></label></section><section><header><span><Settings/></span><div><h3>تنظیمات عمومی</h3><p>رفتار پیش‌فرض داشبورد</p></div></header><label className="settings-field">سال پیش‌فرض<select value={selectedYear} onChange={e=>setSelectedYear(+e.target.value)}>{Array.from({length:currentYearNumber-1360+2},(_,i)=>currentYearNumber+1-i).map(y=><option key={y}>{y}</option>)}</select></label><label className="settings-field">نمای پیش‌فرض<select value={zoom} onChange={e=>setZoom(e.target.value)}><option>ماهانه</option><option>فصلی</option><option>سالانه</option></select></label><label className="setting-row"><span><b>پیام تغییرات</b><small>نمایش پیام پس از ذخیره و ویرایش</small></span><input type="checkbox" checked={notifications} onChange={e=>{setNotifications(e.target.checked);localStorage.setItem('rahnegar-notifications',e.target.checked?'yes':'no')}}/></label></section><section><header><span><Archive/></span><div><h3>داده و نگهداری</h3><p>وضعیت اطلاعات ذخیره‌شده</p></div></header><div className="storage-info"><div><b>{fa(items.length)}</b><small>آیتم فناوری</small></div><div><b>{fa(snapshots.length)}</b><small>نسخه تثبیت‌شده</small></div><div><b>{fa(history.length)}</b><small>رکورد تاریخچه</small></div></div><p className="storage-note">تمام اطلاعات در مرورگر ذخیره می‌شوند و پس از خروج از حساب باقی می‌مانند.</p></section></div></div>}
        {view === 'roadmap' && <>
        <div className="page-title"><div><h1>نقشه راه تحول فناوری گاز استان مرکزی</h1><p>{dashboard === 'tool' ? 'فناوری‌های ابزاری و عملیاتی' : 'فناوری‌های قابل توسعه و مقیاس‌پذیر'}</p></div><div className="title-actions"><button className="save-map" onClick={saveSnapshot}><Save/> تثبیت نسخه</button><button className="primary" onClick={()=>addSpecialItem('bar')}><Plus size={18}/> فناوری</button><button className="add-kind milestone-add" onClick={()=>addSpecialItem('diamond')}><Diamond/> نقطه عطف</button><button className="add-kind event-add" onClick={()=>addSpecialItem('flag')}><Flag/> رویداد کلیدی</button><button className="add-kind launch-add" onClick={()=>addSpecialItem('star')}><Star/> عرضه</button></div></div>

        <div className="metrics">
          <div><span className="metric-icon blue"><Layers3/></span><section><p>کل فناوری‌ها</p><strong>{fa(visible.length)}</strong></section><em>سال {fa(selectedYear)}</em></div>
          <div className="metric-clickable" onClick={()=>{setStatusFilter('در حال انجام');setKindFilter('همه انواع')}}><span className="metric-icon green"><Check/></span><section><p>در حال انجام</p><strong>{fa(visible.filter(i=>i.status==='در حال انجام').length)}</strong></section><small>برای فیلتر کلیک کنید</small></div>
          <div className="metric-clickable" onClick={()=>setKindFilter('رویدادهای کلیدی')}><span className="metric-icon amber"><Flag/></span><section><p>رویداد کلیدی</p><strong>{fa(visible.filter(i=>i.kind!=='bar').length)}</strong></section><small>برای فیلتر کلیک کنید</small></div>
          <div className="metric-clickable" onClick={()=>setFiltersOpen(true)}><span className="metric-icon gray"><UserRound/></span><section><p>تیم‌های درگیر</p><strong>{fa(new Set(visible.map(i=>i.owner).filter(Boolean)).size)}</strong></section><small>{ownerFilter}</small></div>
        </div>

        <div className="toolbar-card">
          <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی فناوری..."/></div>
          <select value={laneFilter} onChange={e=>setLaneFilter(e.target.value)}><option>همه دسته‌ها</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>همه وضعیت‌ها</option><option>در حال انجام</option><option>برنامه‌ریزی شده</option><option>نیازمند بررسی</option><option>پیش‌نویس</option></select>
          <button className={`filter ${filtersOpen?'active':''}`} onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17}/> فیلترها {(unitFilter!=='همه واحدها'||urgentOnly)&&<i/>}</button>
          {filtersOpen&&<div className="filter-popover"><header><b>فیلتر پیشرفته</b><button onClick={()=>setFiltersOpen(false)}><X/></button></header><label>واحد سازمانی<select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}><option>همه واحدها</option>{organizationUnits.map(u=><option key={u}>{u}</option>)}</select></label><label>نوع آیتم<select value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option>همه انواع</option><option value="bar">فناوری‌ها</option><option>رویدادهای کلیدی</option><option value="diamond">نقاط عطف</option><option value="flag">پرچم‌ها</option><option value="star">عرضه‌ها</option></select></label><label>تیم یا مسئول درگیر<select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}><option>همه تیم‌ها</option>{Array.from(new Set(items.map(i=>i.owner).filter(Boolean))).map(o=><option key={o}>{o}</option>)}</select></label><label className="urgent-toggle"><input type="checkbox" checked={urgentOnly} onChange={e=>setUrgentOnly(e.target.checked)}/><span><b>فقط فناوری‌های فوری</b><small>نمایش موارد دارای اولویت اقدام</small></span></label><button className="clear-filter" onClick={()=>{setUnitFilter('همه واحدها');setKindFilter('همه انواع');setOwnerFilter('همه تیم‌ها');setUrgentOnly(false);setLaneFilter('همه دسته‌ها');setStatusFilter('همه وضعیت‌ها')}}>پاک کردن همه فیلترها</button></div>}
          <div className="spacer"/>
          <div className="zoom"><ZoomIn size={16}/>{['سالانه','فصلی','ماهانه'].map(z=><button key={z} className={zoom===z?'on':''} onClick={()=>setZoom(z)}>{z}</button>)}</div>
        </div>

        <div className="roadmap-card">
          <div className="roadmap-head"><div><h3>خط زمانی پروژه‌ها</h3><span>برای تغییر زمان، آیتم‌ها را بکشید</span></div><div className="legend"><span><i className="lg-bar"/>بازه اجرا</span><span><Diamond/>نقطه عطف</span><span><Flag/>رویداد کلیدی</span><span><Star/>عرضه</span></div></div>
          <div className="timeline-scroll">
            <div className={`timeline zoom-${zoom === 'ماهانه' ? 'month' : zoom === 'فصلی' ? 'quarter' : 'year'}`}>
              <div className={`month-row header-${zoom === 'ماهانه' ? 'month' : zoom === 'فصلی' ? 'quarter' : 'year'}`}><div className="lane-cap">{zoom === 'ماهانه' ? 'مرحله / ماه' : zoom === 'فصلی' ? 'مرحله / فصل' : 'مرحله / سال'}</div>{zoom === 'ماهانه' ? <div className="months">{months.map((m,n)=><div key={m}><b>{m}</b><small>{fa(n+1)}</small></div>)}</div> : zoom === 'فصلی' ? <div className="periods quarters">{[{name:'بهار',detail:'فروردین · اردیبهشت · خرداد'},{name:'تابستان',detail:'تیر · مرداد · شهریور'},{name:'پاییز',detail:'مهر · آبان · آذر'},{name:'زمستان',detail:'دی · بهمن · اسفند'}].map(q=><div key={q.name}><b>{q.name}</b><small>{q.detail}</small></div>)}</div> : <div className="periods years">{[-1,0,1,2].map(offset=><div key={offset} className={offset===0?'current':''}><b>{fa(selectedYear+offset)}</b><small>{offset===0?'سال انتخاب‌شده':offset<0?'سال قبل':'سال بعد'}</small></div>)}</div>}</div>
              <div className="events-row"><div className="lane-cap">رویدادهای کلیدی</div><div className="event-track">{visible.filter(i=>i.kind==='flag'||i.kind==='star').map((event,index)=><button key={event.id} className={`event-tag ${index%3===0?'green':index%3===1?'red':'blue'}`} style={{left:`${event.start/12*100}%`}} onClick={()=>setSelected(event)}><Flag/>{event.title}<b>{fa(monthDay(event.start).day)} {months[monthDay(event.start).month]}</b></button>)}</div></div>
              {lanes.filter(lane=>laneFilter==='همه دسته‌ها'||lane.id===laneFilter).map(lane => <div className="swim-row" key={lane.id} style={{background:lane.tint}}>
                <div className="lane-name"><span>{lane.en}</span><b>{lane.title}</b><small>{visible.filter(i=>i.lane===lane.id).length} آیتم</small></div>
                <div ref={lane.id === 'plan' ? timelineRef : undefined} data-lane={lane.id} className="lane-track" onDoubleClick={(e)=>addItem(lane.id,e)} title="برای افزودن آیتم دوبار کلیک کنید">
                  <svg className="dependency-lines" preserveAspectRatio="none" viewBox="0 0 1200 98">{dependencyPairs(lane.id).map(({item,dependency})=>{const dep=dependency!;const x1=(dep.openEnded?11.7:dep.end)/12*1200;const x2=item.start/12*1200;const marker=`arrow-${item.id}-${dep.id}`;return <g key={marker}><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill={item.color}/></marker></defs><path style={{stroke:item.color}} d={`M${x1},50 C${(x1+x2)/2},18 ${(x1+x2)/2},18 ${x2},50`} markerEnd={`url(#${marker})`}/></g>})}</svg>
                  {visible.filter(i=>i.lane===lane.id).map(item => item.kind === 'bar' ?
                    <div key={item.id} className={`bar-item ${item.openEnded?'open-ended':''}`} style={{left:`${item.start/12*100}%`,width:`${Math.max(.5,(item.openEnded?12:item.end)-item.start)/12*100}%`,background:item.color}} onPointerDown={e=>beginDrag(e,item,'move')} onClick={()=>setSelected(item)}>
                      <i className="resize left" onPointerDown={e=>beginDrag(e,item,'left')}/>{item.lane==='identified'&&item.urgent&&<b className="urgent-mark">!</b>}<span>{item.title}{item.openEnded&&<small> · باز</small>}</span>{!item.openEnded&&<i className="resize right" onPointerDown={e=>beginDrag(e,item,'right')}/>} 
                    </div> :
                    <button key={item.id} className={`point-item ${item.kind}`} style={{left:`${item.start/12*100}%`,color:item.color}} onPointerDown={e=>beginDrag(e,item,'move')} onClick={()=>setSelected(item)}>
                      {item.kind==='diamond'?<Diamond fill="currentColor"/>:item.kind==='flag'?<Flag fill="currentColor"/>:<Star fill="currentColor"/>}<label>{item.title}</label>
                    </button>
                  )}
                </div>
              </div>)}
            </div>
          </div>
          <div className="roadmap-foot"><span><i/> امروز · {today}</span><p><b>راهنما:</b> برای جابه‌جایی افقی یا انتقال بین ردیف‌ها بکشید؛ لبه نوار را برای تغییر مدت بگیرید.</p></div>
        </div>
        </>}
      </section>
    </main>

    {selected && <><div className="drawer-backdrop" onClick={()=>setSelected(null)}/><aside className="drawer">
      <div className="drawer-head"><div><span>{selected.kind === 'bar' ? 'اطلاعات فناوری' : selected.kind==='diamond'?'اطلاعات نقطه عطف':selected.kind==='flag'?'اطلاعات رویداد کلیدی':'اطلاعات عرضه'}</span><h2>{selected.title}</h2></div><button onClick={()=>setSelected(null)}><X/></button></div>
      <div className="drawer-status"><span className={selected.status==='در حال انجام'?'doing':''}><i/>{selected.status}</span><button onClick={()=>setEditing(!editing)}>{editing?'لغو ویرایش':'ویرایش کامل اطلاعات'}</button></div>
      <div className="drawer-body">
        <label>نام فناوری<input disabled={!editing} value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})}/></label>
        <label>توضیحات<textarea disabled={!editing} value={selected.description} onChange={e=>setSelected({...selected,description:e.target.value})}/></label>
        <div className="date-editor"><b>تاریخ‌های شمسی</b><div className="field-grid"><label>شروع<div className="date-selects"><select disabled={!editing} value={monthDay(selected.start).month} onChange={e=>setSelected({...selected,start:toPosition(+e.target.value,monthDay(selected.start).day)})}>{months.map((m,i)=><option value={i} key={m}>{m}</option>)}</select><select disabled={!editing} value={monthDay(selected.start).day} onChange={e=>setSelected({...selected,start:toPosition(monthDay(selected.start).month,+e.target.value)})}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>{fa(i+1)}</option>)}</select></div></label><label>پایان <span className="open-check"><input type="checkbox" disabled={!editing} checked={!!selected.openEnded} onChange={e=>setSelected({...selected,openEnded:e.target.checked})}/> بدون پایان</span><div className="date-selects"><select disabled={!editing||selected.openEnded} value={monthDay(selected.end).month} onChange={e=>setSelected({...selected,end:toPosition(+e.target.value,monthDay(selected.end).day)})}>{months.map((m,i)=><option value={i} key={m}>{m}</option>)}</select><select disabled={!editing||selected.openEnded} value={monthDay(selected.end).day} onChange={e=>setSelected({...selected,end:toPosition(monthDay(selected.end).month,+e.target.value)})}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>{fa(i+1)}</option>)}</select></div></label></div></div>
        <div className="field-grid"><label>وضعیت<select disabled={!editing} value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}><option>در حال انجام</option><option>برنامه‌ریزی شده</option><option>نیازمند بررسی</option><option>پیش‌نویس</option></select></label><label>دسته‌بندی<select disabled={!editing} value={selected.lane} onChange={e=>setSelected({...selected,lane:e.target.value})}>{lanes.map(l=><option value={l.id} key={l.id}>{l.title}</option>)}</select></label></div>
        <label>مسئول<input disabled={!editing} value={selected.owner} onChange={e=>setSelected({...selected,owner:e.target.value})}/></label>
        <label>سال ورود به نقشه راه<input disabled={!editing} value={selected.entryYear||currentYear} onChange={e=>setSelected({...selected,entryYear:e.target.value})}/></label>
        {selected.kind==='bar'&&<label className="urgent-field"><input type="checkbox" disabled={!editing} checked={!!selected.urgent} onChange={e=>setSelected({...selected,urgent:e.target.checked})}/><span><b>فناوری فوری و نیازمند اقدام</b><small>در ردیف شناسایی‌شده‌ها با علامت تعجب قرمز نمایش داده می‌شود.</small></span></label>}
        {selected.kind==='bar'&&<><div className="meta-section"><h3>مشخصات سازمانی و فنی</h3><div className="field-grid"><label>نام واحد<select disabled={!editing} value={selected.unit||''} onChange={e=>setSelected({...selected,unit:e.target.value,subUnit:e.target.value==='بهره‌برداری'?selected.subUnit:''})}><option value="">انتخاب کنید</option>{organizationUnits.map(u=><option key={u}>{u}</option>)}</select></label><label>نام زیرواحد{selected.unit==='بهره‌برداری'?<select disabled={!editing} value={selected.subUnit||''} onChange={e=>setSelected({...selected,subUnit:e.target.value})}><option value="">انتخاب کنید</option>{operationSubUnits.map(s=><option key={s}>{s}</option>)}</select>:<input disabled={!editing} value={selected.subUnit||''} onChange={e=>setSelected({...selected,subUnit:e.target.value})}/>}</label><label>نوع فناوری<select disabled={!editing} value={selected.technologyType||''} onChange={e=>setSelected({...selected,technologyType:e.target.value})}><option value="">انتخاب کنید</option><option>محصول</option><option>فرایند</option><option>ترکیبی</option></select></label><label>ماهیت فناوری<select disabled={!editing} value={selected.nature||''} onChange={e=>setSelected({...selected,nature:e.target.value})}><option value="">انتخاب کنید</option><option>کلیدی</option><option>پشتیبان</option><option>هر دو</option></select></label><label>سطح TRL<select disabled={!editing} value={selected.trl||''} onChange={e=>setSelected({...selected,trl:e.target.value})}><option value="">انتخاب کنید</option>{Array.from({length:9},(_,i)=><option key={i}>{fa(i+1)}</option>)}</select></label><label>سطح اتوماسیون<select disabled={!editing} value={selected.automation||''} onChange={e=>setSelected({...selected,automation:e.target.value})}><option value="">انتخاب کنید</option><option>اتوماتیک</option><option>نیمه اتوماتیک</option><option>غیر اتوماتیک</option></select></label></div><label>متعلقات و زیرسیستم‌ها<textarea disabled={!editing} value={selected.components||''} onChange={e=>setSelected({...selected,components:e.target.value})}/></label><label>منبع ورودی فناوری<input disabled={!editing} value={selected.inputSource||''} onChange={e=>setSelected({...selected,inputSource:e.target.value})}/></label></div>
        <div className="meta-section"><h3>اجزا و مستندات فناوری</h3><label>اجزای فناوری <span className="field-help">امکان انتخاب چند مورد</span><div className="choice-grid">{['سخت‌افزار','نرم‌افزار','فکرافزار','سازمان‌افزار'].map(v=><button type="button" disabled={!editing} className={(selected.technologyParts||[]).includes(v)?'chosen':''} key={v} onClick={()=>toggleMulti('technologyParts',v)}><Check/>{v}</button>)}</div></label><label>نوع مستندات <span className="field-help">امکان انتخاب چند مورد</span><div className="choice-grid">{['الکترونیکی','کاغذی','ترکیبی','مستندات ندارد'].map(v=><button type="button" disabled={!editing} className={(selected.documentTypes||[]).includes(v)?'chosen':''} key={v} onClick={()=>toggleMulti('documentTypes',v)}><Check/>{v}</button>)}</div></label><label>محل بایگانی مستندات<input disabled={!editing} value={selected.archiveLocation||''} onChange={e=>setSelected({...selected,archiveLocation:e.target.value})}/></label></div>
        <div className="meta-section assessment-editor"><h3>توانمندی واحد مرتبط</h3><p>سطح توانمندی واحد «{selected.unit||'تعیین نشده'}» برای این فناوری را مشخص کنید.</p>{capabilityNames.map(n=><div className="assessment-row" key={n}><b>{n}</b><div>{ratingOptions.map((r,i)=><button type="button" disabled={!editing} key={r} className={selected.capabilities?.[n]===r?`picked level-${i}`:''} onClick={()=>setSelected({...selected,capabilities:{...selected.capabilities,[n]:r}})}>{r}</button>)}</div></div>)}</div>
        <div className="meta-section assessment-editor"><h3>مولفه‌های راهبردی فناوری</h3>{factorNames.map(n=><div className="assessment-row" key={n}><b>{n}</b><div>{ratingOptions.map((r,i)=><button type="button" disabled={!editing} key={r} className={selected.strategicFactors?.[n]===r?`picked level-${i}`:''} onClick={()=>setSelected({...selected,strategicFactors:{...selected.strategicFactors,[n]:r}})}>{r}</button>)}</div></div>)}</div>
        <div className="meta-section"><h3>ارزیابی و پشتیبانی</h3><div className="field-grid"><label>وضعیت ایمنی<select disabled={!editing} value={selected.safety||''} onChange={e=>setSelected({...selected,safety:e.target.value})}><option value="">انتخاب کنید</option><option>ایمن</option><option>نیازمند بهبود</option><option>فاقد ایمنی</option></select></label><label>وضعیت زیست‌محیطی<select disabled={!editing} value={selected.environment||''} onChange={e=>setSelected({...selected,environment:e.target.value})}><option value="">انتخاب کنید</option><option>آلاینده</option><option>نسبتاً آلاینده</option><option>فاقد آلاینده</option></select></label></div><label>وضعیت پشتیبانی<select disabled={!editing} value={selected.support||''} onChange={e=>setSelected({...selected,support:e.target.value})}><option value="">انتخاب کنید</option><option>پشتیبانی توسط شرکت ارائه‌دهنده</option><option>توسط سایر شرکت‌ها</option><option>هر دو</option><option>فاقد پشتیبانی</option></select></label><label>نام و سمت متخصصین و دارندگان دانش فنی<textarea disabled={!editing} value={selected.experts||''} onChange={e=>setSelected({...selected,experts:e.target.value})}/></label><div className="field-grid"><label>شرکت ارائه‌دهنده<input disabled={!editing} value={selected.provider||''} onChange={e=>setSelected({...selected,provider:e.target.value})}/></label><label>کشور ارائه‌دهنده<input disabled={!editing} value={selected.country||''} onChange={e=>setSelected({...selected,country:e.target.value})}/></label></div><label>واحدهای استفاده‌کننده<input disabled={!editing} value={selected.userUnits||''} onChange={e=>setSelected({...selected,userUnits:e.target.value})}/></label></div>
        <div className="meta-section dependency-editor"><h3>فناوری‌های وابسته</h3><p>با انتخاب فناوری، یک فلش ارتباطی روی تایم‌لاین رسم می‌شود.</p>{items.filter(i=>i.id!==selected.id).map(i=><label key={i.id}><input type="checkbox" disabled={!editing} checked={(selected.dependencies||[]).includes(i.title)} onChange={e=>setSelected({...selected,dependencies:e.target.checked?[...(selected.dependencies||[]),i.title]:(selected.dependencies||[]).filter(x=>x!==i.title)})}/><i style={{background:i.color}}/>{i.title}</label>)}</div>
        </>}
        <div className="field-grid"><label>نوع نمایش<select disabled={!editing} value={selected.kind} onChange={e=>setSelected({...selected,kind:e.target.value as Kind})}><option value="bar">نوار زمانی</option><option value="diamond">نقطه عطف</option><option value="flag">پرچم کلیدی</option><option value="star">عرضه</option></select></label><label>رنگ آیتم<input className="color-input" disabled={!editing} type="color" value={selected.color} onChange={e=>setSelected({...selected,color:e.target.value})}/></label></div>
        <div className="attachments"><div><b>فایل‌ها و پیوندها</b><button><Plus/> افزودن</button></div><a href="#document" onClick={e=>e.preventDefault()}><span><FileText/> سند نیازمندی‌های فنی.pdf</span><small>۲.۴ MB</small></a><a href="#resource" onClick={e=>e.preventDefault()}><span><ExternalLink/> مستندات پروژه در فضای تیم</span><small>پیوند</small></a></div>
      </div>
      <div className="drawer-foot"><button className="delete-btn" onClick={()=>{recordHistory('حذف',selected.title,`${selected.kind==='bar'?'فناوری':'رویداد'} از نقشه راه حذف شد`);setData(d=>({...d,[key]:d[key].filter(i=>i.id!==selected.id)}));setSelected(null)}}><Trash2/> حذف</button><span/><button className="ghost" onClick={()=>setSelected(null)}>بستن</button>{editing&&<button className="primary" onClick={()=>{const safe={...selected,end:Math.max(selected.start+(selected.kind==='bar'?.2:0),selected.end)};updateItem(safe);setEditing(false)}}><Check/> ذخیره و بروزرسانی</button>}</div>
    </aside></>}
    {profileOpen && <><div className="drawer-backdrop" onClick={()=>setProfileOpen(false)}/><aside className="profile-card"><button className="profile-close" onClick={()=>setProfileOpen(false)}><X/></button><div className="profile-avatar">{user.name.slice(0,2)}</div><h2>{user.name}</h2><p>نام کاربری فعال در داشبورد</p><label>سمت سازمانی<input value={user.role} placeholder="وارد نشده" onChange={e=>setUser({...user,role:e.target.value})}/></label><label>ایمیل<div className="profile-email"><Mail/><input value={user.email} placeholder="وارد نشده" onChange={e=>setUser({...user,email:e.target.value})}/></div></label>{isAdmin&&<><div className="admin-rename"><h3><UserRound/> تغییر نام کاربری مدیر اصلی</h3><input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder={user.name}/><button onClick={renameAdmin}><Save/> ذخیره نام کاربری جدید</button></div><div className="add-user"><h3><UserPlus/> افزودن کاربر جدید</h3><input value={newAccount.username} onChange={e=>setNewAccount({...newAccount,username:e.target.value})} placeholder="نام کاربری جدید"/><input type="password" value={newAccount.password} onChange={e=>setNewAccount({...newAccount,password:e.target.value})} placeholder="رمز عبور جدید"/><button onClick={addAccount}><Plus/> ایجاد حساب</button><small>{fa(accounts.length)} حساب کاربری ثبت شده</small></div><div className="profile-passwords"><h3><LockKeyhole/> مدیریت رمزهای عبور</h3><label>انتخاب حساب<select value={passwordChange.username} onChange={e=>setPasswordChange({...passwordChange,username:e.target.value})}>{accounts.map(a=><option key={a.username}>{a.username}</option>)}</select></label><label>رمز عبور جدید<input type="password" value={passwordChange.password} onChange={e=>setPasswordChange({...passwordChange,password:e.target.value})} placeholder="حداقل ۴ کاراکتر"/></label><button onClick={changeAccountPassword}><Save/> تغییر رمز عبور</button></div><div className="registered-accounts"><header><h3><UserPlus/> حساب‌های ثبت‌شده</h3><button onClick={()=>setShowCredentials(!showCredentials)}><Eye/> {showCredentials?'پنهان کردن':'نمایش رمزها'}</button></header>{accounts.map(a=><div key={a.username}><span><b>{a.username}</b><small>{a.admin?'مدیر اصلی':'کاربر'}</small></span><code>{showCredentials?a.password:'••••••••'}</code></div>)}</div><div className="access-log"><h3><History/> تاریخچه ورود و خروج</h3>{accessHistory.length===0?<p>هنوز سابقه‌ای ثبت نشده است.</p>:accessHistory.slice(0,20).map(a=><div key={a.id}><i className={a.action==='ورود'?'login':'logout'}/><span><b>{a.username}</b><small>{a.action}</small></span><time>{a.date}</time></div>)}</div></>}<button className="primary profile-save" onClick={()=>{const profiles=JSON.parse(localStorage.getItem('rahnegar-profiles')||'{}');localStorage.setItem('rahnegar-profiles',JSON.stringify({...profiles,[user.name]:{role:user.role,email:user.email}}));setProfileOpen(false)}}><Check/> ذخیره پروفایل</button><button className="logout" onClick={logout}><LogOut/> خروج از حساب</button></aside></>}
  </div>
}

export default App
