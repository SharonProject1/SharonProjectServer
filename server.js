// Module Import
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;
const TIMEOUT_LIMIT = 200;  // *1/10초 대기시간
const FRAME_PER_SECOND = 60;
const MAX_PLAY_TIME = 60; // 60? 초

let players = {}; // key: 플레이어 아이디, value: [대기 시간, 준비 여부]
let activityCodes = [0]; // 아두이노가 다음 프레임에 해야할 일들

var isPlaying = false;
var isCounting = false;
var isVoicing = false;
var playFrame = 0;

/**
 * 준비된 플레이어와 총 플레이어 수를 반환하는 함수
 * @returns [readyPlayer<int>, Player<int>]
 */
function ReadyPlayers(){
  var sum = 0;
  var people = 0;

  for (let playerId in players){
    people += 1;
    if(players[playerId][1]){
      sum += 1;
    }
  }
  return [sum, people];
};

/**
 * 총 플레이어 인원 수를 반환하는 함수
 * @returns Number of Players
 */
function NumOfPlayers(){
  var people = 0;
  for (let playerId in players){
    people += 1;
  }
  return people;
};

/**
 * 게임을 시작하는 함수
 * @returns void
 */
function Start(){
  isCounting = true;
}

/**플레이어의 연결을 확인하는 함수*/
function CheckConnect(){
  for (let playerId in players) {
    if (players[playerId][0] <= 0) {
      console.log(`Player ${playerId} has been disconnected due to inactivity`);
      delete players[playerId];
    } else {
      players[playerId][0] -= 1;  // 연결 확인 시간이 경과할 때마다 감소
    }
  }
}

/**시작 전 인원 모집에 주기적으로 실행될 함수*/
function PlayOnReady(){
  CheckConnect();

  // 플레이어 모두가 준비되면 시작
  var temp = [];
  temp = ReadyPlayers();
  if (temp[0] == temp[1] && temp[1] >= MIN_PLAYERS){
    Start();
  }

  console.log(players, temp);  // 현재 상태 로그로 남김
};


const COUNTDOWN_TIME = 5; // 카운트 다운 5초
let leftCountDownFrame = COUNTDOWN_TIME * FRAME_PER_SECOND;
/**카운트다운 중 주기적으로 실행될 함수*/
function PlayOnCounting(){
  if (leftCountDownFrame > 0){
    leftCountDownFrame -= 1;
  } else {
    isCounting = false;
    isPlaying = true;
  }
};

/**게임 중 주기적으로 실행될 함수*/
function PlayOnGame(){
  playFrame += 1;
  /* Game Logic */
};


//////////////////////////////////////////////////
// 메인 페이지
app.get('/', (req, res) => {
  res.send('Welcome To 무궁화 꽃 게임');
});

// 플레이어가 서버에 참여할 때
app.get('/join/:id', (req, res) => {
  const playerId = req.params.id;

  // 이미 연결된 플레이어의 아이디로 입장 불가
  if (playerId in players){
    return res.status(403).send('Id is already exist');
  }

  // 최대 플레이어 수 초과 시 접속 불가
  if (Object.keys(players).length >= MAX_PLAYERS) {
    return res.status(403).send('Server is full');
  }

  // 새로운 플레이어 추가 또는 기존 플레이어 시간 갱신
  players[playerId] = [TIMEOUT_LIMIT, false];
  res.send('200');
});

var t = 0;
// 주기적으로 코드를 실행 (추후 주기는 변경될 수 있음)
setInterval(() => {
  t = (t + 1) % FRAME_PER_SECOND // 0 <= t <= FPS-1
  
  if (!isPlaying && !isCounting){
    if (t % 6 == 0){ // 6프레임마다 실행
      PlayOnReady();
    }
  } 
  
  else if (isPlaying && !isCounting){
    PlayOnGame();
  } 
  
  else { // isCounting
    PlayOnCounting();
  }
}, 1000/FRAME_PER_SECOND);  // 100ms마다 실행 : 10FPS

// 플레이어 연결 상태 확인
app.get('/check/:id', (req, res) => {
  const playerId = req.params.id;

  // 연결된 플레이어인지 확인
  if (playerId in players) {
    players[playerId][0] = TIMEOUT_LIMIT;  // 플레이어 활동 시간 갱신
    res.json({ connect: true });
  } else {
    res.json({ connect: false });
  }
});

// 플레이어 준비 신호 반영
app.get('/ready/:id', (req, res) => {
  const playerId = req.params.id;
  if (playerId in players){
    players[playerId][1] = true;
    res.send("200: ready true");
  } else {
    res.send("404");
  }
});

// 플레이어 준비 취소 신호 반영
app.get('/notready/:id', (req, res) => {
  const playerId = req.params.id;
  if (playerId in players){
    players[playerId][1] = false;
    res.send("200: ready false");
  } else {
    res.send("404");
  }
});


// 게임 상태 반환: 앱이 보내는 파트
app.get('/state', (req, res)=>{
  let nop = 0;
  nop = NumOfPlayers();
  
  res.json({
    isPlaying: isPlaying,
    isVoicing: isVoicing,
    isCounting: isCounting,
    serverFPS: FRAME_PER_SECOND,
    leftCountDownFrame: leftCountDownFrame,
    numberOfPlayers: nop,
    playFrame: playFrame
  });
});

// 아두이노는 다음 프레임에 무엇을 실행해야 하나요?
app.get('/ard', (req, res)=>{
  res.json({
    do: activityCodes
  });
});

// 탈락한 플레이어 처리
app.get('/falled/:id', (req, res)=>{
  const playerId = req.params.id;
  if (playerId in players){
    delete players[playerId];
  }
});


// 서버 시작
app.listen(8080, () => {
  console.log('Express server running on port 8080');
});