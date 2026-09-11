interface Props {
  nombre: keyof typeof TRAZOS;
  tamano?: number;
}

/** Iconografia de linea, 24x24, trazo 1.6. */
const TRAZOS = {
  panel: 'M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6ZM13 9h8V3h-8v6Z',
  clientes: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 8v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  proyectos: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  cobros: 'M3 10h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm4 9h4',
  agenda: 'M8 3v4m8-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  metricas: 'M4 20V10m6 10V4m6 16v-7m-12 7h18',
  ajustes:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.9-1.1L14.6 2h-4l-.4 2.8c-.7.3-1.3.6-1.9 1.1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.8h4l.4-2.8c.7-.3 1.3-.6 1.9-1.1l2.4 1 2-3.4-2-1.6c.1-.4.1-.7.1-1.1Z',
  mas: 'M12 5v14M5 12h14',
  buscar: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  atras: 'M19 12H5m7-7-7 7 7 7',
  editar: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z',
  borrar: 'M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3',
  cerrar: 'M6 6l12 12M18 6 6 18',
  check: 'M4 12.5 9 18 20 6',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  aviso: 'M12 9v5m0 3h.01M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z',
  enlace: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  descargar: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  subir: 'M12 21V9m0 0 4 4m-4-4-4 4M4 3h16',
  rayo: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  nota: 'M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h4',
  brujula: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',
} as const;

export function Icono({ nombre, tamano = 16 }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

export type NombreIcono = keyof typeof TRAZOS;
