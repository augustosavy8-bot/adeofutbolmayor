export type NavItem = {
  href: string;
  label: string;
  icon: string;
  disponible: boolean;
};

/** Módulos del panel. Los que faltan quedan visibles como "pronto". */
export const NAV_ITEMS: NavItem[] = [
  { href: '/camisetas', label: 'Camisetas', icon: '👕', disponible: true },
  { href: '/plantel', label: 'Plantel', icon: '⚽', disponible: true },
  { href: '/facturas', label: 'Facturas', icon: '🧾', disponible: true },
  // El buffet es una app aparte: punto de venta offline, sin la sesión del
  // panel. Va igual en el menú para tenerlo a mano desde acá.
  { href: '/buffet', label: 'Buffet', icon: '🍔', disponible: true },
  { href: '/entrada', label: 'Entrada', icon: '🎟️', disponible: true },
  { href: '/cuotas', label: 'Cuotas', icon: '💵', disponible: false },
  { href: '/fichajes', label: 'Fichajes', icon: '📝', disponible: false },
];
