// Module Import
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
app.use(cors());

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;
const TIMEOUT_LIMIT = 200;  // *1/10초 대기시간
const FRAME_PER_SECOND = 60;
const MAX_PLAY_TIME = 180; // 180? 초

// Random System
const DECREASE_RATIO = 0.925;
const MIDDLE_WEIGHT = 1/10;
const LEASTLOOPFRAME = 30;
let minLoopFrame = 50;
let maxLoopFrame = 200;
let loopFrameArray = [];

let players = {}; // key: 플레이어 아이디, value: [대기 시간, 준비 여부, PlayerNumber, 생존 여부, 데이터 동기화 해야 하나요?, playerIndex]
let numToPlayers = {} // key: 플레이어 번호, value: 플레이어 아이디
let indexToPlayers = {} // key: 플레이어 인덱스, value: 플레이어 아이디
let activityCodes = '0'; // 아두이노가 다음 프레임에 해야할 일들

var isPlaying = false;
var isCounting = false;
var isVoicing = false;
var playFrame = 0;
var nextVoicePlayCode = 0;
var nextVoicePlaySpeed = 1;

var leftLoopFrame = 0;

// for arduino
const ARD_TIMEOUT_LIMIT = 300; // 1/10초 대기시간

var ardIsConnet = false; // 아두이노 연결 관련
var ardLastCheckFrame = 0; // 아두이노 연결 관련

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
  let people = 0;
  for (let playerId in players){
    people += 1;
  }
  return people;
};

/**
 * 플레이어 인덱스를 정리하는 함수
 * @param {Number} num 
 */
function ExitPlayerIndex(num){
  for (let i = num; i < NumOfPlayers() - 1; i++) {
    players[indexToPlayers[i+1]][5] = i
    indexToPlayers[i] = indexToPlayers[i+1]
  }
  delete indexToPlayers[NumOfPlayers() - 1];
}

/**
 * 두 실수 사이의 랜덤 값을 구하는 함수
 * @param {var} min
 * @param {var} max
 * @returns RandomNumber
 */
function Randoms(min, max){
  return (max-min)*Math.random()+min;
}

/**
 * 두 정수 사이의 랜덤 정수를 구하는 함수
 * @param {int} min 
 * @param {int} max 
 * @returns RandomInteger
 */
function Randomn(min, max){
  return Math.floor((max-min+1) * Math.random() + min);
}

/**
 * 배열의 평균 값을 반환하는 함수
 * @param {let} arr
 * @returns Average of Array
 */
function Averages(arr){
  var sum = 0;
  for (let e in arr) sum += e;
  return sum / arr.length;
}

/**
 * 다음 minLoopFrame, maxLoopFrame을 결정하는 함수
 * @returns void
 */
function NextRandom(){
  let a = Averages(loopFrameArray);
  let diff = maxLoopFrame - minLoopFrame;
  let mid = (maxLoopFrame + minLoopFrame) / 2;

  mid *= DECREASE_RATIO;
  diff *= DECREASE_RATIO;

  minLoopFrame = Math.max(mid - diff + (mid - a)*MIDDLE_WEIGHT, LEASTLOOPFRAME);
  maxLoopFrame = Math.max(mid + diff + (mid - a)*MIDDLE_WEIGHT, LEASTLOOPFRAME);
}

/**
 * nextVoicePlayFrame 을 무작위로 결정하고,
 * minVoiceFrame, maxVoiceFrame 결정하는 함수
 * @returns void
 */
function NextVoiceRandom(){
  nextVoicePlayCode = Randomn(0, 9);

  
}

/**
 * 게임 시작 카운트 다운을 시작하는 함수
 * @returns void
 */
function StartCount(){
  isCounting = true;
}

/**
 * 게임을 시작하는 함수 (Run only once)
 * @returns void
 */
function Start(){
  console.log("게임을 시작하겠습니다!");
  isCounting = false;
  isPlaying = true;
}

/**
 * 음성 시작 함수
 * @reruns void
 */
function DoVoice(){
  leftLoopFrame = Randoms(minLoopFrame, maxLoopFrame);
  console.log(`Voice! Next Loop Frame: ${leftLoopFrame}`);
  loopFrameArray.push(leftLoopFrame);

  activityCodes += '2'; // 음성을 재생
  activityCodes += '2'; // 모터 회전

  isVoicing = true;
  NextRandom();
}

/**
 * needToUpdate를 일괄적으로 조정하는 함수
 * @returns void
 */
function DoUpdate(){
  for (playerId in players){
    players[playerId][4] = true;
  }
}

/**
 * 플레이어의 연결을 확인하는 함수
 */
function CheckConnect(){
  for (let playerId in players) {
    if (players[playerId][0] <= 0) {
      console.log(`Player ${playerId} has been disconnected due to inactivity`);
      ExitPlayerIndex(players[playerId][5]);
      delete numToPlayers[players[playerId][2]];
      delete players[playerId];
    } else {
      players[playerId][0] -= 1;  // 연결 확인 시간이 경과할 때마다 감소
    }
  }
}

/**
 * 아두이노의 연결을 확인하는 함수
 */
function ArdCheckConnect(){
  ardLastCheckFrame = Math.max(0, ardLastCheckFrame - 1);
  if (ardLastCheckFrame > 0){
    ardIsConnet = true;
  } else {
    ardIsConnet = false;
  }
}

/**
 * 아두이노가 다음 프레임에 해야 할 일들을 추가하는 함수입니다.
 *
 * @description
 * - 0: 아무 행동 없음
 * - 1: 게임을 시작, 초기화 및 카운트다운 진행
 * - 2: 음성 재생 시작
 * - 3: 모터를 회전하여 벽을 바라봄
 * - 4: 모터를 회전하여 플레이어를 바라봄
 * - 5: 제한시간으로 인해 게임이 종료됨
 * - 6: 플레이어가 한 명 남아 게임이 종료됨
 */
function ArdActivityCodeAdd(){
  activityCodes += '0'
}

/**
 * 아두이노가 다음 프레임에 해야할 일들 제거 함수
 */
function ArdActivityCodeRemove(){
  activityCodes = '0'
}

/**
 * 우승자 발생 시 실행하는 함수
 */
function AvoidSurvive(){
  console.log("우승자가 발생하였습니다.");
  ResetUpdate();
}

/**
 * 게임이 종료되고 초기화하는 합수
 */
function ResetUpdate(){
  isPlaying = false;
  console.log("서버를 초기화 합니다.");
}

/**시작 전 인원 모집에 주기적으로 실행될 함수*/
function PlayOnReady(){
  CheckConnect();
  ArdCheckConnect();

  // 플레이어 모두가 준비되면 시작
  var temp = [];
  temp = ReadyPlayers();
  if (temp[0] == temp[1] && temp[1] >= MIN_PLAYERS){
    StartCount();
  }

  if (t === 0){
    console.log(players, temp, indexToPlayers, ardLastCheckFrame, ardIsConnet); 
  } // 현재 상태 로그로 남김
};


const COUNTDOWN_TIME = 4; // 카운트 다운 4초
let leftCountDownFrame = COUNTDOWN_TIME * FRAME_PER_SECOND;
/**카운트다운 중 주기적으로 실행될 함수*/
function PlayOnCounting(){
  if (leftCountDownFrame % FRAME_PER_SECOND == 0){
    console.log(leftCountDownFrame / FRAME_PER_SECOND, "초 남았습니다.");
  }
  
  if (leftCountDownFrame > 0){
    leftCountDownFrame -= 1;
    if (leftCountDownFrame === 0) console.log("곧 시작합니다!");
  } else {
    Start(); // Run only once
    leftLoopFrame = 10; // Default
    loopFrameArray.push(leftLoopFrame);
  }
};

/**게임 중 주기적으로 실행될 함수*/
function PlayOnGame(){
  playFrame += 1;

  if (playFrame % 6 == 0){
    console.log(`Current Game Frame: ${playFrame}`);
  }

  if (!isVoicing){ // 음성 재생 중이 아닐 때, 플레이어 움직임 가능 시간 감소
    if (leftLoopFrame > 0){
      leftLoopFrame -= 1;
    } else {
      DoVoice();
    }
  }

  /* Game Logic */
};


//////////////////////////////////////////////////
// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index2.html'));
  console.log(`${req.ip} 에서 메인 페이지에 접속하였습니다.`);
});

// 플레이어가 서버에 참여할 때
app.get('/join/:id', (req, res) => {
  const playerId = req.params.id;

  // 이미 연결된 플레이어의 아이디로 입장 불가
  if (playerId in players){
    return res.status(403).send('Id is already exist.');
  }

  // 최대 플레이어 수 초과 시 접속 불가
  if (Object.keys(players).length >= MAX_PLAYERS) {
    return res.status(403).send('Server is full.');
  }

  // 새로운 플레이어 추가 또는 기존 플레이어 시간 갱신
  players[playerId] = [TIMEOUT_LIMIT, false, undefined, false, true, NumOfPlayers()];
  indexToPlayers[NumOfPlayers() - 1] = playerId;
  res.json({'message':'200'});
  DoUpdate();
});

// 플레이어 번호 입력 inputNumber/abc?number=123
app.get('/inputNumber/:id', (req, res) => {
  const playerId = req.params.id;
  let number = req.query.number;

  // 이미 연결된 플레이어의 번호로 대응 불가
  if (number in numToPlayers){
    return res.status(403).send('Number is already exist.');
  }

  players[playerId][2] = number;
  numToPlayers[number] = playerId;
  DoUpdate();
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
    res.json({
      connect: true,
      needToUpdate: players[playerId][4]
    });
  } else {
    res.json({ connect: false });
  }
});

// 플레이어 데이터 요청, 아이디 필요.
app.get('/playerData/:id', (req, res) => {
  const playerId = req.params.id;

  if (!(playerId in players)){
    return res.status(404).send('PlayerID is not exist.');
  }

  res.json(players);
  players[playerId][4] = false;
});

// 플레이어 데이터 요청, 아이디 필요 없음.
app.get('/playerData', (req, res) => {
  res.json(players);
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


let nop = 0;
// 게임 상태 반환: 앱이 보내는 파트
app.get('/state', (req, res)=>{
  nop = NumOfPlayers();
  
  res.json({
    isPlaying: isPlaying,
    isVoicing: isVoicing,
    isCounting: isCounting,
    serverFPS: FRAME_PER_SECOND,
    leftCountDownFrame: leftCountDownFrame,
    numberOfPlayers: nop,
    playFrame: playFrame,
    timeLeft: MAX_PLAY_TIME - players/FRAME_PER_SECOND
  })
});

// 아두이노는 다음 프레임에 무엇을 실행해야 하나요? + 연결 확인
app.get('/ard', (req, res)=>{
  ardLastCheckFrame = ARD_TIMEOUT_LIMIT;
  ArdActivityCodeAdd();

  res.json({
    do: activityCodes,
    voiceCode: nextVoicePlayCode,
    voiceSpeed: nextVoicePlaySpeed
  });
  console.log('아두이노에서 신호가 왔습니다.');

  ArdActivityCodeRemove();
});

// 아두이노 음성 시작
app.get('/ardIsVoicing', (req, res) => {
  isVoicing = true;
  console.log("아두이노에서 음성을 재생하였습니다.");
  res.send("200");
});

/**
 * 아두이노 음성 종료
 * isVoicing -> !isVoicing 으로 바뀌는 프레임은 앱에서 알아서 판단
 */
app.get('/ardIsNotVoicing', (req, res) => {
  isVoicing = false;
  console.log("아두이노에서 음성을 종료하였습니다.");
  res.send("200");
});

/**
 * 아두이노에서 생존자 발생
 * /ardSurvive?number=123
 */
app.get('/ardSurvive', (req, res) => {
  var number = req.query.number;
  players[numToPlayers[number]][3] = true; // isSurvive
});

// 탈락한 플레이어 처리
app.get('/falled/:id', (req, res)=>{
  const playerId = req.params.id;
  if (playerId in players){
    delete numToPlayers[players[playerId][2]];
    delete players[playerId];
  }
});


// 서버 시작
app.listen(5522, () => {
  console.log('Express server running on port 5522');
});