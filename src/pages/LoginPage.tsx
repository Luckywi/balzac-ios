import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '@/assets/le-balzac-logo.png'

const CORRECT_PIN = '1234' // à remplacer plus tard par un système Firebase ou admin

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [errorShake, setErrorShake] = useState(false)
  const navigate = useNavigate()

  const handleClick = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === CORRECT_PIN) {
            navigate('/dashboard') // redirection si PIN correct
          } else {
            setErrorShake(true)
            setTimeout(() => {
              setErrorShake(false)
              setPin('')
            }, 500)
          }
        }, 200)
      }
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
  }
  
  // Force la page à occuper tout l'écran (fix pour le centrage)
  useEffect(() => {
    document.body.style.height = '100vh'
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.height = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-800 text-white px-4 w-full">
      {/* Logo et titre */}
      <div className="flex flex-col items-center mb-8">
        <img 
  src={logo}
  alt="Le Balzac Logo" 
  className="w-32 h-auto mb-6"
/>

        <h1 className="text-2xl text-white font-semibold">Entrer le code</h1>
      </div>

      {/* Points du code PIN */}
      <div className={`flex justify-center gap-4 mb-8 ${errorShake ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full ${
              pin.length > i ? 'bg-white' : 'bg-gray-600'
            } transition-colors duration-200`}
          />
        ))}
      </div>

      {/* Clavier numérique */}
      <div className="w-full max-w-xs mx-auto">
        {/* Rangée 1-2-3 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="aspect-square rounded-full bg-gray-800 text-white text-2xl font-medium flex items-center justify-center focus:outline-none active:bg-gray-700 hover:bg-gray-700 transition-colors"
            >
              {num}
            </button>
          ))}
        </div>
        
        {/* Rangée 4-5-6 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="aspect-square rounded-full bg-gray-800 text-white text-2xl font-medium flex items-center justify-center focus:outline-none active:bg-gray-700 hover:bg-gray-700 transition-colors"
            >
              {num}
            </button>
          ))}
        </div>
        
        {/* Rangée 7-8-9 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleClick(num.toString())}
              className="aspect-square rounded-full bg-gray-800 text-white text-2xl font-medium flex items-center justify-center focus:outline-none active:bg-gray-700 hover:bg-gray-700 transition-colors"
            >
              {num}
            </button>
          ))}
        </div>
        
        {/* Dernière rangée avec 0 et Effacer */}
        <div className="grid grid-cols-3 gap-4">
          <div className="aspect-square"></div> {/* Espace vide à la place du bouton Urgence */}
          <button
            onClick={() => handleClick('0')}
            className="aspect-square rounded-full bg-gray-800 text-white text-2xl font-medium flex items-center justify-center focus:outline-none active:bg-gray-700 hover:bg-gray-700 transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="aspect-square rounded-full bg-gray-800 text-white flex items-center justify-center focus:outline-none active:bg-gray-700 hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}