'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive, BarChart3, Bell, ChevronDown, ChevronRight, ClipboardList,
  FileBadge, FileText, Home, Landmark, LogOut, Menu, Settings, ShieldCheck,
  UserRound, UsersRound, WalletCards, X,
} from 'lucide-react';
import { apiGet, apiPost, setSelectedCommuneId } from '@/lib/api';

type Commune = { id: string; code: string; name: string };
type CurrentUser = {
  id: string;
  username: string;
  roles: string[];
  communes: Commune[];
  current_commune_id: string;
};

const mainLinks = [
  { label: 'Accueil', href: '/', icon: Home },
  { label: 'Citoyens', href: '/citoyens', icon: UsersRound },
];
const childLinks = [
  { label: 'Naissances', href: '/naissances' },
  { label: 'Mariages', href: '/mariages' },
  { label: 'Décès', href: '/deces' },
];
const secondaryLinks = [
  { label: 'CIN', href: '/cin', icon: FileBadge },
  { label: 'Demandes', href: '/demandes', icon: WalletCards },
  { label: 'Archives', href: '/archives', icon: Archive },
  { label: 'Rapports', href: '/rapports', icon: BarChart3 },
  { label: 'Administration', href: '/administration', icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [civilOpen, setCivilOpen] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [communeId, setCommuneId] = useState('');
  const [authError, setAuthError] = useState('');
  const isCivil = ['/naissances', '/mariages', '/deces'].some(path => pathname.startsWith(path));

  useEffect(() => {
    if (pathname === '/connexion') {
      setCheckingAuth(false);
      return;
    }

    let active = true;
    setCheckingAuth(true);
    apiGet<CurrentUser>('/auth/me')
      .then(user => {
        if (active) {
          setUsername(user.username);
          setRoles(user.roles);
          setCommunes(user.communes);
          const savedCommuneId = window.localStorage.getItem('sgaec_commune_id');
          const selectedCommuneId = user.communes.some(commune => commune.id === savedCommuneId)
            ? savedCommuneId!
            : user.current_commune_id;
          setCommuneId(selectedCommuneId);
          setSelectedCommuneId(selectedCommuneId);
          setAuthenticated(true);
        }
      })
      .catch(() => {
        if (active) router.replace('/connexion');
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => { active = false; };
  }, [pathname, router]);

  if (pathname === '/connexion') return <>{children}</>;
  if (checkingAuth || !authenticated) {
    return <main className="auth-loading" aria-live="polite">Vérification de la session…</main>;
  }

  async function signOut() {
    setAuthError('');
    try {
      await apiPost('/auth/logout', {});
      router.replace('/connexion');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Déconnexion impossible.');
    }
  }

  function changeCommune(nextCommuneId: string) {
    setSelectedCommuneId(nextCommuneId);
    setCommuneId(nextCommuneId);
    window.location.reload();
  }

  const activeCommune = communes.find(commune => commune.id === communeId);
  const roleNames: Record<string, string> = {
    COMMUNE_ADMIN: 'Administrateur communal',
    AGENT_SAISIE: 'Agent de saisie',
    VALIDATEUR: 'Validateur',
    LECTURE_SEULE: 'Lecture seule',
  };
  const roleLabel = roleNames[roles[0]] ?? 'Utilisateur';

  function navLink({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Home }) {
    const selected = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return <Link key={href} className={`nav-link ${selected ? 'active' : ''}`} href={href} onClick={() => setSidebarOpen(false)}>
      <Icon size={17} strokeWidth={1.9} /> <span>{label}</span>
      {label === 'CIN' && <ChevronRight size={14} className="nav-chevron" />}
    </Link>;
  }

  return <div className="app-frame">
    {sidebarOpen && <button className="mobile-shade" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-symbol"><Landmark size={30} /></div>
        <div><strong>SGAEC</strong><span>Système de Gestion<br/>Administrative<br/>et d'État Civil</span></div>
        <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer"><X size={18}/></button>
      </div>
      <nav className="nav">
        {mainLinks.map(navLink)}
        <button className={`nav-link civil-trigger ${isCivil ? 'parent-active' : ''}`} onClick={() => setCivilOpen(!civilOpen)} aria-expanded={civilOpen}>
          <ClipboardList size={17}/><span>État civil</span><ChevronDown size={15} className={civilOpen ? '' : 'collapsed'}/>
        </button>
        {civilOpen && <div className="nav-children">{childLinks.map((item) =>
          <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
            className={`nav-child ${pathname.startsWith(item.href) ? 'active' : ''}`}>
            <span className="nav-dash">–</span>{item.label}
          </Link>
        )}</div>}
        {secondaryLinks.map(navLink)}
      </nav>
      <div className="sidebar-foot"><ShieldCheck size={16}/><span>SGAEC • Prototype<br/>Données de démonstration</span></div>
    </aside>

    <div className="main-panel">
      <header className="topbar">
        <div className="topbar-intro">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu"><Menu size={22}/></button>
          <div><h1>{activeCommune?.name ?? 'Commune'}</h1><p>Gestion de l'État Civil et des Documents Administratifs</p></div>
        </div>
        <div className="topbar-actions">
          {communes.length > 1 && <label className="tenant-picker"><span>Commune</span>
            <select aria-label="Commune active" value={communeId} onChange={event => changeCommune(event.target.value)}>
              {communes.map(commune => <option key={commune.id} value={commune.id}>{commune.name}</option>)}
            </select>
          </label>}
          <span className="demo-tag">Mode démonstration</span>
          <span className="bell" title="Notifications (démo)"><Bell size={19}/><i>1</i></span>
          <button type="button" className="agent-chip agent-logout" onClick={signOut} title="Se déconnecter">
            <span className="agent-avatar"><UserRound size={17}/></span>
            <div><strong>{username}</strong><small>{roleLabel}</small></div>
            <LogOut size={15}/>
          </button>
        </div>
      </header>
      {authError && <div className="alert-error auth-alert">{authError}</div>}
      <main className="content" id="contenu">{children}</main>
    </div>
  </div>;
}
