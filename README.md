# 🖊️ Multiplayer Pen Fight Game (LAN IP)

A 2D multiplayer classroom **Pen Fight** game built with **Node.js, Express, Socket.io**, and **Matter.js** physics engine.

---

## 🎮 How to Play with your Friend

### 1. You (Host)
Open your web browser and navigate to:
```
http://localhost:3000
```

### 2. Your Friend (Opponent over Wi-Fi / Local Network)
Ensure both devices (laptops, PCs, or phones) are connected to the same Wi-Fi router / hotspot.
Your friend simply opens this link in their browser:
```
http://192.168.***.***:3000
```
---

## 🕹️ Controls & Rules

1. **Aim & Flick:**
   - On your turn, **click/touch and drag backwards** from your pen body.
   - An aiming trajectory line and power indicator will appear.
   - Release mouse/finger to flick the pen!
2. **Physics:**
   - Flicking closer to the nib or the cap adds rotational spin, just like real life pen fight!
   - Table edge friction slows pens down naturally.
3. **Winning:**
   - Push your opponent's pen completely off the wooden table desk.
   - First player to win **5 rounds** wins the match!

---

## ⚙️ How to Start the Server manually (in future)

In this directory:
```bash
npm start
```

