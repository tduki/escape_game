import { useEffect, useRef } from 'react'
import { useVoice } from '../context/VoiceContext'

// Composant invisible qui gère la lecture audio
export default function AudioManager() {
  const { peers } = useVoice()
  const audioElements = useRef({})

  // Expose a global helper to resume audio on user gesture
  useEffect(() => {
    window.resumeVoiceAudio = () => {
      Object.values(audioElements.current).forEach((audio) => {
        if (audio && audio.srcObject) {
          audio.play().catch(() => {})
        }
      })
    }

    const onFirstUserGesture = () => {
      window.resumeVoiceAudio()
      document.removeEventListener('click', onFirstUserGesture)
      document.removeEventListener('keydown', onFirstUserGesture)
    }
    document.addEventListener('click', onFirstUserGesture)
    document.addEventListener('keydown', onFirstUserGesture)

    return () => {
      document.removeEventListener('click', onFirstUserGesture)
      document.removeEventListener('keydown', onFirstUserGesture)
    }
  }, [])

  useEffect(() => {
    // Créer/mettre à jour les éléments audio pour chaque peer
    Object.entries(peers).forEach(([socketId, peer]) => {
      if (peer.stream) {
        // Créer l'élément audio s'il n'existe pas
        if (!audioElements.current[socketId]) {
          const audio = new Audio()
          audio.autoplay = true
          audio.playsInline = true
          audio.volume = 1.0
          audioElements.current[socketId] = audio
        }

        // Connecter le stream
        const audio = audioElements.current[socketId]
        if (audio.srcObject !== peer.stream) {
          audio.srcObject = peer.stream
        }
        audio.muted = peer.isMuted || false
        
        // Essayer de démarrer la lecture
        audio.play()
          .then(() => {
            // ok
          })
          .catch(() => {
            // Autoplay bloqué: on réessaiera au prochain geste utilisateur
            // et on programme un retry dans 1s
            setTimeout(() => window.resumeVoiceAudio && window.resumeVoiceAudio(), 1000)
          })
      }
    })

    // Nettoyer les anciens éléments audio
    Object.keys(audioElements.current).forEach(socketId => {
      if (!peers[socketId] || !peers[socketId].stream) {
        const audio = audioElements.current[socketId]
        if (audio) {
          audio.pause()
          audio.srcObject = null
          delete audioElements.current[socketId]
        }
      }
    })
  }, [peers])

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      Object.values(audioElements.current).forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      audioElements.current = {}
    }
  }, [])

  return null // Composant invisible
}

