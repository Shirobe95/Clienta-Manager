import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icono } from './Icono';

export function Cabecera({
  titulo,
  subtitulo,
  acciones,
  volverA,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  volverA?: string;
}) {
  const navegar = useNavigate();
  return (
    <header className="cabecera">
      {volverA && (
        <button type="button" className="btn discreto pequeno" onClick={() => navegar(volverA)} aria-label="Volver">
          <Icono nombre="atras" />
        </button>
      )}
      <div className="cabecera-textos">
        <h1 className="recorte">{titulo}</h1>
        {subtitulo && <div className="sub recorte">{subtitulo}</div>}
      </div>
      {acciones && <div className="cabecera-acciones">{acciones}</div>}
    </header>
  );
}
