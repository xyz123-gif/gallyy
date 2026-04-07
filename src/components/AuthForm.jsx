import React, { useState } from 'react'
import { Icons } from './Icons'

export function AuthForm({ 
  authMode, 
  setAuthMode, 
  username, 
  setUsername, 
  password, 
  setPassword, 
  handleAuth, 
  busyAuth 
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="landingPage">
      <form className="card authCard" onSubmit={handleAuth}>
        <div className="authHeader">
          <h3>{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h3>
          <p className="authSubtext">
            {authMode === 'signup'
              ? 'Sign up to start your private vault'
              : 'Enter your credentials to enter'}
          </p>
        </div>

        <div className="inputGroup">
          <label htmlFor="username">Username</label>
          <div className="inputWrapper">
            <span className="inputIcon"><Icons.User /></span>
            <input
              id="username"
              type="text"
              inputMode="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              required
            />
          </div>
        </div>

        <div className="inputGroup">
          <label htmlFor="password">Password</label>
          <div className="inputWrapper">
            <span className="inputIcon"><Icons.Lock /></span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={
                authMode === 'signup' ? 'new-password' : 'current-password'
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="minimum 6 characters"
              minLength={6}
              required
            />
            <button 
              type="button" 
              className="passwordToggle" 
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
        </div>

        <button className="primaryBtn" disabled={busyAuth} type="submit">
          {busyAuth
            ? 'Validating...'
            : authMode === 'signup'
              ? 'Join the Vault'
              : 'Access Now'}
        </button>

        <button
          className="switchBtn"
          type="button"
          onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
        >
          {authMode === 'signup'
            ? 'Already have an account? Login'
            : "Don't have an account? Sign up"}
        </button>
      </form>

      <section className="heroSection">
        <h2>Your Memories, <span className="highlight">Perfectly Secured.</span></h2>
        <p>Access your private gallery from any device. Encrypted, fast, and always with you.</p>
        
        <div className="featureList">
          <div className="featureItem">
            <div className="featureIcon"><Icons.Shield /></div>
            <div>
              <h4>Privacy First</h4>
              <p>Your photos are protected by Supabase's military-grade security.</p>
            </div>
          </div>
          <div className="featureItem">
            <div className="featureIcon"><Icons.Zap /></div>
            <div>
              <h4>Instant Access</h4>
              <p>Lightning fast uploads and dynamic gallery loading.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
