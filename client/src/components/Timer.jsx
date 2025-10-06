import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Timer({ maxTime }) {
  const { startTime, setGameResult } = useGame()
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState(maxTime)

  useEffect(() => {
    if (!startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = maxTime - elapsed

      if (remaining <= 0) {
        clearInterval(interval)
        setTimeLeft(0)
        // Temps écoulé - Game Over
        setGameResult({
          success: false,
          finalTime: maxTime,
          maxTime,
          message: 'Temps écoulé !'
        })
        toast.error('⏰ Temps écoulé ! Mission échouée.')
        setTimeout(() => navigate('/debriefing'), 2000)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, maxTime, navigate, setGameResult])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isCritical = timeLeft <= 120 // 2 minutes
  const isVeryLow = timeLeft <= 60 // 1 minute

  return (
    <div className={`flex items-center gap-2 ${isCritical ? 'timer-critical' : ''}`}>
      <span className="text-3xl">⏱️</span>
      <div className="text-center">
        <div className={`text-3xl font-mono font-bold ${
          isVeryLow ? 'text-danger' : isCritical ? 'text-yellow-500' : 'text-white'
        }`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400">temps restant</div>
      </div>
    </div>
  )
}

