# 🎤 Guide du Chat Vocal

## 📋 Vue d'Ensemble

Le chat vocal utilise **WebRTC** (Web Real-Time Communication) pour permettre aux joueurs de communiquer par audio en temps réel pendant le jeu.

### ✨ Fonctionnalités

- ✅ **Communication audio P2P** (peer-to-peer)
- ✅ **Détection automatique** de qui parle
- ✅ **Indicateurs de volume** en temps réel
- ✅ **Mute individuel** par joueur
- ✅ **Contrôle du micro** (on/off)
- ✅ **Qualité optimisée** (réduction bruit, écho, auto-gain)
- ✅ **Support 2-4 joueurs** simultanés

---

## 🎮 Comment Utiliser

### 1️⃣ **Activer le Microphone**

Dans le jeu, cliquez sur le bouton **🎤 Micro** dans le header :

```
🔇 Micro  →  🎤 Micro
(Désactivé)   (Activé)
```

**Permissions requises :**
- Le navigateur demandera l'autorisation d'accéder au microphone
- Cliquez sur **"Autoriser"**

### 2️⃣ **Ouvrir le Panneau Vocal**

Cliquez sur **🎧 Vocal** pour voir :
- Votre statut (micro on/off)
- La liste des autres joueurs
- Qui parle en temps réel
- Les contrôles de volume

### 3️⃣ **Parler**

Quand votre micro est activé :
- **Parlez normalement** 🗣️
- Votre avatar **s'anime** quand vous parlez
- Les autres joueurs voient un **indicateur vert**
- Le volume est affiché en **barres**

### 4️⃣ **Couper le Son d'un Joueur**

Si un joueur fait trop de bruit :
- Ouvrez le panneau **🎧 Vocal**
- Cliquez sur **🔊 Son** à côté de son nom
- Il devient **🔇 Muet** (seulement pour vous)

---

## 🏗️ Architecture Technique

### Stack Utilisé

```
┌─────────────────────────────────────────────┐
│           Joueur A (Navigateur)             │
│  Micro → MediaStream → WebRTC Peer         │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Socket.io Server   │  ← Signalisation
        │  (Node.js)          │
        └──────────┬──────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Joueur B (Navigateur)             │
│  WebRTC Peer → Speaker (Audio)              │
└─────────────────────────────────────────────┘
```

### Composants

1. **VoiceContext.jsx** - Gestion WebRTC
   - Connexions peer-to-peer
   - Capture microphone
   - Détection de parole
   - Événements Socket.io

2. **VoiceChat.jsx** - Interface utilisateur
   - Liste des joueurs
   - Indicateurs visuels
   - Contrôles audio

3. **server/index.js** - Serveur de signalisation
   - Relayer les offres/réponses WebRTC
   - Gérer les ICE candidates
   - Synchroniser les états

### Flux de Connexion

```
1. Joueur A clique sur 🎤
   → getUserMedia() pour le micro
   → Émet 'voice-ready'

2. Serveur informe Joueur B
   → 'voice-user-ready'

3. Joueur B crée une offre WebRTC
   → Émet 'voice-offer' au serveur
   → Serveur relaie à Joueur A

4. Joueur A crée une réponse
   → Émet 'voice-answer'
   → Serveur relaie à Joueur B

5. Échange d'ICE candidates
   → Négociation de la connexion P2P

6. Connexion établie ✅
   → Audio en temps réel
```

---

## 🔧 Configuration

### Qualité Audio

Dans `VoiceContext.jsx` :

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,    // Réduction écho
    noiseSuppression: true,    // Réduction bruit
    autoGainControl: true      // Ajustement auto volume
  } 
})
```

### Seuil de Détection de Parole

```javascript
// Ligne ~98 de VoiceContext.jsx
const isSpeakingNow = average > 15  // Ajuster ce seuil (0-255)
```

### Serveurs STUN

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

---

## 🐛 Résolution de Problèmes

### ❌ "Permission refusée" / Micro ne s'active pas

**Causes possibles :**
- Permission micro refusée dans le navigateur
- Navigateur non compatible
- HTTPS requis (en production)

**Solutions :**
1. **Chrome :** Paramètres → Confidentialité → Microphone → Autoriser
2. **Firefox :** about:preferences#privacy → Permissions
3. **Localhost :** Fonctionne sans HTTPS
4. **Production :** HTTPS obligatoire pour getUserMedia()

### ❌ Les joueurs ne s'entendent pas

**Vérifications :**
1. Les deux joueurs ont activé leur micro (🎤 vert)
2. Le serveur backend tourne (port 5000)
3. Pas de pare-feu bloquant WebRTC
4. Vérifier la console (F12) pour erreurs

**Commandes debug :**
```javascript
// Dans la console navigateur
console.log('Peers:', peerConnections.current)
console.log('Local Stream:', localStream)
```

### ❌ Latence / Coupures audio

**Solutions :**
1. Vérifier la connexion Internet
2. Fermer applications gourmandes
3. Utiliser navigateur moderne (Chrome/Firefox/Edge)
4. Rapprocher du routeur WiFi

### ❌ Écho / Bruit de fond

**Solutions :**
1. Utiliser un **casque** (recommandé)
2. Réduire volume des haut-parleurs
3. Éloigner micro des haut-parleurs
4. Activer réduction de bruit (déjà activé par défaut)

---

## 🌐 Compatibilité Navigateurs

| Navigateur | Support WebRTC | getUserMedia | Recommandé |
|------------|---------------|--------------|------------|
| **Chrome** | ✅ Excellent | ✅ Oui | ⭐⭐⭐ |
| **Firefox** | ✅ Excellent | ✅ Oui | ⭐⭐⭐ |
| **Edge** | ✅ Excellent | ✅ Oui | ⭐⭐⭐ |
| **Safari** | ⚠️ Partiel | ⚠️ Limité | ⭐ |
| **Opera** | ✅ Bon | ✅ Oui | ⭐⭐ |

**Note :** Safari nécessite HTTPS même en local pour getUserMedia()

---

## 🔒 Sécurité & Vie Privée

### ✅ Bonnes Pratiques

1. **Peer-to-Peer :** Audio ne passe pas par le serveur
2. **Chiffrement :** WebRTC chiffre automatiquement (DTLS-SRTP)
3. **Permissions :** Demandées explicitement
4. **Pas de stockage :** Audio non enregistré
5. **Local :** Fonctionne sans serveur externe

### ⚠️ Limitations

- **Pas de contrôle parental**
- **Pas de modération automatique**
- **Pas d'enregistrement** (fonctionnalité future possible)

---

## 📊 Performances

### Bande Passante

| Nombre de Joueurs | Upload (par joueur) | Download (par joueur) |
|-------------------|---------------------|----------------------|
| 2 joueurs | ~50 Kbps | ~50 Kbps |
| 3 joueurs | ~100 Kbps | ~100 Kbps |
| 4 joueurs | ~150 Kbps | ~150 Kbps |

**Note :** Très faible consommation, compatible connexion mobile 4G

### Latence

- **Locale (même WiFi) :** 10-50ms
- **Internet (même ville) :** 50-100ms
- **Internet (longue distance) :** 100-200ms

---

## 🎯 Utilisation Recommandée

### Pour les Joueurs

✅ **DO**
- Utiliser un **casque** ou écouteurs
- Activer micro seulement quand nécessaire
- Tester audio avant de commencer
- Parler clairement et calmement

❌ **DON'T**
- Crier dans le micro
- Laisser musique/TV en fond
- Utiliser haut-parleurs (risque écho)

### Pour les Enseignants/Animateurs

1. **Tester avant** avec 2-3 joueurs
2. **Expliquer** comment activer/désactiver
3. **Avoir un plan B** (chat textuel disponible)
4. **Surveiller** comportements inappropriés

---

## 🔮 Améliorations Futures

### Possibles

- [ ] **Enregistrement** des parties
- [ ] **Modération** automatique (IA)
- [ ] **Transcription** temps réel
- [ ] **Effets audio** (robot, écho, etc.)
- [ ] **Push-to-talk** (maintenir pour parler)
- [ ] **Indicateur de connexion** (qualité réseau)
- [ ] **Mode spectateur** audio

---

## 📝 Code Exemple

### Activer le micro programmatiquement

```javascript
import { useVoice } from './context/VoiceContext'

function MyComponent() {
  const { toggleMicrophone, isMicEnabled } = useVoice()
  
  return (
    <button onClick={toggleMicrophone}>
      {isMicEnabled ? '🎤' : '🔇'} Micro
    </button>
  )
}
```

### Écouter qui parle

```javascript
const { peers, isSpeaking } = useVoice()

// Vous parlez ?
console.log('Je parle:', isSpeaking)

// Liste des joueurs qui parlent
Object.entries(peers).forEach(([id, peer]) => {
  if (peer.isSpeaking) {
    console.log(`${peer.name} parle`)
  }
})
```

---

## 🆘 Support

### Problème persiste ?

1. **Console navigateur (F12)** → Onglet Console
2. **Copier les erreurs** éventuelles
3. **Vérifier** que getUserMedia() fonctionne :
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(() => console.log('✅ Micro OK'))
     .catch(err => console.error('❌ Erreur:', err))
   ```

---

## 🌟 Conclusion

Le chat vocal WebRTC offre une **expérience immersive** pour les jeux coopératifs. Il est :

- ✅ **Gratuit** (pas de service tiers)
- ✅ **Rapide** (latence minimale)
- ✅ **Sécurisé** (chiffré E2E)
- ✅ **Simple** à utiliser
- ✅ **Performant** (faible bande passante)

**Profitez-en pour améliorer votre expérience de jeu ! 🎮🎤**

