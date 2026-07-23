const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// מאגר שאלות לדוגמה
const questions = [
  { id: 1, text: "מי מבין היושבים בחדר הכי סביר שישכח איפה הוא החנה את האוטו?" },
  { id: 2, text: "מה הדבר הכי גרוע שיכול לקרות בדייט ראשון?", options: ["איחור של שעה", "שכח את הארנק", "דיבר רק על האקס/ית", "נתקע לו אוכל בשיניים"] },
  { id: 3, text: "מי הכי סביר שישרוד על אי בודד?" }
];

let gameState = {
  players: {}, // socketId -> { name, score, currentVote }
  currentQuestionIndex: 0,
  status: 'LOBBY' // LOBBY, VOTING, RESULTS
};

io.on('connection', (socket) => {
  console.log('משתמש התחבר:', socket.id);

  // הצטרפות שחקן
  socket.on('join_game', (playerName) => {
    gameState.players[socket.id] = { name: playerName, score: 0, currentVote: null };
    io.emit('update_players', Object.values(gameState.players));
  });

  // התחלת משחק / שאלה הבאה
  socket.on('next_question', () => {
    gameState.status = 'VOTING';
    // איפוס הצבעות קודמות
    Object.keys(gameState.players).forEach(id => gameState.players[id].currentVote = null);
    
    const currentQ = questions[gameState.currentQuestionIndex];
    io.emit('new_question', { 
      question: currentQ, 
      qIndex: gameState.currentQuestionIndex + 1,
      total: questions.length 
    });
  });

  // קבלת הצבעה משחקן
  socket.on('submit_vote', (vote) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].currentVote = vote;
    }

    // בדיקה אם כולם הצביעו
    const totalPlayers = Object.keys(gameState.players).length;
    const votedCount = Object.values(gameState.players).filter(p => p.currentVote !== null).length;

    io.emit('vote_progress', { votedCount, totalPlayers });

    // אם כולם הצביעו - מחשבים תוצאות
    if (votedCount >= totalPlayers && totalPlayers > 0) {
      calculateResults();
    }
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    io.emit('update_players', Object.values(gameState.players));
  });
});

function calculateResults() {
  gameState.status = 'RESULTS';
  const votes = {};

  // ספירת הקולות
  Object.values(gameState.players).forEach(p => {
    if (p.currentVote) {
      votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
    }
  });

  // מציאת תשובת הרוב
  let maxVotes = 0;
  let winningVote = null;
  for (const [vote, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winningVote = vote;
    }
  }

  // חלוקת ניקוד למי שהצביע כמו הרוב
  Object.values(gameState.players).forEach(p => {
    if (p.currentVote === winningVote) {
      p.score += 10;
    }
  });

  io.emit('show_results', {
    winningVote,
    votesCount: votes,
    players: Object.values(gameState.players)
  });

  gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % questions.length;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));