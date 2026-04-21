import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Campo de contraseña con toggle de visibilidad.
 * Acepta las mismas props que un <input> estándar más `className` y `label`.
 * El estilo por defecto sigue el sistema de diseño del proyecto (borde inferior).
 */
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  required = false,
  className = '',
}) {
  const [visible, setVisible] = useState(false)

  const base =
    'border-0 border-b border-gray-300 focus:border-zinc-900 focus:ring-0 focus:outline-none rounded-none bg-transparent px-0 py-3 w-full text-gray-900 placeholder:text-gray-400 placeholder:font-light transition-colors'

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`${base} pr-8 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-0 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
      >
        {visible ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
      </button>
    </div>
  )
}
