'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive, BarChart3, Baby, ChevronDown, ChevronRight, ClipboardList,
  Clock3, FileBadge, Home, Landmark, LogOut, MapPin, Menu, Settings,
  UserRound, UsersRound, X,
} from 'lucide-react';
import { apiGet, apiPost, setSelectedCommuneId } from '@/lib/api';
import { AccessProvider } from '@/components/AccessContext';

type Commune = { id: string; code: string; name: string; roles?: string[]; permissions?: string[] };
type CurrentUser = {
  id: string;
  username: string;
  roles: string[];
  permissions?: string[];
  communes: Commune[];
  current_commune_id: string;
};

type NavigationLink = { label: string; href: string; icon: typeof Home; permission: string };

const primaryLinks: NavigationLink[] = [
  { label: 'Vue d’ensemble', href: '/', icon: Home, permission: 'dashboard:read' },
  { label: 'Citoyens', href: '/citoyens', icon: UsersRound, permission: 'citizens:read' },
];
const dossierLinks: NavigationLink[] = [
  { label: 'Demandes', href: '/demandes', icon: ClipboardList, permission: 'requests:read' },
  { label: 'Dossiers CIN', href: '/cin', icon: FileBadge, permission: 'cin:read' },
  { label: 'Consultation des archives', href: '/archives', icon: Archive, permission: 'requests:read' },
];
const managementLinks: NavigationLink[] = [
  { label: 'Rapports et statistiques', href: '/rapports', icon: BarChart3, permission: 'reports:read' },
  { label: 'Administration', href: '/administration', icon: Settings, permission: 'users:manage' },
];
const pageLabels: Record<string, string> = {
  '/': 'Tableau de bord',
  '/citoyens': 'Répertoire des citoyens',
  '/naissances': 'État civil · Naissances',
  '/cin': 'Dossiers CIN',
  '/demandes': 'Demandes administratives',
  '/archives': 'Consultation des archives',
  '/rapports': 'Rapports et statistiques',
  '/administration': 'Administration',
  '/mariages': 'État civil · Mariages',
  '/deces': 'État civil · Décès',
};
const rolesDisplay: Record<string, string> = {
  COMMUNE_ADMIN: 'Administrateur communal',
  AGENT_SAISIE: 'Agent de saisie',
  VALIDATEUR: 'Validateur',
  LECTURE_SEULE: 'Consultation',
};
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [civilOpen, setCivilOpen] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [communeId, setCommuneId] = useState('');
  const [authError, setAuthError] = useState('');
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const isCivil = ['/naissances', '/mariages', '/deces'].some(path => pathname.startsWith(path));

  useEffect(() => {
    if (pathname === '/connexion') {
      setCheckingAuth(false);
      return;
    }
    if (authenticated) return;

    let active = true;
    setCheckingAuth(true);
    apiGet<CurrentUser>('/auth/me')
      .then(user => {
        if (!active) return;
        const savedId = window.localStorage.getItem('sgaec_commune_id');
        const selected = user.communes.find(commune => commune.id === savedId)
          ?? user.communes.find(commune => commune.id === user.current_commune_id)
          ?? user.communes[0];
        if (!selected) throw new Error('Aucune commune autorisée.');
        setUsername(user.username);
        setCommunes(user.communes);
        setCommuneId(selected.id);
        setSelectedCommuneId(selected.id);
        setRoles(selected.roles ?? []);
        setPermissions(selected.permissions ?? []);
        setCheckingAuth(false);
        setAuthenticated(true);
      })
      .catch(() => {
        if (!active) return;
        setCheckingAuth(false);
        router.replace('/connexion');
      });
    return () => { active = false; };
  }, [pathname, router, authenticated]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => { if (isCivil) setCivilOpen(true); }, [isCivil]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const sidebar = sidebarRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();

    function keepFocusInMenu(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSidebarOpen(false);
        menuToggleRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = [...sidebar.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], select:not([disabled])',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', keepFocusInMenu);
    function onResize() { if (window.innerWidth >= 1024) setSidebarOpen(false); }
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keepFocusInMenu);
      window.removeEventListener('resize', onResize);
    };
  }, [sidebarOpen]);

  if (pathname === '/connexion') return <>{children}</>;
  if (checkingAuth || !authenticated) {
    return <main className="grid min-h-screen place-items-center bg-background text-sm text-muted" aria-live="polite">Vérification de la session…</main>;
  }

  async function signOut() {
    setAuthError('');
    try {
      await apiPost('/auth/logout', {});
      setAuthenticated(false);
      setRoles([]);
      setPermissions([]);
      router.replace('/connexion');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Déconnexion impossible.');
    }
  }

  function changeCommune(nextCommuneId: string) {
    setSelectedCommuneId(nextCommuneId);
    window.location.reload();
  }

  function can(permission: string) {
    if (permission === 'requests:read') {
      return permissions.includes('births:read') || permissions.includes('cin:read');
    }
    if (permission === 'reports:read') return permissions.includes('dashboard:read');
    return permissions.includes(permission);
  }

  const activeCommune = communes.find(commune => commune.id === communeId);
  const roleLabel = roles.map(role => rolesDisplay[role] ?? role).join(' · ') || 'Utilisateur';
  const pagePrefix = Object.keys(pageLabels)
    .filter(prefix => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? '/';
  const pageTitle = pageLabels[pagePrefix] ?? 'SGAEC';

  function navLink({ label, href, icon: Icon }: NavigationLink) {
    const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} onClick={() => setSidebarOpen(false)} aria-current={current ? 'page' : undefined}
      className={`group flex min-h-10 items-center gap-3 rounded-xl border-l-[3px] px-3 py-0.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${current
        ? 'border-sky-300 bg-[#1d4a75] text-white shadow-sm'
        : 'border-transparent text-[#b9ccdf] hover:bg-[#1b456d] hover:text-white'}`}>
      <Icon size={18} strokeWidth={1.9} className={current ? 'text-sky-300' : 'text-slate-300 group-hover:text-white'}/>
      <span className="flex-1">{label}</span>
      {current && <ChevronRight size={15} aria-hidden="true" className="text-slate-200"/>}
    </Link>;
  }

  return <div className="min-h-screen bg-background text-ink">
    <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-navy focus:shadow-lg">Aller au contenu</a>
    {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-navy/60 lg:hidden" aria-label="Fermer la navigation" onClick={() => { setSidebarOpen(false); menuToggleRef.current?.focus(); }}/>}
    <aside ref={sidebarRef} id="navigation-principale" aria-label="Navigation principale"
      role={sidebarOpen ? 'dialog' : undefined} aria-modal={sidebarOpen || undefined}
      className={`fixed inset-y-0 left-0 z-40 flex w-[282px] max-w-[calc(100vw-48px)] flex-col border-r border-white/10 bg-[linear-gradient(180deg,#092847_0%,#12395e_65%,#0c2c4c_100%)] text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'}`}>
      <div className="relative border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#7bbce8]/25 bg-[#1b527b] text-[#d6efff]"><Landmark size={24}/></div>
          <div className="min-w-0"><strong className="block text-[22px] font-extrabold tracking-tight">SGAEC</strong><span className="mt-0.5 block text-[11px] leading-4 text-slate-300">Administration &amp; état civil</span></div>
        </div>
        <button type="button" className="absolute right-2 top-2 grid size-10 place-items-center rounded-lg hover:bg-white/10 lg:hidden" onClick={() => { setSidebarOpen(false); menuToggleRef.current?.focus(); }} aria-label="Fermer le menu"><X size={19}/></button>
      </div>
      <nav className="sidebar-navigation flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6" aria-label="Rubriques de l’application">
        <div className="flex flex-col gap-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#83a6c5]">Espace de travail</p>
          {primaryLinks.filter(link => can(link.permission)).map(navLink)}</div>
        {can('births:read') && <div className="flex flex-col gap-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#83a6c5]">État civil</p>
          <button type="button" className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors hover:bg-white/10 ${isCivil ? 'bg-white/10 text-white' : 'text-slate-200'}`} onClick={() => setCivilOpen(open => !open)} aria-expanded={civilOpen} aria-controls="etat-civil-sous-menu">
            <Baby size={18} className="text-slate-300"/><span className="flex-1">État civil</span><ChevronDown size={16} className={`transition-transform ${civilOpen ? '' : '-rotate-90'}`}/>
          </button>
          {civilOpen && <div id="etat-civil-sous-menu" className="ml-5 flex flex-col gap-1 border-l border-white/20 pl-3">
            <Link href="/naissances" onClick={() => setSidebarOpen(false)} aria-current={pathname.startsWith('/naissances') ? 'page' : undefined}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${pathname.startsWith('/naissances') ? 'bg-white/15 font-semibold text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${pathname.startsWith('/naissances') ? 'bg-amber-300' : 'bg-slate-400'}`}/>Naissances
            </Link>
            {['Mariages', 'Décès'].map(label => <div key={label} className="flex min-h-8 items-center gap-2 px-3 text-xs text-slate-400" aria-label={`${label} : non disponible dans ce prototype`}>
              <Clock3 size={13} aria-hidden="true"/><span className="flex-1">{label}</span><span className="text-[10px]">À venir</span>
            </div>)}
          </div>}
        </div>}
        {dossierLinks.some(link => can(link.permission)) && <div className="flex flex-col gap-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#83a6c5]">Dossiers et suivi</p>
          {dossierLinks.filter(link => can(link.permission)).map(navLink)}</div>}
        {managementLinks.some(link => can(link.permission)) && <div className="flex flex-col gap-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#83a6c5]">Pilotage</p>
          {managementLinks.filter(link => can(link.permission)).map(navLink)}</div>}
      </nav>
      <div className="m-3 mt-0 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-300"/><strong className="text-xs font-semibold text-white">SGAEC · V2 Démo</strong></div>
        <p className="mt-1.5 text-[11px] leading-5 text-[#a7bfd4]">Espace de travail sécurisé par commune et habilitation.</p>
      </div>
    </aside>

    <div className="min-h-screen lg:ml-[282px]">
      <header className="sticky top-0 z-20 flex min-h-[78px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button ref={menuToggleRef} type="button" className="grid size-11 shrink-0 place-items-center rounded-lg text-navy hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu" aria-controls="navigation-principale" aria-expanded={sidebarOpen}><Menu size={22}/></button>
          <div className="min-w-0"><p className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-muted sm:block">Espace administratif</p>
            <p className="truncate text-sm font-extrabold tracking-tight text-navy sm:text-lg">{pageTitle}</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {communes.length > 1 && <label className="hidden items-center gap-2 text-xs font-semibold text-muted sm:flex"><span className="hidden xl:inline">Commune</span>
            <select className="min-h-10 max-w-36 rounded-lg border border-line bg-white px-2 text-xs text-ink lg:max-w-48" aria-label="Changer la commune active" value={communeId} onChange={event => changeCommune(event.target.value)}>
              {communes.map(commune => <option key={commune.id} value={commune.id}>{commune.name}</option>)}
            </select></label>}
          {communes.length === 1 && activeCommune && <span className="hidden max-w-48 items-center gap-1.5 truncate text-xs font-semibold text-muted xl:inline-flex"><MapPin size={15} className="shrink-0 text-blue"/>{activeCommune.name}</span>}
          <span className="hidden items-center gap-1.5 rounded-full border border-blue/15 bg-sky px-3 py-1.5 text-[11px] font-bold text-blue lg:inline-flex"><span className="size-1.5 rounded-full bg-blue"/> Mode démo</span>
          <div className="flex items-center gap-2 border-l border-line pl-2 sm:pl-3" title={`${username} — ${roleLabel}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-blue/10 bg-sky text-blue"><UserRound size={19}/></span>
            <span className="hidden max-w-36 sm:block"><strong className="block truncate text-xs font-semibold text-ink">{username}</strong><small className="block truncate text-[11px] text-muted">{roleLabel}</small></span>
            <button type="button" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={18}/></button>
          </div>
        </div>
      </header>
      {communes.length > 1 && <div className="border-b border-line bg-white px-4 py-2 sm:hidden"><label className="flex items-center gap-3 text-xs font-medium text-muted">Commune active
        <select className="min-h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-2 text-xs text-ink" value={communeId} onChange={event => changeCommune(event.target.value)}>
          {communes.map(commune => <option key={commune.id} value={commune.id}>{commune.name}</option>)}
        </select></label></div>}
      {communes.length === 1 && activeCommune && <div className="border-b border-line bg-white px-4 py-2 text-xs text-muted sm:hidden"><span className="font-semibold">Commune active :</span> {activeCommune.name}</div>}
      {authError && <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-6 lg:mx-8">{authError}</div>}
      <main id="contenu" className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AccessProvider permissions={permissions} commune={activeCommune ?? null}>{children}</AccessProvider>
      </main>
    </div>
  </div>;
}
