'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  db,
  turnoAbierto,
  type Cajero,
  type ItemVenta,
  type Producto,
  type Puesto,
  type Turno,
} from '@/db/buffet';

const claveCajero = (puesto: Puesto) => `adeo-buffet:cajero:${puesto}`;

// ------------------------------------------------------------------ sesión
type Sesion = {
  /** Qué punto de venta es esta pantalla: buffet o boletería. */
  puesto: Puesto;
  cajero: Cajero | null;
  turno: Turno | null;
  /** Mientras se rehidrata desde IndexedDB no se sabe si hay sesión. */
  cargando: boolean;
  entrar: (cajero: Cajero, turno: Turno) => void;
  salir: () => void;
  refrescarTurno: () => Promise<void>;
};

// ----------------------------------------------------------------- carrito
type AccionCarrito =
  | { tipo: 'agregar'; producto: Producto }
  | { tipo: 'sumar'; productoId: string }
  | { tipo: 'restar'; productoId: string }
  | { tipo: 'quitar'; productoId: string }
  | { tipo: 'limpiar' };

function reducirCarrito(items: ItemVenta[], accion: AccionCarrito): ItemVenta[] {
  switch (accion.tipo) {
    case 'agregar': {
      const { producto } = accion;
      const existe = items.find((i) => i.productoId === producto.id);
      if (existe) {
        return items.map((i) =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...items,
        {
          productoId: producto.id,
          // El nombre y el precio se copian al item: si mañana cambia el
          // producto, la venta vieja tiene que seguir mostrando lo cobrado.
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
        },
      ];
    }
    // Sumar uno de algo que ya está en el carrito, sin necesitar el producto
    // entero: el botón + del carrito sólo conoce el item.
    case 'sumar':
      return items.map((i) =>
        i.productoId === accion.productoId
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
      );
    case 'restar':
      return items
        .map((i) =>
          i.productoId === accion.productoId
            ? { ...i, cantidad: i.cantidad - 1 }
            : i
        )
        .filter((i) => i.cantidad > 0);
    case 'quitar':
      return items.filter((i) => i.productoId !== accion.productoId);
    case 'limpiar':
      return [];
  }
}

type Carrito = {
  items: ItemVenta[];
  total: number;
  unidades: number;
  agregar: (producto: Producto) => void;
  sumar: (productoId: string) => void;
  restar: (productoId: string) => void;
  quitar: (productoId: string) => void;
  limpiar: () => void;
};

const CtxSesion = createContext<Sesion | null>(null);
const CtxCarrito = createContext<Carrito | null>(null);

export function BuffetProvider({
  puesto,
  children,
}: {
  puesto: Puesto;
  children: React.ReactNode;
}) {
  const [cajero, setCajero] = useState<Cajero | null>(null);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [items, despachar] = useReducer(reducirCarrito, []);

  // Al abrir la app se recupera el cajero de localStorage y el turno abierto
  // de IndexedDB. Si el turno se cerró desde otro lado, la sesión cae.
  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        const id = localStorage.getItem(claveCajero(puesto));
        const abierto = await turnoAbierto(puesto);
        const guardado = id ? await db().cajeros.get(id) : undefined;

        if (!vigente) return;
        if (guardado && abierto && abierto.cajeroId === guardado.id) {
          setCajero(guardado);
          setTurno(abierto);
        }
      } catch (e) {
        console.error('No se pudo recuperar la sesión', e);
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [puesto]);

  const entrar = useCallback(
    (c: Cajero, t: Turno) => {
      localStorage.setItem(claveCajero(puesto), c.id);
      setCajero(c);
      setTurno(t);
    },
    [puesto]
  );

  const salir = useCallback(() => {
    localStorage.removeItem(claveCajero(puesto));
    setCajero(null);
    setTurno(null);
    despachar({ tipo: 'limpiar' });
  }, [puesto]);

  const refrescarTurno = useCallback(async () => {
    setTurno((await turnoAbierto(puesto)) ?? null);
  }, [puesto]);

  const sesion = useMemo<Sesion>(
    () => ({ puesto, cajero, turno, cargando, entrar, salir, refrescarTurno }),
    [puesto, cajero, turno, cargando, entrar, salir, refrescarTurno]
  );

  const carrito = useMemo<Carrito>(
    () => ({
      items,
      total: items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
      unidades: items.reduce((acc, i) => acc + i.cantidad, 0),
      agregar: (producto) => despachar({ tipo: 'agregar', producto }),
      sumar: (productoId) => despachar({ tipo: 'sumar', productoId }),
      restar: (productoId) => despachar({ tipo: 'restar', productoId }),
      quitar: (productoId) => despachar({ tipo: 'quitar', productoId }),
      limpiar: () => despachar({ tipo: 'limpiar' }),
    }),
    [items]
  );

  return (
    <CtxSesion.Provider value={sesion}>
      <CtxCarrito.Provider value={carrito}>{children}</CtxCarrito.Provider>
    </CtxSesion.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(CtxSesion);
  if (!ctx) throw new Error('useSesion fuera de BuffetProvider');
  return ctx;
}

export function useCarrito() {
  const ctx = useContext(CtxCarrito);
  if (!ctx) throw new Error('useCarrito fuera de BuffetProvider');
  return ctx;
}
