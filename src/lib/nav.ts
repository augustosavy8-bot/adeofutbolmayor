export type NavItem = {
  href: string;
  label: string;
  icon: string;
  disponible: boolean;
};

/** Módulos del panel. Los que faltan quedan visibles como "pronto". */
export const NAV_ITEMS: NavItem[] = [
  { href: '/camisetas', label: 'Camisetas', icon: '👕', disponible: true },
  { href: '/cuotas', label: 'Cuotas', icon: '💵', disponible: false },
  { href: '/fichajes', label: 'Fichajes', icon: '📝', disponible: false },
  { href: '/plantel', label: 'Plantel', icon: '⚽', disponible: false },
];
