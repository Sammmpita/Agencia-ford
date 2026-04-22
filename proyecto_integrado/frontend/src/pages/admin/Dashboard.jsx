import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../../components/admin/StatusBadge'
import { useAuth } from '../../context/AuthContext'

function formatFecha(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  })

  const [kpis, setKpis] = useState([
    { label: 'Citas Pendientes',   value: '—' },
    { label: 'Vehículos Activos',  value: '—' },
    { label: 'Vendedores Activos', value: '—' },
    { label: 'Citas Completadas',  value: '—' },
  ])
  const [actividad, setActividad] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resCitas, resAutos, resVendedores] = await Promise.all([
          fetch('/api/citas/', { headers: getHeaders() }),
          fetch('/api/autos/vehiculos/', { headers: getHeaders() }),
          fetch('/api/vendedores/', { headers: getHeaders() }),
        ])

        if (!resCitas.ok || !resAutos.ok || !resVendedores.ok) {
          throw new Error('Error al obtener datos del servidor.')
        }

        const [citas, autos, vendedores] = await Promise.all([
          resCitas.json(),
          resAutos.json(),
          resVendedores.json(),
        ])

        const listaCitas = Array.isArray(citas) ? citas : (citas.results ?? [])
        const listaAutos = Array.isArray(autos) ? autos : (autos.results ?? [])
        const listaVendedores = Array.isArray(vendedores) ? vendedores : (vendedores.results ?? [])

        const pendientes = listaCitas.filter((c) => c.estado === 'pendiente').length
        const completadas = listaCitas.filter((c) => c.estado === 'completada').length
        const autosActivos = listaAutos.filter((a) => a.estado === 'disponible' || a.estado === 'reservado').length
        const vendedoresActivos = listaVendedores.filter((v) => v.activo !== false).length

        setKpis([
          { label: 'Citas Pendientes',   value: pendientes },
          { label: 'Vehículos Activos',  value: autosActivos },
          { label: 'Vendedores Activos', value: vendedoresActivos },
          { label: 'Citas Completadas',  value: completadas },
        ])

        const recientes = [...listaCitas]
          .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
          .slice(0, 10)
          .map((c) => ({
            id: `CIT-${String(c.id).padStart(4, '0')}`,
            fecha: formatFecha(c.fecha_hora),
            cliente: c.cliente
              ? `${c.cliente.first_name ?? ''} ${c.cliente.last_name ?? ''}`.trim() || c.cliente.email
              : '—',
            vehiculo: c.vehiculo
              ? `${c.vehiculo.marca ?? 'Ford'} ${c.vehiculo.modelo} ${c.vehiculo.anio}`
              : '—',
            vendedor: c.vendedor?.usuario
              ? `${c.vendedor.usuario.first_name ?? ''} ${c.vendedor.usuario.last_name ?? ''}`.trim() || '—'
              : '—',
            estado: c.estado,
          }))

        setActividad(recientes)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-black text-4xl tracking-tight leading-none text-gray-900">
            Dashboard.
          </h1>
          <p className="mt-2 font-light tracking-wide text-gray-500 text-sm">
            Métricas en tiempo real de la agencia.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium border border-gray-300 text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Menú principal
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map(({ label, value }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 p-8 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgb(0,0,0,0.08)]"
          >
            <p className={`font-black text-5xl font-mono tracking-tighter ${loading ? 'text-gray-300 animate-pulse' : 'text-gray-900'}`}>
              {value}
            </p>
            <p className="mt-3 text-xs uppercase tracking-widest text-gray-500 font-medium">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Actividad Reciente */}
      <div>
        <h2 className="font-extrabold text-xl tracking-tight text-gray-900 mb-1">
          Actividad Reciente
        </h2>
        <p className="text-sm font-light text-gray-500 tracking-wide mb-6">
          Últimas 10 citas registradas en el sistema.
        </p>

        <div className="bg-white border border-gray-200">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">ID</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">Fecha / Hora</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">Cliente</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">Vehículo</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">Vendedor</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-medium">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : actividad.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                    No hay citas registradas.
                  </td>
                </tr>
              ) : (
                actividad.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900 tracking-wide">{row.id}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-500 tracking-wide uppercase">{row.fecha}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.cliente}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-light">{row.vehiculo}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.vendedor}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={row.estado} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
