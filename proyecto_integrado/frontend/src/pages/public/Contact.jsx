import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import MapaInteractivo from '../../components/MapaInteractivo'

// ── Datos mock ────────────────────────────────────────────────────────────────

const HORARIOS = [
  {
    area: 'Ventas',
    telefono: '744 487 5050',
    dias: [
      { label: 'Lun – Vie', horas: '09:00 AM – 06:30 PM' },
      { label: 'Sábado',    horas: '09:00 AM – 06:30 PM' },
      { label: 'Domingo',   horas: '10:00 AM – 02:00 PM' },
    ],
  },
  {
    area: 'Seminuevos',
    telefono: '744 487 5050',
    dias: [
      { label: 'Lun – Vie', horas: '09:00 AM – 06:30 PM' },
      { label: 'Sábado',    horas: '09:00 AM – 06:30 PM' },
      { label: 'Domingo',   horas: '10:00 AM – 02:00 PM' },
    ],
  },
  {
    area: 'Servicio',
    telefono: '744 487 5050',
    dias: [
      { label: 'Lun – Vie', horas: '09:00 AM – 06:30 PM' },
      { label: 'Sábado',    horas: '09:00 AM – 02:00 PM' },
      { label: 'Domingo',   horas: 'Cerrado' },
    ],
  },
  {
    area: 'Refacciones',
    telefono: '744 487 5050',
    dias: [
      { label: 'Lun – Vie', horas: '09:00 AM – 06:30 PM' },
      { label: 'Sábado',    horas: '09:00 AM – 02:00 PM' },
      { label: 'Domingo',   horas: 'Cerrado' },
    ],
  },
]

const DIRECTORIO = [
  {
    nombre: 'Lizette Manguilar',
    puesto: 'Gerente de Ventas',
    telefono: '744 487 5050',
    email: 'lmanguilar@fordguerrero.mx',
  },
  {
    nombre: 'Fabiola Sandoval',
    puesto: 'Gerente de Servicio',
    telefono: '777 362 4261',
    email: null,
  },
  {
    nombre: 'Carlos Poblete',
    puesto: 'Gerente de Servicio',
    telefono: '744 487 5050',
    email: 'cpoblete@fordguerrero.mx',
  },
]

// ── Componentes auxiliares ─────────────────────────────────────────────────────

// Tarjeta de horario por área
const HorarioArea = ({ area, telefono, dias }) => (
  <div className="py-5 first:pt-0 last:pb-0">
    <div className="flex items-baseline justify-between mb-2">
      <h4 className="text-xs uppercase tracking-widest text-gray-900 font-medium">
        {area}
      </h4>
      <span className="font-mono text-sm text-gray-500">{telefono}</span>
    </div>
    <div className="flex flex-col gap-1">
      {dias.map(({ label, horas }) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="font-light text-gray-500">{label}</span>
          <span className={`font-mono text-xs tracking-wide ${
            horas === 'Cerrado' ? 'text-red-400' : 'text-gray-600'
          }`}>
            {horas}
          </span>
        </div>
      ))}
    </div>
  </div>
)

// Item del directorio
const DirectorioItem = ({ nombre, puesto, telefono, email }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between py-6
                  group hover:bg-gray-50 px-4 -mx-4 transition-colors duration-200">
    <div className="mb-2 md:mb-0">
      <p className="font-bold text-gray-900">{nombre}</p>
      <p className="text-xs uppercase tracking-widest text-gray-400 mt-0.5">{puesto}</p>
    </div>
    <div className="flex flex-col md:items-end gap-0.5">
      <span className="font-mono text-sm text-gray-600">{telefono}</span>
      {email && (
        <a
          href={`mailto:${email}`}
          className="text-sm text-gray-500 hover:text-blue-700 transition-colors duration-200"
        >
          {email}
        </a>
      )}
    </div>
  </div>
)

// ── Componente principal ──────────────────────────────────────────────────────

const Contact = () => {

  return (
    <div className="min-h-screen bg-white">

      <Navbar usuario={null} />

      {/* ── SPLIT PRINCIPAL: Formulario (izq) + Mapa (der) ────────────────── */}
      {/* En desktop ocupa exactamente el viewport restante tras topbar+navbar  */}
      <section className="flex flex-col lg:flex-row lg:h-[calc(100vh-104px)]">

        {/* Columna izquierda — título de página + formulario con scroll */}
        <div className="lg:w-1/2 bg-white overflow-y-auto">
          <div className="px-10 py-12 lg:px-14 lg:py-10">

            {/* Header de página — reemplaza el hero eliminado */}
            <p className="uppercase text-xs tracking-widest text-blue-600 font-medium mb-3">
              Atención al cliente
            </p>
            <h1 className="font-black text-4xl lg:text-5xl tracking-tight leading-none">
              Contáctanos<span className="text-blue-500">.</span>
            </h1>
            <p className="font-mono text-xs text-gray-400 mt-3 mb-10">
              <span className="hover:text-gray-600 transition-colors cursor-pointer">Inicio</span>
              {' / '}
              <span>Contacto</span>
            </p>

            {/* Ubicación */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-8 border-b border-gray-100">
              <div>
                <p className="uppercase text-xs tracking-widest text-gray-400 font-medium mb-2">
                  Ubicación
                </p>
                <p className="font-bold text-gray-900">Ford Guerrero</p>
                <p className="font-light text-gray-500 text-sm mt-0.5">
                  Av. Farallón No. 18 esq. Rancho Acapulco,<br />Garita Acapulco, GUERRERO
                </p>
              </div>
              <a
                href="https://maps.google.com/?q=Ford+Guerrero+Acapulco"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-block px-6 py-2.5 border border-zinc-900 text-zinc-900
                           text-xs font-medium tracking-widest uppercase transition-all duration-300 ease-out
                           hover:bg-zinc-900 hover:text-white rounded-none self-start"
              >
                Cómo llegar
              </a>
            </div>

            {/* Horarios de atención */}
            <div>
              <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-6">
                Horarios de atención
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 divide-y divide-gray-100">
                {HORARIOS.map((h) => (
                  <HorarioArea key={h.area} {...h} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha — mapa que llena toda la altura disponible */}
        <div className="lg:w-1/2 h-72 lg:h-full">
          <MapaInteractivo />
        </div>

      </section>

      {/* ── DIRECTORIO ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="font-black text-3xl tracking-tight text-gray-900 leading-none">
            Directorio
          </h2>
          <p className="font-light text-gray-500 mt-3 mb-12">
            Nuestro personal está listo para atenderte.
          </p>
          <div className="flex flex-col divide-y divide-gray-100">
            {DIRECTORIO.map((persona) => (
              <DirectorioItem key={persona.nombre} {...persona} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <Footer />

    </div>
  )
}

export default Contact