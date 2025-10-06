import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { GameManager } from './gameLogic.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.json' assert { type: 'json' };

const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 5000;
// Allow multiple origins via env (comma-separated). Fallback to CLIENT_URL, then localhost in dev
const CLIENT_URL = process.env.CLIENT_URL;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

// Middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    // Allow non-browser requests (origin undefined) and any origin in the allowlist
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Game Manager
const gameManager = new GameManager();

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    rooms: gameManager.getRoomsCount(),
    players: gameManager.getPlayersCount(),
    allowedOrigins: ALLOWED_ORIGINS
  });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`🟢 Joueur connecté: ${socket.id}`);

  // Créer une nouvelle partie
  socket.on('create-room', ({ playerName }) => {
    const room = gameManager.createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit('room-created', room);
    console.log(`🎮 Partie créée: ${room.code} par ${playerName}`);
  });

  // Rejoindre une partie
  socket.on('join-room', ({ roomCode, playerName }) => {
    const result = gameManager.joinRoom(roomCode, socket.id, playerName);
    
    if (result.success) {
      socket.join(roomCode);
      socket.emit('room-joined', result.room);
      // Notifier tous les joueurs de la salle
      io.to(roomCode).emit('player-joined', {
        players: result.room.players,
        newPlayer: playerName
      });
      console.log(`👥 ${playerName} a rejoint la partie ${roomCode}`);
    } else {
      socket.emit('join-error', { message: result.message });
    }
  });

  // Démarrer la partie
  socket.on('start-game', ({ roomCode }) => {
    const room = gameManager.startGame(roomCode);
    if (room) {
      io.to(roomCode).emit('game-started', {
        startTime: room.startTime,
        currentRoom: room.currentRoom
      });
      console.log(`🚀 Partie ${roomCode} démarrée!`);
    }
  });

  // Soumettre une réponse à une énigme
  socket.on('submit-answer', ({ roomCode, roomNumber, answer, playerId }) => {
    const result = gameManager.checkAnswer(roomCode, roomNumber, answer);
    
    if (result.correct) {
      const room = gameManager.getRoom(roomCode);
      io.to(roomCode).emit('puzzle-solved', {
        roomNumber,
        nextRoom: room.currentRoom,
        message: result.message
      });
      
      // Vérifier si le jeu est terminé
      if (room.currentRoom > 4) {
        const gameResult = gameManager.endGame(roomCode);
        io.to(roomCode).emit('game-completed', gameResult);
        console.log(`🏆 Partie ${roomCode} terminée! Temps: ${gameResult.finalTime}s`);
      }
    } else {
      socket.emit('wrong-answer', { message: result.message });
    }
  });

  // Chat en temps réel
  socket.on('send-message', ({ roomCode, playerName, message }) => {
    io.to(roomCode).emit('new-message', {
      playerName,
      message,
      timestamp: Date.now()
    });
  });

  // Aide pour énigme coopérative (Salle 3)
  socket.on('share-clue', ({ roomCode, playerId, clueData }) => {
    socket.to(roomCode).emit('clue-shared', { playerId, clueData });
  });

  // === WebRTC Voice Chat Events ===
  
  // Joueur prêt pour le vocal
  socket.on('voice-ready', ({ roomCode, playerName }) => {
    // Informer tous les autres joueurs
    socket.to(roomCode).emit('voice-user-ready', {
      socketId: socket.id,
      playerName
    });
    
    // Envoyer au nouveau la liste des joueurs déjà en vocal
    const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        if (socketId !== socket.id) {
          // Demander aux autres de s'annoncer
          io.to(socketId).emit('voice-request-announce', {
            newSocketId: socket.id,
            roomCode
          });
        }
      });
    }
    
    console.log(`🎤 ${playerName} prêt pour le vocal dans ${roomCode}`);
  });

  // Réannoncer sa présence vocale
  socket.on('voice-announce', ({ roomCode, playerName, targetSocketId }) => {
    io.to(targetSocketId).emit('voice-user-ready', {
      socketId: socket.id,
      playerName
    });
  });

  // Offre WebRTC
  socket.on('voice-offer', ({ roomCode, target, offer }) => {
    io.to(target).emit('voice-offer', {
      from: socket.id,
      offer
    });
  });

  // Réponse WebRTC
  socket.on('voice-answer', ({ roomCode, target, answer }) => {
    io.to(target).emit('voice-answer', {
      from: socket.id,
      answer
    });
  });

  // ICE Candidate
  socket.on('voice-ice-candidate', ({ roomCode, target, candidate }) => {
    io.to(target).emit('voice-ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  // Détection de parole
  socket.on('voice-speaking', ({ roomCode, isSpeaking, volume }) => {
    socket.to(roomCode).emit('voice-user-speaking', {
      socketId: socket.id,
      isSpeaking,
      volume
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const result = gameManager.removePlayer(socket.id);
    if (result.roomCode) {
      io.to(result.roomCode).emit('player-left', {
        players: result.players,
        leftPlayer: result.playerName
      });
      // Notifier aussi pour le vocal
      io.to(result.roomCode).emit('voice-user-left', {
        socketId: socket.id
      });
      console.log(`🔴 ${result.playerName} a quitté la partie ${result.roomCode}`);
    }
    console.log(`🔴 Joueur déconnecté: ${socket.id}`);
  });
});

// Démarrage du serveur
httpServer.listen(PORT, () => {
  console.log(`\nAPI docs: http://localhost:${PORT}/docs`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promesse rejetée:', error);
});

