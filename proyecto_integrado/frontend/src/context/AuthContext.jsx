import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  // Access token solo en memoria (estado React), nunca en localStorage
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async (token) => {
    const res = await fetch('/api/accounts/me/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Sesión inválida')
    return res.json()
  }, [])

  // Restaurar sesión al montar usando la cookie HttpOnly de refresh
  useEffect(() => {
    fetch('/api/accounts/refresh/', {
      method: 'POST',
      credentials: 'include',   // envía la cookie ford_refresh
    })
      .then((res) => {
        if (!res.ok) throw new Error('Sin sesión activa')
        return res.json()
      })
      .then(async ({ access }) => {
        setAccessToken(access)
        const me = await fetchMe(access)
        setUser(me)
      })
      .catch(() => {
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [fetchMe])

  const login = async (email, password) => {
    const res = await fetch('/api/accounts/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // para recibir la cookie ford_refresh
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data?.detail || 'Credenciales incorrectas.')
    }
    const { access } = await res.json()  // solo el access token viene en el body
    setAccessToken(access)
    const me = await fetchMe(access)
    setUser(me)
    return me
  }

  const register = async ({ email, password, password2, first_name, last_name, telefono }) => {
    const res = await fetch('/api/accounts/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, password2, first_name, last_name, telefono }),
    })
    if (!res.ok) {
      const data = await res.json()
      const firstKey = Object.keys(data)[0]
      const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
      throw new Error(msg || 'Error al crear la cuenta.')
    }
    await login(email, password)
  }

  const logout = async () => {
    await fetch('/api/accounts/logout/', {
      method: 'POST',
      credentials: 'include',   // para que el servidor borre la cookie
    }).catch(() => {})
    setAccessToken(null)
    setUser(null)
  }

  const getToken = () => accessToken

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

