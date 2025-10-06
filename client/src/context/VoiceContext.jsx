import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useSocket } from './SocketContext'
import { useGame } from './GameContext'

const VoiceContext = createContext()

export const useVoice = () => {
  const context = useContext(VoiceContext)
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider')
  }
  return context
}

export const VoiceProvider = ({ children }) => {
  const { socket } = useSocket()
  const { roomCode, playerName, room } = useGame()
  
  const [isMicEnabled, setIsMicEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [peers, setPeers] = useState({}) // { socketId: { name, connection, stream, isSpeaking, volume } }
  const [localStream, setLocalStream] = useState(null)
  const [audioError, setAudioError] = useState(null)
  
  const peerConnections = useRef({})
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const microphone = useRef(null)

  // Configuration WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // Initialiser le microphone
  const startMicrophone = async () => {
    try {
      console.log('🎤 Demande accès microphone...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      console.log('✅ Micro OK, tracks:', stream.getAudioTracks())
      
      setLocalStream(stream)
      setIsMicEnabled(true)
      setAudioError(null)

      // Analyse audio pour détecter quand on parle
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)()
      analyser.current = audioContext.current.createAnalyser()
      microphone.current = audioContext.current.createMediaStreamSource(stream)
      
      analyser.current.fftSize = 256
      microphone.current.connect(analyser.current)

      // Détection de parole
      detectSpeech()

      // Informer les autres joueurs
      if (socket && roomCode) {
        socket.emit('voice-ready', { roomCode, playerName })
      }

      return stream
    } catch (error) {
      console.error('Erreur micro:', error)
      setAudioError(error.message)
      setIsMicEnabled(false)
      return null
    }
  }

  // Arrêter le microphone
  const stopMicrophone = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    
    if (audioContext.current) {
      audioContext.current.close()
      audioContext.current = null
    }
    
    setIsMicEnabled(false)
    setIsSpeaking(false)

    // Fermer toutes les connexions peer
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}
    setPeers({})
  }

  // Détection de parole (analyse du volume)
  const detectSpeech = () => {
    if (!analyser.current) return

    const bufferLength = analyser.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const checkVolume = () => {
      if (!analyser.current) return

      analyser.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / bufferLength
      
      // Seuil de détection de parole
      const isSpeakingNow = average > 15
      setIsSpeaking(isSpeakingNow)

      // Informer les autres
      if (socket && roomCode) {
        socket.emit('voice-speaking', { 
          roomCode, 
          isSpeaking: isSpeakingNow,
          volume: average 
        })
      }

      requestAnimationFrame(checkVolume)
    }

    checkVolume()
  }

  // Créer une connexion peer
  const createPeerConnection = async (targetSocketId, isInitiator) => {
    if (peerConnections.current[targetSocketId]) {
      return peerConnections.current[targetSocketId]
    }

    const peerConnection = new RTCPeerConnection(rtcConfig)
    peerConnections.current[targetSocketId] = peerConnection

    // Ajouter le stream local
    if (localStream) {
      console.log('📤 Envoi du stream local vers', targetSocketId)
      localStream.getTracks().forEach(track => {
        console.log('  ↳ Track:', track.kind, track.label)
        peerConnection.addTrack(track, localStream)
      })
    } else {
      console.warn('⚠️ Pas de stream local à envoyer')
    }

    // Recevoir le stream distant
    peerConnection.ontrack = (event) => {
      console.log('🎧 Stream reçu de', targetSocketId, event.streams[0])
      const remoteStream = event.streams[0]
      
      // Vérifier que le stream a des tracks audio
      const audioTracks = remoteStream.getAudioTracks()
      console.log('🎵 Audio tracks:', audioTracks.length, audioTracks)
      
      setPeers(prev => ({
        ...prev,
        [targetSocketId]: {
          ...prev[targetSocketId],
          stream: remoteStream
        }
      }))
      
      console.log('✅ Stream assigné au peer', targetSocketId)
    }

    // Gestion des ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-ice-candidate', {
          roomCode,
          target: targetSocketId,
          candidate: event.candidate
        })
      }
    }

    // Si initiateur, créer l'offre
    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        
        socket.emit('voice-offer', {
          roomCode,
          target: targetSocketId,
          offer: peerConnection.localDescription
        })
      } catch (error) {
        console.error('Erreur création offre:', error)
      }
    }

    return peerConnection
  }

  // Synchroniser les peers avec les joueurs de la room
  useEffect(() => {
    if (!room || !room.players) return
    
    // Initialiser les peers avec tous les joueurs de la room
    const initialPeers = {}
    room.players.forEach(player => {
      if (player.name !== playerName) {
        // Chercher si on a déjà un peer pour ce joueur
        const existingPeer = Object.entries(peers).find(([_, p]) => p.name === player.name)
        if (existingPeer) {
          initialPeers[existingPeer[0]] = existingPeer[1]
        } else {
          // Créer un placeholder pour ce joueur
          initialPeers[player.id] = {
            name: player.name,
            isSpeaking: false,
            volume: 0,
            isMuted: false
          }
        }
      }
    })
    
    setPeers(initialPeers)
  }, [room?.players])

  // Événements Socket.io pour WebRTC
  useEffect(() => {
    if (!socket || !roomCode) return

    // Demande d'annonce (pour synchroniser)
    socket.on('voice-request-announce', ({ newSocketId, roomCode: reqRoomCode }) => {
      if (isMicEnabled && playerName) {
        socket.emit('voice-announce', {
          roomCode: reqRoomCode,
          playerName,
          targetSocketId: newSocketId
        });
      }
    });

    // Un nouveau joueur est prêt pour le voice
    socket.on('voice-user-ready', async ({ socketId, playerName: peerName }) => {
      if (socketId === socket.id) return
      
      console.log('Nouveau joueur vocal:', peerName)
      setPeers(prev => ({
        ...prev,
        [socketId]: { 
          ...prev[socketId],
          name: peerName, 
          isSpeaking: false, 
          volume: 0,
          isMuted: false
        }
      }))

      // Créer la connexion même sans micro local (mode écoute seule)
      await createPeerConnection(socketId, true)
    })

    // Recevoir une offre WebRTC
    socket.on('voice-offer', async ({ from, offer }) => {
      console.log('Offre reçue de', from)
      const pc = await createPeerConnection(from, false)
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        socket.emit('voice-answer', {
          roomCode,
          target: from,
          answer: pc.localDescription
        })
      } catch (error) {
        console.error('Erreur traitement offre:', error)
      }
    })

    // Recevoir une réponse WebRTC
    socket.on('voice-answer', async ({ from, answer }) => {
      console.log('Réponse reçue de', from)
      const pc = peerConnections.current[from]
      
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (error) {
          console.error('Erreur traitement réponse:', error)
        }
      }
    })

    // Recevoir un ICE candidate
    socket.on('voice-ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from]
      
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('Erreur ajout ICE candidate:', error)
        }
      }
    })

    // Détection de qui parle
    socket.on('voice-user-speaking', ({ socketId, isSpeaking, volume }) => {
      setPeers(prev => ({
        ...prev,
        [socketId]: {
          ...prev[socketId],
          isSpeaking,
          volume
        }
      }))
    })

    // Joueur quitte le vocal
    socket.on('voice-user-left', ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close()
        delete peerConnections.current[socketId]
      }
      
      setPeers(prev => {
        const newPeers = { ...prev }
        delete newPeers[socketId]
        return newPeers
      })
    })

    return () => {
      socket.off('voice-request-announce')
      socket.off('voice-user-ready')
      socket.off('voice-offer')
      socket.off('voice-answer')
      socket.off('voice-ice-candidate')
      socket.off('voice-user-speaking')
      socket.off('voice-user-left')
    }
  }, [socket, roomCode, localStream, isMicEnabled, playerName])

  // Toggle micro
  const toggleMicrophone = async () => {
    if (isMicEnabled) {
      stopMicrophone()
    } else {
      await startMicrophone()
    }
  }

  // Mute/unmute un peer spécifique
  const togglePeerMute = (socketId) => {
    setPeers(prev => ({
      ...prev,
      [socketId]: {
        ...prev[socketId],
        isMuted: !prev[socketId]?.isMuted
      }
    }))
  }

  // Cleanup
  useEffect(() => {
    return () => {
      stopMicrophone()
    }
  }, [])

  const value = {
    isMicEnabled,
    isSpeaking,
    peers,
    localStream,
    audioError,
    toggleMicrophone,
    togglePeerMute,
    startMicrophone,
    stopMicrophone
  }

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

