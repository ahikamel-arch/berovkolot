const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// מאגר שאלות מורחב (חלקן מבוססות על שחקני החדר, חלקן אמריקאיות)
const questions = [
  { id: 1, type: "PLAYER_SELECT", text: "מי מבין היושבים בחדר הכי סביר שישכח איפה הוא החנה את האוטו?" },
  { id: 2, type: "PLAYER_SELECT", text: "מי הכי סביר שישרוד על אי בודד?" },
  { id: 3, type: "CHOICE", text: "מה הדבר הכי גרוע שיכול לקרות בדייט ראשון?", options: ["איחור של שעה", "שכח את הארנק", "דיבר רק על האקס/ית", "נתקע לו אוכל בשיניים"] },
  { id: 4, type: "PLAYER_SELECT", text: "מי הכי סביר שיאחר באיחור אופנתי לכל אירוע?" },
  { id: 5, type: "PLAYER_SELECT", text: "מי הכי סביר שיעשה קניות ויקנה הכל חוץ ממה שהוא היה צריך?" },
  { id: 6, type: "CHOICE", text: "איזה כוח-על הכי שווה לדעתכם?", options: ["תעופה", "רואה ולא נראה", "קריאת מחשבות", "מסע בזמן"] },
  { id: 7, type: "PLAYER_SELECT", text: "מי הכי סביר שיהיה מיליונר ראשון?" },
  { id: 8, type: "PLAYER_SELECT", text: "מי בחדר הכי סביר שיארגן טיול ספונטני באמצע הלילה?" },
  { id: 9, type: "CHOICE", text: "מה הפיצה הכי טעימה?", options: ["פטריות", "זיתים", "בצל", "פפרוני/נקניק"] },
  { id: 10, type: "PLAYER_SELECT", text: "מי בחדר הכי סביר שייקח את המיקרופון בקריוקי ולא ישחרר?" }
];

let players = {}; // socketId -> { id, number, name, score, currentVote }
let nextPlayerNumber = 1;
let currentQuestionIndex = 0;

function getPlayersList() {
  return Object.values(players).map(p => ({
    id: p.id,
    number: p.number,
    name: p.name,
    score: p.score,
    hasVoted: p.currentVote !== null
  }));
}

io.on('connection', (socket) => {

  // הצטרפות שחקן
  socket.on('join_game', (playerName) => {
    players[socket.id] = {
      id: socket.id,
      number: nextPlayerNumber++,
      name: playerName,
      score: 0,
      currentVote: null
    };

    // עדכון כל השחקנים ברשימה המעודכנת
    io.emit('update_players', getPlayersList());
  });

  // מעבר לשאלה הבאה / התחלת המשחק
  socket.on('next_question', () => {
    // איפוס הצבעות
    Object.keys(players).forEach(id => players[id].currentVote = null);

    const q = questions[currentQuestionIndex];
    io.emit('new_question', {
      question: q,
      qIndex: currentQuestionIndex + 1,
      total: questions.length,
      players: getPlayersList()
    });
  });

  // קבלת הצבעה
  socket.on('submit_vote', (vote) => {
    if (players[socket.id]) {
      players[socket.id].currentVote = vote;
    }

    const total = Object.keys(players).length;
    const votedCount = Object.values(players).filter(p => p.currentVote !== null).length;

    io.emit('update_players', getPlayersList());
    io.emit('vote_progress', { votedCount, total });

    // אם כולם הצביעו - חישוב תוצאות
    if (votedCount >= total && total > 0) {
      calculateResults();
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update_players', getPlayersList());
  });
});

function calculateResults() {
  const votes = {};

  Object.values(players).forEach(p => {
    if (p.currentVote) {
      votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let winningVote = '';

  for (const [vote, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winningVote = vote;
    }
  }

  // חלוקת נקודות
  Object.values(players).forEach(p => {
    if (p.currentVote === winningVote) {
      p.score += 10;
    }
  });

  io.emit('show_results', {
    winningVote,
    votesCount: votes,
    players: getPlayersList()
  });

  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
