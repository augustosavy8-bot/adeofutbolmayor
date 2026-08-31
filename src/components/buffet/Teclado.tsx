'use client';

/**
 * Teclado numérico para dedo. Todas las teclas de 72px para arriba: en la
 * tablet del buffet se usa parado y apurado.
 */
export function Teclado({
  onDigito,
  onBorrar,
  onAceptar,
  aceptarLabel = 'Aceptar',
  aceptarActivo = true,
}: {
  onDigito: (d: string) => void;
  onBorrar: () => void;
  onAceptar?: () => void;
  aceptarLabel?: string;
  aceptarActivo?: boolean;
}) {
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-2">
      {teclas.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onDigito(t)}
          className="h-[72px] rounded-xl bg-panel-800 text-2xl font-bold text-zinc-100 transition active:bg-panel-700"
        >
          {t}
        </button>
      ))}

      <button
        type="button"
        onClick={onBorrar}
        className="h-[72px] rounded-xl bg-panel-850 text-lg font-semibold text-zinc-400 transition active:bg-panel-700"
      >
        ← Borrar
      </button>

      <button
        type="button"
        onClick={() => onDigito('0')}
        className="h-[72px] rounded-xl bg-panel-800 text-2xl font-bold text-zinc-100 transition active:bg-panel-700"
      >
        0
      </button>

      {onAceptar ? (
        <button
          type="button"
          onClick={onAceptar}
          disabled={!aceptarActivo}
          className="h-[72px] rounded-xl bg-adeo-rojo text-lg font-bold text-white transition active:bg-adeo-rojo-oscuro disabled:opacity-40"
        >
          {aceptarLabel}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
