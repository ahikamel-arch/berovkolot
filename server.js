const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

app.use(express.static('public'));

// 🎯 הגדרות סיום המשחק
const TARGET_SCORE = 15;  // 15 נקודות לניצחון
const MAX_QUESTIONS = 25; // 25 סיבובים מקסימום

const rawQuestions = [
  "למי הכי מתאים ליזום שיחה עם אדם זר באוטובוס?",
  "מי הראשון שיעשה אקזיט?",
  "מי תמיד רואה את חצי הכוס המלאה?",
  "מי ייתן לילדים שלו את הכול ויותר ממה שיש לו?",
  "מי מבין היושבים בחדר הכי סביר שישכח איפה הוא החנה את האוטו?",
  "מי הכי סביר שישרוד על אי בודד?",
  "מי הכי סביר שיאחר באיחור אופנתי לכל אירוע?",
  "מי הכי סביר שיעשה קניות ויקנה הכל חוץ ממה שהוא היה צריך?",
  "מי בחדר הכי סביר שיארגן טיול ספונטני באמצע הלילה?",
  "מי הכי סביר שיירדם באמצע סרט בקולנוע?",
  "מי הכי סביר שישבור את המסך של הטלפון תוך שבוע מקנייתו?",
  "מי הכי סביר שישכח את יום ההולדת של הורה או בן/בת זוג?",
  "מי הכי סביר שיתחיל להתווכח עם שוטר תנועה על דוח?",
  "מי הכי סביר שיבכה בסרט מצויר של דיסני?",
  "מי הכי סביר שישלח הודעה בקבוצה הלא נכונה בווטסאפ?",
  "מי הכי סביר שיהיה מעורב בתאונה קלה בחנייה?",
  "מי הכי סביר שיצליח להסתבך עם החוק בטעות מוחלטת?",
  "מי הכי סביר שיזמין משהו מוזר מאוד במסעדה ויתחרט מיד?",
  "מי הכי סביר שיעזוב הכל ויעבור לגור בחווה מבודדת?",
  "מי הכי סביר שיהפוך למשפיען רשת מפורסם?",
  "מי הכי סביר שיוציא את כל המשכורת שלו ביום שהיא נכנסת?",
  "מי הכי סביר שיביא אוכל מהבית לבית קפה?",
  "מי הכי סביר שיתקע מחוץ לבית בלי מפתחות?",
  "מי הכי סביר שייקח את הבדיחה רחוק מדי?",
  "מי הכי סביר שיקנה משהו רק כי היה עליו מבצע, בלי צורך בו?",
  "מי הכי סביר שישכח את הסיסמה לחשבון הבנק שלו?",
  "מי הכי סביר שיכנס לחדר וישכח למה הוא נכנס?",
  "מי הכי סביר שיאבד את הדרכון שלו יום לפני טיסה?",
  "מי הכי סביר שישתתף בתוכנית ריאליטי?",
  "מי הכי סביר שיחפש את המשקפיים/הטלפון כשהם כבר ביד שלו?"
];

// פונקציה לערבוב אקראי של מערך (Fisher-Yates Shuffle)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let activeQuestions = [];

function resetAndShuffleQuestions() {
  const shuffledText = shuffleArray(rawQuestions);
  activeQuestions = shuffledText.map((qText, index) => ({
    id: index + 1,
    type: "PLAYER_SELECT",
    text: qText
  }));
}

// ערבוב ראשוני עם הפעלת השרת
resetAndShuffleQuestions();

let playersMap = new Map();
let nextPlayerNumber = 1;
let currentQuestionIndex = 0;
let questionsPlayed = 0;

function getPlayersList() {
  return Array.from(playersMap.values())
    .map(p => ({
      id: p.id,
      number: p.number,
      name: p.name,
      score: p.score,
      hasVoted: p.currentVote !== null
    }))
    .sort((a, b) => b.score - a.score);
}

io.on('connection', (socket) => {
  socket.emit('update_players', getPlayersList());

  socket.on('join_game', (playerName) => {
    const newPlayer = {
      id: socket.id,
      number: nextPlayerNumber++,
      name: playerName,
      score: 0,
      currentVote: null
    };

    playersMap.set(socket.id, newPlayer);
    io.emit('update_players', getPlayersList());
  });

  socket.on('next_question', () => {
    playersMap.forEach(p => p.currentVote = null);

    const q = activeQuestions[currentQuestionIndex];
    questionsPlayed++;

    io.emit('new_question', {
      question: q,
      qIndex: questionsPlayed,
      total: MAX_QUESTIONS,
      players: getPlayersList()
    });
  });

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

  socket.on('restart_game', () => {
    playersMap.forEach(p => {
      p.score = 0;
      p.currentVote = null;
    });
    currentQuestionIndex = 0;
    questionsPlayed = 0;
    
    // ערבוב השאלות מחדש למשחק החדש
    resetAndShuffleQuestions();
    
    io.emit('update_players', getPlayersList());
    
    const q = activeQuestions[currentQuestionIndex];
    questionsPlayed++;
    io.emit('new_question', {
      question: q,
      qIndex: questionsPlayed,
      total: MAX_QUESTIONS,
      players: getPlayersList()
    });
  });

  socket.on('disconnect', () => {
    playersMap.delete(socket.id);
    io.emit('update_players', getPlayersList());
  });
});

function calculateResults() {
  const votes = {};

  playersMap.forEach(p => { votes[p.name] = 0; });
  playersMap.forEach(p => {
    if (p.currentVote) {
      votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
    }
  });

  let maxVotes = 0;
  for (const count of Object.values(votes)) {
    if (count > maxVotes) maxVotes = count;
  }

  const topVotedPlayers = [];
  if (maxVotes > 0) {
    for (const [candidate, count] of Object.entries(votes)) {
      if (count === maxVotes) topVotedPlayers.push(candidate);
    }
  }

  const isTie = topVotedPlayers.length !== 1;
  const winnerName = isTie ? null : topVotedPlayers[0];

  playersMap.forEach(p => {
    const votedForSelf = (p.currentVote === p.name);

    if (!isTie) {
      if (p.currentVote === winnerName) {
        p.score += votedForSelf ? 2 : 1;
      } else if (votedForSelf) {
        p.score = Math.max(0, p.score - 1);
      }
    } else {
      if (votedForSelf && !topVotedPlayers.includes(p.name)) {
        p.score = Math.max(0, p.score - 1);
      }
    }
  });

  const playersList = getPlayersList();
  const topPlayer = playersList[0];

  // בדיקת תנאי סיום (15 נקודות או 25 שאלות)
  const isGameOver = (topPlayer && topPlayer.score >= TARGET_SCORE) || questionsPlayed >= MAX_QUESTIONS;

  if (isGameOver) {
    io.emit('game_over', {
      winner: topPlayer,
      playersList: playersList
    });
  } else {
    io.emit('show_results', {
      winningVote: winnerName,
      isTie: isTie,
      votesCount: votes,
      playersList: playersList
    });
    currentQuestionIndex = (currentQuestionIndex + 1) % activeQuestions.length;
  }
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
