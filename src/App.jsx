import { useEffect, useMemo, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import './App.css'
import { supabase } from './supabaseClient'

// Import Components
import { Icons } from './components/Icons'
import { AuthForm } from './components/AuthForm'
import { Gallery } from './components/Gallery'
import { DeleteModal } from './components/DeleteModal'

function App() {
  const [authMode, setAuthMode] = useState('signup')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [busyAuth, setBusyAuth] = useState(false)
  const [status, setStatus] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const fileInputRef = useRef(null)

  const normalizedUsername = useMemo(
    () => username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''),
    [username],
  )

  const authEmail = `${normalizedUsername}@mobile-gallery.app`

  const loadPhotos = async (userId) => {
    setLoadingPhotos(true)
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, storage_path, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        setStatus(error.message)
        return
      }

      if (data.length === 0) {
        setPhotos([])
        return
      }

      // ── Private Bucket: Generate Signed URLs for Security ─────
      const paths = data.map(p => p.storage_path)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('photos')
        .createSignedUrls(paths, 3600)

      if (signedError) {
        console.error('Core Signed URL error:', signedError)
        setStatus('Signed URL error: ' + signedError.message)
        return
      }

      console.log('Signed Data Response:', signedData)

      const withUrl = data.map((row) => {
        // Find matching signed URL. We normalize paths to ensure a match.
        const matchingSigned = signedData.find(s => {
          const sPath = s.path?.replace(/^\/+/, '') // Remove leading slashes
          const rPath = row.storage_path?.replace(/^\/+/, '')
          return sPath === rPath
        })
        
        if (matchingSigned?.error) {
          console.error(`Error for path ${row.storage_path}:`, matchingSigned.error)
        }

        return {
          ...row,
          signedUrl: matchingSigned?.signedUrl || null,
        }
      })

      setPhotos(withUrl)
    } catch (err) {
      setStatus('Failed to load photos: ' + err.message)
    } finally {
      setLoadingPhotos(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userSession = data.session
      setSession(userSession)
      if (userSession?.user?.id) {
        loadPhotos(userSession.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user?.id) {
        loadPhotos(currentSession.user.id)
      } else {
        setPhotos([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auto-hide status messages after 3 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleAuth = async (event) => {
    event.preventDefault()
    if (!normalizedUsername || password.length < 6) {
      setStatus('Username required and password must be at least 6 characters.')
      return
    }

    setBusyAuth(true)
    setStatus('')

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
        })

        if (error) {
          const isRateLimit = /rate limit/i.test(error.message)
          if (!isRateLimit) {
            setStatus(error.message)
            return
          }

          const { error: loginAfterRateLimitError } =
            await supabase.auth.signInWithPassword({
              email: authEmail,
              password,
            })

          if (loginAfterRateLimitError) {
            setStatus(
              'Signup is temporarily rate-limited. Wait a minute, then try again or use Login mode.',
            )
            return
          }

          setStatus('Account already exists. Logged in successfully.')
          setPassword('')
          return
        }

        const userId = data.user?.id
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ user_id: userId, username: normalizedUsername })
          if (profileError) {
            setStatus(profileError.message)
            return
          }
        }

        setStatus('Account created. You are now logged in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        })

        if (error) {
          setStatus(error.message)
          return
        }
        setStatus('Login successful.')
      }

      setPassword('')
    } catch (err) {
      setStatus('Auth error: ' + err.message)
    } finally {
      setBusyAuth(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Get the absolute latest session directly from Supabase to avoid race conditions
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession?.user?.id) {
      setStatus('Session error. Please try logging in again.')
      return
    }

    // Client-side file size limit (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setStatus('File is too large. Maximum size is 10 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setStatus('')

    try {
      // ── Image Compression ─────────────────────
      let fileToUpload = file
      try {
        if (typeof imageCompression === 'function') {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1600,
            useWebWorker: false, // Disabled for better reliability on mobile
          }
          fileToUpload = await imageCompression(file, options)
        }
      } catch (compressErr) {
        console.error('Compression failed, using raw file:', compressErr)
      }
      
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const contentType = file.type || `image/${extension === 'png' ? 'png' : 'jpeg'}`
      
      const uuid = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
      const filePath = `${currentSession.user.id}/${uuid}.${extension}`

      // ── Storage Upload with Exponential Backoff ─────
      let uploadError = null
      for (let i = 0; i < 5; i++) {
        const { error } = await supabase.storage
          .from('photos')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: contentType // Explicitly set for better mobile handling
          })
        
        if (!error) {
          uploadError = null
          break
        }
        
        uploadError = error
        console.warn(`Upload attempt ${i + 1} failed:`, error.message)
        
        // Wait exponentially: 1s, 2s, 4s, 8s...
        if (i < 4) {
          const delay = Math.pow(2, i) * 1000
          await new Promise(r => setTimeout(r, delay))
        }
      }

      if (uploadError) {
        setStatus(`Storage error: ${uploadError.message || 'Connection lost after 5 attempts'}`)
        return
      }

      // ── Database Insert with Retry ─────────────
      let insertError = null
      let insertedRecord = null
      
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('photos')
          .insert({ user_id: currentSession.user.id, storage_path: filePath })
          .select()
          .single()
          
        if (!error) {
          insertError = null
          insertedRecord = data
          break
        }
        insertError = error
        if (i < 2) await new Promise(r => setTimeout(r, 1000))
      }

      if (insertError) {
        setStatus(`Database error: ${insertError.message || 'Failed to sync'}`)
        return
      }

      // ── Incremental Optimization ────────────────
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('photos')
        .createSignedUrl(filePath, 3600)

      if (!signedUrlError && signedUrlData) {
        const newPhoto = {
          ...insertedRecord, // Use the real record from DB (has the UUID)
          signedUrl: signedUrlData.signedUrl
        }
        setPhotos(prev => [newPhoto, ...prev])
      } else {
        await loadPhotos(currentSession.user.id)
      }

      setStatus('Photo uploaded successfully!')
    } catch (err) {
      console.error('Handled Upload Error:', err)
      const isFetchError = err?.message?.toLowerCase().includes('fetch')
      const errorMsg = isFetchError 
        ? 'Network error: Please check your connection or try again.'
        : (err?.message || 'Unknown upload error')
      
      setStatus('Upload failed: ' + errorMsg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteClick = (photo) => {
    setPhotoToDelete(photo)
  }

  const confirmDelete = async () => {
    if (!photoToDelete) return
    
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession?.user?.id) {
      setStatus('Session error. Please try logging in again.')
      setPhotoToDelete(null)
      return
    }

    const photo = photoToDelete
    setPhotoToDelete(null)

    try {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.storage_path])

      if (storageError) {
        setStatus(storageError.message)
        return
      }

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id)
        .eq('user_id', currentSession.user.id)

      if (dbError) {
        setStatus(dbError.message)
        return
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      setStatus('Photo deleted.')
    } catch (err) {
      setStatus('Delete failed: ' + err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUsername('')
    setStatus('Logged out.')
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <main className="app">
        <header className="mainHeader">
          <div className="logoArea">
            <div className="logoIcon"><Icons.Camera /></div>
            <h1>Photo Vault</h1>
          </div>
          <p>Private end-to-end media storage.</p>
        </header>

        {!session ? (
          <AuthForm 
            authMode={authMode} 
            setAuthMode={setAuthMode} 
            username={username} 
            setUsername={setUsername} 
            password={password} 
            setPassword={setPassword} 
            handleAuth={handleAuth} 
            busyAuth={busyAuth} 
          />
        ) : (
          <Gallery 
            photos={photos} 
            uploading={uploading} 
            loadingPhotos={loadingPhotos} 
            handleUpload={handleUpload} 
            handleLogout={handleLogout} 
            handleDeleteClick={handleDeleteClick} 
            setLightboxIndex={setLightboxIndex} 
            fileInputRef={fileInputRef} 
            formatDate={formatDate} 
          />
        )}

        {status && (
          <p className={`status ${status.toLowerCase().includes('fail') || status.toLowerCase().includes('error') || status.toLowerCase().includes('missing') || status.toLowerCase().includes('limit') ? 'statusError' : 'statusSuccess'}`}>
            {status}
          </p>
        )}
      </main>

      {photoToDelete && (
        <DeleteModal 
          onConfirm={confirmDelete} 
          onCancel={() => setPhotoToDelete(null)} 
        />
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        slides={photos.map((photo) => ({ src: photo.signedUrl || photo.publicUrl }))}
        index={lightboxIndex}
        plugins={[Zoom]}
      />
    </>
  )
}

export default App
