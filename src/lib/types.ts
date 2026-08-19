import type { Posicion } from '@/lib/posiciones';

export type GrupoTipo = 'talle_numerico' | 'talle_letra_doble';

export type Grupo = {
  id: string;
  nombre: string;
  tipo: GrupoTipo;
  orden: number;
  created_at: string;
};

export type Persona = {
  id: string;
  grupo_id: string;
  nombre: string;
  talle: string | null;
  talle_pantalon: string | null;
  talle_chomba: string | null;
  pago_sena: boolean;
  monto_sena: number;
  created_at: string;
};

export type GrupoConPersonas = Grupo & { personas: Persona[] };

export type Jugador = {
  id: string;
  nombre: string;
  posicion: Posicion;
  sueldo: number;
  al_dia: boolean;
  /** Ruta dentro del bucket `jugadores`; la URL pública se arma con urlFoto(). */
  foto_path: string | null;
  orden: number;
  created_at: string;
};

export type GrupoInsert = {
  id?: string;
  nombre: string;
  tipo: GrupoTipo;
  orden?: number;
  created_at?: string;
};

export type PersonaInsert = {
  id?: string;
  grupo_id: string;
  nombre: string;
  talle?: string | null;
  talle_pantalon?: string | null;
  talle_chomba?: string | null;
  pago_sena?: boolean;
  monto_sena?: number;
  created_at?: string;
};

export type JugadorInsert = {
  id?: string;
  nombre: string;
  posicion: Posicion;
  sueldo?: number;
  al_dia?: boolean;
  foto_path?: string | null;
  orden?: number;
  created_at?: string;
};

/** Tipado mínimo del esquema, con la forma que espera supabase-js. */
export type Database = {
  public: {
    Tables: {
      adeo_grupos: {
        Row: Grupo;
        Insert: GrupoInsert;
        Update: Partial<GrupoInsert>;
        Relationships: [];
      };
      adeo_personas: {
        Row: Persona;
        Insert: PersonaInsert;
        Update: Partial<PersonaInsert>;
        Relationships: [];
      };
      adeo_jugadores: {
        Row: Jugador;
        Insert: JugadorInsert;
        Update: Partial<JugadorInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
