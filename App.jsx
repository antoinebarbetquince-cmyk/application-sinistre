import { useEffect, useRef, useState } from 'react'
import {
  supabase,
  signIn, signOut, getSession, onAuthChange,
  fetchSinistres, upsertSinistre,
  fetchActivite, addActivite,
  fetchRelances, upsertRelance, deleteRelance,
  fetchDocuments, addDocument, deleteDocument,
} from './supabase.js'

// ─── Écran de chargement ──────────────────────────────────
function Loading({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1E1C1A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'DM Sans, sans-serif' }}>
        <span style={{ color: '#fff' }}>Quincé</span>
        <span style={{ color: '#E8610A' }}>Sinistr</span>
      </div>
      <div style={{ color: '#8A8580', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>{message}</div>
      <div style={{
        width: 200, height: 3, background: '#2E2C28',
        borderRadius: 2, overflow: 'hidden', marginTop: 8
      }}>
        <div style={{
          height: '100%', background: '#E8610A', borderRadius: 2,
          animation: 'progress 1.5s ease-in-out infinite',
          width: '40%'
        }}/>
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%) }
          100% { transform: translateX(600%) }
        }
      `}</style>
    </div>
  )
}

// ─── Écran de connexion ───────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      onLogin()
    } catch (err) {
      setError('Identifiant ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1E1C1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '36px 32px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.4)',
        fontFamily: 'DM Sans, sans-serif'
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          Quincé<span style={{ color: '#E8610A' }}>Sinistr</span>
        </div>
        <div style={{ fontSize: 12, color: '#9A9590', marginBottom: 28 }}>
          Groupe Quincé — Gestion de sinistralité
        </div>
        <form onSubmit={handleLogin}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Adresse e-mail
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.fr" required
            style={{
              display: 'block', width: '100%', marginTop: 6, marginBottom: 16,
              padding: '9px 12px', border: '1px solid #D8D4CE', borderRadius: 7,
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Mot de passe
          </label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required
            style={{
              display: 'block', width: '100%', marginTop: 6, marginBottom: 20,
              padding: '9px 12px', border: '1px solid #D8D4CE', borderRadius: 7,
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{
              background: '#FEE8E8', color: '#B91C1C', fontSize: 12,
              padding: '8px 12px', borderRadius: 6, marginBottom: 16
            }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', background: loading ? '#C4500A' : '#E8610A',
            color: '#fff', border: 'none', borderRadius: 7, fontSize: 13,
            fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer'
          }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── App principale ───────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState('loading') // loading | auth | ready | error
  const [session, setSession] = useState(null)
  const [dbData, setDbData] = useState(null)
  const iframeRef = useRef(null)

  // Vérifier la session au démarrage
  useEffect(() => {
    getSession().then(s => {
      if (s) {
        setSession(s)
        loadAllData()
      } else {
        setStatus('auth')
      }
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = onAuthChange((event, s) => {
      if (event === 'SIGNED_IN') {
        setSession(s)
        loadAllData()
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setDbData(null)
        setStatus('auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadAllData() {
    setStatus('loading')
    try {
      const [sinistres, relances] = await Promise.all([
        fetchSinistres(),
        fetchRelances(),
      ])
      setDbData({ sinistres, relances })
      setStatus('ready')
    } catch (err) {
      console.error('Erreur chargement données:', err)
      setStatus('error')
    }
  }

  // Recevoir les messages de la page HTML embarquée
  useEffect(() => {
    const handler = async (event) => {
      if (!event.data?.type) return
      const { type, payload } = event.data

      try {
        switch (type) {
          case 'SAVE_SINISTRE': {
            const saved = await upsertSinistre(payload)
            iframeRef.current?.contentWindow?.postMessage({ type: 'SINISTRE_SAVED', payload: saved }, '*')
            break
          }
          case 'ADD_ACTIVITE': {
            await addActivite(payload)
            break
          }
          case 'SAVE_RELANCE': {
            const saved = await upsertRelance(payload)
            iframeRef.current?.contentWindow?.postMessage({ type: 'RELANCE_SAVED', payload: saved }, '*')
            break
          }
          case 'DELETE_RELANCE': {
            await deleteRelance(payload.id)
            break
          }
          case 'LOGOUT': {
            await signOut()
            break
          }
          case 'GET_SESSION': {
            iframeRef.current?.contentWindow?.postMessage({
              type: 'SESSION_DATA',
              payload: session?.user
            }, '*')
            break
          }
        }
      } catch (err) {
        console.error('Erreur opération Supabase:', err)
        iframeRef.current?.contentWindow?.postMessage({
          type: 'SUPABASE_ERROR',
          payload: err.message
        }, '*')
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [session])

  if (status === 'loading') return <Loading message="Chargement des données…" />
  if (status === 'error') return <Loading message="Erreur de connexion à la base de données" />
  if (status === 'auth') return <LoginScreen onLogin={loadAllData} />

  // Injecter les données dans la page HTML
  const user = session?.user
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Utilisateur'
  const userRole = user?.user_metadata?.role || 'Utilisateur'
  const userAv = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Encoder les données pour injection dans l'iframe
  const dataScript = `
    window.__SUPABASE_DATA__ = ${JSON.stringify({
      sinistres: dbData.sinistres,
      relances: dbData.relances,
      user: { email: user?.email, name: userName, role: userRole, av: userAv }
    })};
    window.__SUPABASE_MODE__ = true;
  `

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <SinistrApp
        data={dbData}
        user={{ email: user?.email, name: userName, role: userRole, av: userAv }}
        onLogout={async () => { await signOut() }}
        onSave={upsertSinistre}
        onSaveRelance={upsertRelance}
        onDeleteRelance={deleteRelance}
      />
    </div>
  )
}

// ─── Composant wrapper qui charge le HTML ─────────────────
// NOTE : Le fichier sinistralite.html est placé dans /public/app.html
// L'App React gère auth + data, puis passe tout à l'app HTML via postMessage
function SinistrApp({ data, user, onLogout, onSave, onSaveRelance, onDeleteRelance }) {
  const containerRef = useRef(null)

  useEffect(() => {
    // L'approche la plus simple : on rend l'app HTML directement
    // en injectant les données dans window avant que le script s'exécute
    window.__DB_SINISTRES__ = data.sinistres
    window.__DB_RELANCES__ = data.relances
    window.__DB_USER__ = user
    window.__DB_SAVE__ = onSave
    window.__DB_SAVE_RELANCE__ = onSaveRelance
    window.__DB_DELETE_RELANCE__ = onDeleteRelance
    window.__DB_LOGOUT__ = onLogout
  }, [data, user])

  return (
    <iframe
      ref={containerRef}
      src="/app.html"
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="QuincéSinistr"
    />
  )
}
