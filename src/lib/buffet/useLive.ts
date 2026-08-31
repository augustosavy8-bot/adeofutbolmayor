'use client';

import { liveQuery } from 'dexie';
import { useEffect, useRef, useState } from 'react';

/**
 * Suscribe un `liveQuery` de Dexie a estado de React: cualquier escritura en
 * IndexedDB vuelve a disparar la consulta, incluso si vino de otra pestaña.
 *
 * Se hace a mano en vez de traer `dexie-react-hooks` para no sumar otro
 * paquete al proyecto.
 */
export function useLive<T>(
  consulta: () => Promise<T>,
  inicial: T,
  deps: unknown[] = []
) {
  const [valor, setValor] = useState<T>(inicial);
  const [cargando, setCargando] = useState(true);

  // La consulta se toma por referencia para que no haga falta memorizarla en
  // cada pantalla; lo que decide cuándo re-suscribir es `deps`.
  const ref = useRef(consulta);
  ref.current = consulta;

  useEffect(() => {
    const sub = liveQuery(() => ref.current()).subscribe({
      next: (v) => {
        setValor(v);
        setCargando(false);
      },
      error: (e) => {
        console.error('Consulta local fallida', e);
        setCargando(false);
      },
    });
    return () => sub.unsubscribe();
    // El array viene del llamador; el linter no puede verificarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { valor, cargando };
}
