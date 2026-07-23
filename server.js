const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

app.use(express.static('public'));

const questions = [
  { id: 1, type: "PLAYER_SELECT", text: "מי מבין היושבים בחדר הכי סביר שישכח איפה הוא החנה את האוטו?" },
  { id: 2, type: "PLAYER_SELECT", text: "מי הכי סביר שישרוד על אי בודד?" },
  { id: 3, type: "CHOICE", text: "מה הדבר הכי גרוע שיכול לקרות בדייט ראשון?", options: ["איחור של שעה", "שכח את הארנק", "דיבר רק על האקס/ית", "נתקע לו אוכל בשיניים"] },
  { id: 4, type: "PLAYER_SELECT", text: "מי הכי סביר שיאחר באיחור אופנתי לכל אירוע?" },
  { id: 5, type: "PLAYER_SELECT", text: "מי הכי סביר שיעשה קניות ויקנה הכל חוץ ממה שהוא היה צריך?" },
  { id: 6, type: "CHOICE", text: "איזה כוח-על הכי שווה לדעתכם?", options: ["תעופה", "רואה ולא נראה", "קריאת מחשבות", "מסע בזמן"] },
  { id: 7, type: "PLAYER_SELECT", text: "מי הכי סביר שיהיה מיליונר ראשון?" },
  { id: 8, type: "PLAYER_SELECT", text: "מי בחדר הכי סביר שיארגן טיול ספונטני באמצע הלילה?" }
];

let playersMap = new Map(); // socketId -> playerObj
let nextPlayerNumber = 1;
let currentQuestionIndex = 0;

function getPlayersList() {
  return Array.from(playersMap.values()).map(p => ({
    id: p.id,
    number: p.number,
    name: p.name,
    score: p.score,
    hasVoted: p.currentVote !== null
  }));
}

io.on('connection', (socket) => {
  console.log('שחקן התחבר:', socket.id);

  // שלח מיד את רשימת השחקנים הנוכחית למי שזה עתה התחבר
  socket.emit('update_players', getPlayersList());

  // הצטרפות שחקן
  socket.on('join_game', (playerName) => {
    const newPlayer = {
      id: socket.id,
      number: nextPlayerNumber++,
      name: playerName,
      score: 0,
      currentVote: null
    };

    playersMap.set(socket.id, newPlayer);

    // עדכן את *כולם* ברשימה החדשה
    io.emit('update_players', getPlayersList());
  });

  // התחלת משחק / שאלה הבאה
  socket.on('next_question', () => {
    // איפוס הצבעות
    playersMap.forEach(p => p.currentVote = null);

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
    const player = playersMap.get(socket.id);
    if (player) {
      player.currentVote = vote;
    }

    const totalList = getPlayersList();
    const total = totalList.length;
    const votedCount = Array.from(playersMap.values()).filter(p => p.currentVote !== null).length;

    io.emit('update_players', totalList);
    io.emit('vote_progress', { votedCount, total });

    if (votedCount >= total && total > 0) {
      calculateResults();
    }
  });

  socket.on('disconnect', () => {
    playersMap.delete(socket.id);
    io.emit('update_players', getPlayersList());
  });
});

function calculateResults() {
  const votes = {};

  playersMap.forEach(p => {
    if (p.currentVote) {
      votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let winningVote = 'אין הצבעות';

  for (const [vote, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winningVote = vote;
    }
  }

  // חלוקת נקודות
  playersMap.forEach(p => {
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
