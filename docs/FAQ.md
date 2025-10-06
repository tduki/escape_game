# ❓ FAQ - Questions Fréquentes

## Installation & Configuration

### Q : Le serveur ne démarre pas, erreur "Port 5000 already in use"

**R :** Un autre processus utilise le port 5000. Solutions :

**Windows :**
```bash
netstat -ano | findstr :5000
taskkill /PID <numéro_du_PID> /F
```

**Mac/Linux :**
```bash
lsof -ti:5000 | xargs kill -9
```

Ou changez le port dans `server/index.js` :
```javascript
const PORT = process.env.PORT || 5001;
```

---

### Q : Le client ne se connecte pas au serveur

**R :** Vérifiez que :
1. Le serveur tourne bien sur le port 5000
2. L'URL dans `client/src/context/SocketContext.jsx` est correcte :
   ```javascript
   const newSocket = io('http://localhost:5000', ...)
   ```
3. Pas de pare-feu bloquant le port 5000
4. En développement, le proxy Vite est configuré (voir `vite.config.js`)

---

### Q : Erreur "Module not found" après npm install

**R :** Essayez :
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

Si le problème persiste, vérifiez votre version de Node.js :
```bash
node --version  # Doit être >= 18.0.0
```

---

## Gameplay

### Q : Le timer ne se synchronise pas entre les joueurs

**R :** C'est normal s'il y a un décalage de 1-2 secondes dû au réseau. Le serveur est la source de vérité pour le temps. Si le décalage est important (>5s), vérifiez :
- La latence réseau
- Que tous les clients ont la même heure système (approximativement)

---

### Q : Une énigme ne s'ouvre pas après avoir résolu la précédente

**R :** Vérifiez dans la console du navigateur (F12) les erreurs. Causes possibles :
- Socket déconnecté (regarder l'état de connexion)
- Erreur dans le code de l'énigme
- Le serveur n'a pas émis l'événement `puzzle-solved`

Debug :
```javascript
socket.on('puzzle-solved', (data) => {
  console.log('Énigme résolue:', data);
});
```

---

### Q : Le chat ne fonctionne pas

**R :** Vérifiez que :
1. Le serveur reçoit les messages :
   ```javascript
   // Dans server/index.js, ajoutez :
   socket.on('send-message', ({ roomCode, playerName, message }) => {
     console.log(`Message de ${playerName}: ${message}`);
     ...
   });
   ```
2. Les événements Socket.io sont bien écoutés dans `Chat.jsx`
3. Le composant Chat est bien monté (visible à l'écran)

---

### Q : Quelles sont les réponses correctes aux énigmes ?

**R :** (Pour le debug uniquement)
- **Salle 1** : Dépend des choix (ex: 2940 pour voiture + boeuf + charbon)
- **Salle 2** : Automatique après les 8 paires trouvées
- **Salle 3** : "amazonie" (insensible à la casse)
- **Salle 4** : Le % de renouvelables (ex: "60")

Les réponses sont définies dans `server/gameLogic.js` → `getCorrectAnswers()`

---

## Multijoueur

### Q : Comment jouer avec des amis sur différents réseaux ?

**R :** En développement local, c'est limité au même réseau WiFi. Pour jouer à distance :

1. **Déployez le jeu** (voir section Déploiement)
2. Ou utilisez **ngrok** (tunnel local vers Internet) :
   ```bash
   npm install -g ngrok
   ngrok http 5000  # Pour le backend
   ngrok http 3000  # Pour le frontend
   ```
   Puis partagez les URLs générées.

---

### Q : Peut-on jouer à plus de 4 joueurs ?

**R :** Actuellement limité à 4 joueurs max. Pour changer :

`server/gameLogic.js` :
```javascript
if (room.players.length >= 6) {  // Changer de 4 à 6
  return { success: false, message: 'Partie complète (6 joueurs max)' };
}
```

`client/src/pages/Lobby.jsx` : Ajuster les slots vides

---

### Q : Un joueur a quitté, peut-on continuer ?

**R :** Oui, les autres joueurs peuvent continuer. Le jeu gère automatiquement les déconnexions. Seule la Salle 3 (coopérative) peut être plus difficile avec moins de joueurs.

---

## Technique

### Q : Comment déployer en production ?

**R :** Voir le guide complet dans [README.md](../README.md#-déploiement)

**Rapide :**

1. **Frontend (Vercel) :**
   ```bash
   cd client
   npm run build
   vercel deploy
   ```

2. **Backend (Render) :**
   - Créer un compte sur [Render.com](https://render.com)
   - Connecter votre repo GitHub
   - Sélectionner `server/` comme directory
   - Déployer

3. **Mettre à jour l'URL** :
   Dans `client/src/context/SocketContext.jsx` :
   ```javascript
   const newSocket = io('https://votre-backend.onrender.com', ...)
   ```

---

### Q : Comment ajouter une 5ème énigme ?

**R :** 
1. Créer `client/src/components/rooms/Room5.jsx`
2. Importer dans `client/src/pages/Game.jsx`
3. Ajouter dans le switch :
   ```javascript
   case 5:
     return <Room5 {...roomProps} />
   ```
4. Ajouter la réponse dans `server/gameLogic.js` → `getCorrectAnswers()`
5. Modifier `currentRoom > 4` en `currentRoom > 5` pour la condition de fin

---

### Q : Peut-on sauvegarder les parties ?

**R :** Actuellement, les parties sont en mémoire. Pour sauvegarder :

1. **Installer MongoDB** ou **PostgreSQL**
2. Créer un modèle Game
3. Sauvegarder à chaque événement important :
   ```javascript
   socket.on('puzzle-solved', async ({ roomCode }) => {
     await Game.updateOne({ code: roomCode }, { $inc: { solvedPuzzles: 1 } });
     ...
   });
   ```

---

### Q : Comment changer le thème visuel ?

**R :** Modifier `client/tailwind.config.js` :

```javascript
theme: {
  extend: {
    colors: {
      primary: '#10b981',  // Changer cette couleur
      secondary: '#3b82f6',
      danger: '#ef4444',
      dark: '#0f172a',
    }
  }
}
```

Couleurs recommandées :
- Bleu : `#3b82f6`
- Violet : `#8b5cf6`
- Rose : `#ec4899`
- Orange : `#f97316`

---

## Erreurs Courantes

### Q : "Cannot read property 'socket' of null"

**R :** Le contexte Socket n'est pas disponible. Causes :
1. Composant hors du `<SocketProvider>`
2. Socket pas encore initialisé

Solution : Ajouter une vérification :
```javascript
const { socket } = useSocket();

if (!socket) return <div>Connexion...</div>;
```

---

### Q : "Failed to load resource: net::ERR_CONNECTION_REFUSED"

**R :** Le serveur backend n'est pas démarré. Lancez :
```bash
cd server
npm start
```

---

### Q : Les animations ne fonctionnent pas

**R :** Framer Motion peut avoir des conflits. Vérifiez :
1. La version dans `client/package.json` : `"framer-motion": "^11.0.5"`
2. L'import : `import { motion } from 'framer-motion'`
3. La syntaxe :
   ```jsx
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
   >
     Contenu
   </motion.div>
   ```

---

### Q : Tailwind CSS ne s'applique pas

**R :** Vérifiez :
1. `tailwind.config.js` → `content` inclut vos fichiers :
   ```javascript
   content: ["./index.html", "./src/**/*.{js,jsx}"]
   ```
2. `index.css` contient les directives Tailwind :
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Redémarrez le serveur Vite après modification de la config

---

## Performance

### Q : Le jeu est lent sur mobile

**R :** Optimisations possibles :
1. Réduire les animations complexes
2. Lazy load des images
3. Désactiver Framer Motion sur mobile :
   ```javascript
   const isMobile = window.innerWidth < 768;
   const motionProps = isMobile ? {} : { initial: {...}, animate: {...} };
   ```

---

### Q : Combien de parties simultanées le serveur peut gérer ?

**R :** 
- **En dev local** : 10-20 parties (dépend de votre machine)
- **Serveur dédié (2GB RAM)** : 100+ parties
- **Avec Redis + Load Balancer** : 1000+ parties

---

## Éducatif

### Q : D'où viennent les données environnementales ?

**R :** Sources vérifiées :
- **Empreinte carbone** : ADEME (Agence de l'Environnement)
- **Pollution océanique** : Ocean Conservancy, UNESCO
- **Déforestation** : NASA, Global Forest Watch
- **Énergies** : AIE (Agence Internationale de l'Énergie)

Toutes les données sont de 2023-2024.

---

### Q : Peut-on personnaliser le contenu éducatif ?

**R :** Oui ! Modifiez :
- Les énigmes dans `client/src/components/rooms/`
- Le débriefing dans `client/src/pages/Debriefing.jsx`

Pour ajouter des sources, créez un fichier `docs/SOURCES.md`.

---

## Contribution

### Q : Comment contribuer au projet ?

**R :** 
1. Fork le repo sur GitHub
2. Créer une branche : `git checkout -b feature/ma-feature`
3. Commit : `git commit -m "Ajout de ma fonctionnalité"`
4. Push : `git push origin feature/ma-feature`
5. Ouvrir une Pull Request

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour plus de détails.

---

### Q : Puis-je réutiliser ce code pour mon propre projet ?

**R :** Oui ! Le projet est sous licence MIT. Vous pouvez :
- ✅ Utiliser pour des projets personnels/commerciaux
- ✅ Modifier le code
- ✅ Redistribuer

Obligation : Garder la mention de licence MIT.

---

## Divers

### Q : Y aura-t-il d'autres thèmes (Santé, Arts, etc.) ?

**R :** Le projet est conçu pour être modulaire. Pour ajouter un thème :
1. Créer 4 nouvelles énigmes adaptées au thème
2. Modifier les textes et visuels
3. Adapter le débriefing

Le code reste le même, seul le contenu change.

---

### Q : Peut-on ajouter un mode solo ?

**R :** Oui ! Modifications nécessaires :
1. Permettre de démarrer avec 1 joueur
2. Adapter la Salle 3 (coopérative) pour le solo
3. Ajuster la difficulté

---

### Q : Comment obtenir des statistiques de jeu ?

**R :** Ajoutez un système de tracking :
```javascript
// server/gameLogic.js
endGame(roomCode) {
  const room = this.rooms.get(roomCode);
  
  // Logger les stats
  console.log({
    players: room.players.length,
    time: (room.endTime - room.startTime) / 1000,
    puzzles: room.solvedPuzzles.length
  });
  
  // Sauvegarder dans une DB pour analytics
  // await Stats.create({ ... });
}
```

---

## Support

### Q : J'ai un problème non listé ici, que faire ?

**R :** 
1. Vérifier la [documentation complète](../README.md)
2. Chercher dans les [issues GitHub](https://github.com/votre-repo/issues)
3. Ouvrir une nouvelle issue avec :
   - Version Node.js (`node --version`)
   - OS (Windows/Mac/Linux)
   - Description du problème
   - Messages d'erreur (logs)
   - Étapes pour reproduire

---

**Dernière mise à jour : Octobre 2025**

Pour plus d'informations, consultez le [README.md](../README.md) ou l'[ARCHITECTURE.md](./ARCHITECTURE.md).

