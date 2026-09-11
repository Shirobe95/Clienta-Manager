import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Icono } from './components/Icono';
import type { NombreIcono } from './components/Icono';
import { useAlmacen } from './state/store';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { ClienteDetalle } from './pages/ClienteDetalle';
import { Proyectos } from './pages/Proyectos';
import { ProyectoDetalle } from './pages/ProyectoDetalle';
import { Cobros } from './pages/Cobros';
import { Agenda } from './pages/Agenda';
import { Ajustes } from './pages/Ajustes';
import { hoy } from './lib/format';
import { cobrosPorVencer, seguimientosProximos } from './lib/metrics';

interface Enlace {
  a: string;
  texto: string;
  icono: NombreIcono;
  cuenta?: number;
}

export function App() {
  const { db } = useAlmacen();
  const fecha = hoy();

  const grupos: { titulo: string; enlaces: Enlace[] }[] = [
    {
      titulo: 'Control',
      enlaces: [
        { a: '/panel', texto: 'Panel', icono: 'panel' },
        { a: '/clientes', texto: 'Clientes', icono: 'clientes', cuenta: db.clientes.length },
        { a: '/proyectos', texto: 'Proyectos', icono: 'proyectos', cuenta: db.proyectos.length },
      ],
    },
    {
      titulo: 'Dinero y agenda',
      enlaces: [
        {
          a: '/cobros',
          texto: 'Cobros y pagos',
          icono: 'cobros',
          cuenta: cobrosPorVencer(db, fecha, 3650).length,
        },
        {
          a: '/agenda',
          texto: 'Agenda',
          icono: 'agenda',
          cuenta: seguimientosProximos(db, fecha, 3650).length,
        },
      ],
    },
    { titulo: 'Sistema', enlaces: [{ a: '/ajustes', texto: 'Ajustes', icono: 'ajustes' }] },
  ];

  return (
    <div className="app">
      <nav className="lateral">
        <div className="marca">
          <span className="marca-logo">
            <Icono nombre="rayo" tamano={16} />
          </span>
          <div>
            <div className="marca-nombre">Clienta</div>
            <div className="marca-sub">Manager</div>
          </div>
        </div>

        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <div className="nav-grupo">{grupo.titulo}</div>
            {grupo.enlaces.map((enlace) => (
              <NavLink
                key={enlace.a}
                to={enlace.a}
                className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
              >
                <Icono nombre={enlace.icono} />
                {enlace.texto}
                {enlace.cuenta !== undefined && enlace.cuenta > 0 && (
                  <span className="cuenta">{enlace.cuenta}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="lateral-pie">
          Datos guardados en este navegador.
          <br />
          Haz copia desde Ajustes.
        </div>
      </nav>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/panel" replace />} />
          <Route path="/panel" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
          <Route path="/cobros" element={<Cobros />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>
    </div>
  );
}
