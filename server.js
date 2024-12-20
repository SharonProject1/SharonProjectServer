// Module Import
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
app.use(cors());

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;
const TIMEOUT_LIMIT = 50;  // *100ms 대기시간
const FRAME_PER_SECOND = 60;
const MAX_PLAY_TIME = 45; // 60? 초

// Random System
const DECREASE_RATIO = 0.945;
const MIDDLE_WEIGHT = 1/15;
const LEASTLOOPFRAME = 40;
let minLoopFrame = 50;
let maxLoopFrame = 200;
let loopFrameArray = [];

let players = {}; 
/** key: 플레이어 아이디, value: [0:대기 시간, 1:준비 여부, 
 * 2:PlayerNumber, 3:승리 여부, 4:데이터 동기화 해야 하나요?, 
 * 5:playerIndex, 6:생존 여부, 7:플레이 프레임, 
 * 8:플레이 중 연결 여부]
 */
let numToPlayers = {} // key: 플레이어 번호, value: 플레이어 아이디
let indexToPlayers = {} // key: 플레이어 인덱스, value: 플레이어 아이디
let activityCodes = '0'; // 아두이노가 다음 프레임에 해야할 일들

var isUpdating = false;
var isRunning = false;
var isCounting = false;
var isVoicing = false;
var playFrame = 0;
var nextVoicePlayCode = 0;
var nextVoicePlaySpeed = 1;
var playOnce = false;
var trialCount = 1;

var leftLoopFrame = 0;

// for arduino
const ARD_TIMEOUT_LIMIT = 300; // 1/10초 대기시간

var ardIsConnet = false; // 아두이노 연결 관련
var ardLastCheckFrame = 0; // 아두이노 연결 관련

let lastResultData = [];

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
 * 생존해있지만 우승하지는 않은 플레이어의 수를 반환하는 함수
 * @returns Number of Alive and Not Survive Players
 */
function NumOfAlivePlayers(){
  let people = 0;
  for (let playerId in players){
    if (players[playerId][6] && !players[playerId][3]){
      people += 1;
    }
  }
  return people;
}

/**
 * 플레이어 데이터 json을 Array로 변환합니다.
 * @returns playerArray
 */
function TransformData(){
  let playerArray = [];

  if (NumOfPlayers() != 0){
    for (let playerId in players){
      playerArray.push([playerId, players[playerId][2] === '0' ? "NaN" : players[playerId][2].toString(), players[playerId][1] ? "true" : "false", players[playerId][6] ? "true" : "false", players[playerId][3] ? "true" : "false"]);
    }
    return playerArray;
  } else {
    return [[]];
  }
}

/**
 * 플레이어 아이디에 해당하는 배열을 0번 인덱스로 옮기는 함수
 * @param {string} ids - 이동할 플레이어 아이디
 * @param {Array} arr - 2차원 배열
 * @returns {Array} - 수정된 배열
 */
function FirstIdTrans(ids, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][0] === ids) {
      const [item] = arr.splice(i, 1); // i 번째 요소를 제거하고 저장
      arr.unshift(item); // 제거한 요소를 배열의 앞에 삽입
      return arr;
    }
  }
  return arr;
}


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
 * 배열의 평균 값을 반환하는 함수
 * @param {Array<number>} arr - 숫자 배열
 * @returns {number} 배열의 평균 값
 */
function Averages(arr) {
  let sum = 0;
  for (let e of arr) {
    sum += e;
  }
  return sum / arr.length;
}

/**
 * 다음 minLoopFrame, maxLoopFrame을 결정하는 함수
 * @returns void
 */
function NextRandom(){
  let a = Averages(loopFrameArray);
  let diff = (maxLoopFrame - minLoopFrame) / 2;
  let mid = (maxLoopFrame + minLoopFrame) / 2;

  mid *= DECREASE_RATIO;
  diff *= DECREASE_RATIO;

  minLoopFrame = Math.max(mid - diff + (mid - a)*MIDDLE_WEIGHT, LEASTLOOPFRAME);
  maxLoopFrame = Math.max(mid + diff + (mid - a)*MIDDLE_WEIGHT, LEASTLOOPFRAME);
}


/**
 * 다음 음성의 속도를 무작위로 결정하는 함수
 * @param {Number} trial 
 * @param {*} maxTrials 
 * @param {*} biasFactor 
 * @param {*} sharpness 
 * @returns 
 */
function NextVoiceRandom(trial, maxTrials = 6, biasFactor = 1.5, sharpness = 1.05) {
  // 초기 범위 설정
  const startRange = 8;
  let endRange = 23;

  // 시행 횟수 기반 변화 함수
  const f_t = Math.pow(trial / maxTrials, -1 / sharpness);

  // 가중치 계산
  const weights = [];
  const numbers = [];
  for (let num = startRange; num <= endRange; num++) {
      const weight = Math.abs(Math.pow((endRange - num + 1) / (endRange - startRange + 1), f_t / biasFactor) *
                     Math.pow(1 - trial / 25, Math.pow(24 - num, 1.25)));
      weights.push(weight);
      numbers.push(num);
  }

  console.log(weights);

  // 랜덤 선택 (가중치 기반)
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  const randomValue = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (let i = 0; i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
          return numbers[i];
      }
  }
};

/**
 * 작은 값 부터 큰 값 순으로 정렬
 * @param {Array} arr 
 * @returns rightSortedArray
 */
function SortRight(arr){
  if (arr == []){
    return [];
  }
  var result = [];

  for (let i = 0; i < arr.length; i++) {
    if (result.length === 0){
      result.push(arr[i]);
    } else {
      for (let j = 0; j < result.length; j++) {
        if (result[j][4] > arr[i][4]){
          result.splice(j, 0, arr[i]);
          break;
        }
        if (j == result.length - 1){
          result.push(arr[i]);
          break;
        }
      }
    }
  }

  for (let count = 1; count < result.length + 1; count++) {
    result[count-1][1] = count.toString();
    result[count-1][4] = Math.floor(result[count-1][4] / FRAME_PER_SECOND).toString() + 's';
  }

  return result;
}

/**
 * 큰 값 부터 작은 값 순으로 정렬
 * @param {Array} arr 
 * @returns reverseSortedArray
 */
function SortReverse(arr){
  if (arr == []){
    return [];
  }

  var result = [];

  for (let i = 0; i < arr.length; i++) {
    if (result.length === 0){
      result.push(arr[i]);
    } else {
      for (let j = 0; j < result.length; j++) {
        if (result[j][4] < arr[i][4]){
          result.splice(j, 0, arr[i]);
          break;
        }
        if (j == result.length - 1){
          result.push(arr[i]);
          break;
        }
      }
    }
  }

  for (let count = 0; count < result.length; count++) {
    result[count][1] = (count + a.length + 1).toString();
    result[count][4] = Math.floor(result[count][4] / FRAME_PER_SECOND).toString() + 's';
  }

  return result;
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
  isRunning = true;
}

/**
 * 음성 시작 함수
 * @reruns void
 */
function DoVoice(){
  leftLoopFrame = Randoms(minLoopFrame, maxLoopFrame);
  console.log(`Voice! Next Loop Frame: ${leftLoopFrame} min: ${minLoopFrame}, max: ${maxLoopFrame}`);
  loopFrameArray.push(leftLoopFrame);
  nextVoicePlayCode = NextVoiceRandom(trialCount++);
  console.log(`다음은 ${nextVoicePlayCode} 번으로 전송합니다.`);

  activityCodes += '2'; // 음성을 재생

  NextRandom();
}

/**
 * needToUpdate를 일괄적으로 조정하는 함수
 * @returns void
 */
function DoUpdate(){
  for (let playerId in players){
    players[playerId][4] = true;
  }
}

/**
 * 플레이어의 연결을 확인하는 함수
 */
function CheckConnect(){
  for (let playerId in players) {
    if (players[playerId][0] <= 0) {
      if (isRunning){
        if (!players[playerId][8]) continue;
        console.log(`Player ${playerId} has been FAILED due to inactivity`);
        players[playerId][3] = false;
        players[playerId][6] = false;
        players[playerId][8] = false;
      } else { // 게임 중이 아닐 때 나간 것
      console.log(`Player ${playerId} has been disconnected due to inactivity`);
      DoUpdate();
      ExitPlayerIndex(players[playerId][5]);
      delete numToPlayers[players[playerId][2]];
      delete players[playerId];
      }
    } else {
      if (!isCounting){
        players[playerId][0] -= 1;  // 연결 확인 시간이 경과할 때마다 감소
      }
    }
  }
}


let a = [];
let b = [];
let c = [];
/**
 * 게임 결과 데이터를 제작합니다.
 * @returns resultArray
 */
function ResultArray(){
  a = [];
  b = [];
  c = [];

  for (let playerId in players){
    if (players[playerId][8] && players[playerId][3]){
      a.push(["Survived", "-", players[playerId][2], playerId, players[playerId][7]]);
    } else if (players[playerId][8] && !players[playerId][3]){
      b.push(["Failed", "-", players[playerId][2], playerId, players[playerId][7]])
    } else {
      c.push(["Disconnected", '-', players[playerId][2], playerId, '-']);
    }
  }

  a = SortRight(a);
  b = SortReverse(b);

  return [...a, ...b, ...c]; // 2차원 배열 스프레드
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
 * - 6: 더이상 플레이 중인 (=생존해 있지만 우승하지는 못한) 플레이어가 없어서 게임이 종료됨
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
 * 게임이 종료되고 나서 초기화하는 합수
 * 주의: resultData는 남아 있음.
 */
function ResetUpdate(){
  minLoopFrame = 50;
  maxLoopFrame = 200;
  loopFrameArray = [];
  players = {}; 
  numToPlayers = {}
  indexToPlayers = {}
  activityCodes = '0';
  isRunning = false;
  isCounting = false;
  isVoicing = false;
  playFrame = 0;
  leftCountDownFrame = COUNTDOWN_TIME * FRAME_PER_SECOND;
  nextVoicePlayCode = 0;
  nextVoicePlaySpeed = 1;
  leftLoopFrame = 0;
  t = 0;
  isUpdating = false;
  playOnce = false;
  trialCount = 1;
  console.log("===============================");
  console.log("===== 게임을 초기화 하였습니다. =====");
  console.log("===============================");
}

/**
 * 게임을 종료하는 함수
 */
function GameEnd(){
  isRunning = false;
  isUpdating = true;
  console.log("게임을 종료합니다.");

  lastResultData = ResultArray();
  ResetUpdate();
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

  if (t === 0 && NumOfPlayers() != 0){
    console.log(players, temp, indexToPlayers, ardLastCheckFrame, ardIsConnet); 
  } // 현재 상태 로그로 남김
};


const COUNTDOWN_TIME = 8; // 카운트 다운 8초
let leftCountDownFrame = COUNTDOWN_TIME * FRAME_PER_SECOND;
/**
 * 카운트다운 중 주기적으로 실행될 함수
 */
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

  if (leftCountDownFrame === 300){
    activityCodes += '1';
    console.log('1 코드 추가.');
  }
};

/**
 * 게임 중 주기적으로 실행될 함수
 */
function PlayOnGame(){
  playFrame += 1;

  if (playFrame % 6 == 0){
    CheckConnect();
    if (playFrame % 60 == 0){
      console.log(`Current Game Frame: ${playFrame}`);
    }
  }

  // 게임 시간이 초과되었을 때 게임 종료
  if (playFrame === MAX_PLAY_TIME * FRAME_PER_SECOND){
    // 시간초과된 플레이어의 상태를 갱신합니다.
    for (let playerId in players){
      if (!players[playerId][3] && players[playerId][6]){
        players[playerId][6] = false;
        players[playerId][7] = playFrame;
      }
    }

    GameEnd();
    activityCodes += '5';
    return 0;
  }

  // 더이상 우승자가 나올 가능성이 없을 때 게임 종료
  if (NumOfAlivePlayers() === 0){
    GameEnd();
    activityCodes += '6';
    return 0;
  }


  if (!isVoicing){ // 음성 재생 중이 아닐 때, 플레이어 움직임 가능 시간 감소
    if (leftLoopFrame > 0){
      leftLoopFrame -= 1;
    } else {
      if (!playOnce){
        DoVoice();
        playOnce = true;
      }
    }
  }

  /* Game Logic */
};


var t = 0;
// 주기적으로 코드를 실행
setInterval(() => {
  t = (t + 1) % FRAME_PER_SECOND // 0 <= t <= FPS-1

  if (!isUpdating){
    if (!isRunning && !isCounting){
      if (t % 6 == 0){ // 6프레임마다 실행
        PlayOnReady();
      }
    } 
    
    else if (isRunning && !isCounting){
      PlayOnGame();
    } 
    
    else { // isCounting
      PlayOnCounting();
    }
  }
}, 1000/FRAME_PER_SECOND);  // 100ms마다 실행 : 10FPS

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public')));

//////////////////////////////////////////////////
// 메인 페이지
app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'views', 'index2.html'));
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

  if (isRunning){
    return res.status(403).send('Game is playing.');
  }

  // 새로운 플레이어 추가 또는 기존 플레이어 시간 갱신
  players[playerId] = [TIMEOUT_LIMIT, false, '0', false, true, NumOfPlayers(), true, 0, true];
  indexToPlayers[NumOfPlayers() - 1] = playerId;
  res.status(200).send(`You join server ${playerId}`);
  DoUpdate();
  console.log(`${req.ip} 에서 join 요청을 보냈습니다. ID: ${playerId}`);
});

// 플레이어 번호 입력 inputNumber/abc?number=123
app.get('/inputNumber/:id', (req, res) => {
  const playerId = req.params.id;
  let number = req.query.number.toString();

  // 이미 연결된 플레이어의 번호로 대응 불가
  if (number in numToPlayers){
    return res.status(403).json({
      string :'Number is already exist.'
    });
  }

  console.log(`${req.ip} 에서 inputNumber 요청을 시작했습니다.`);

  players[playerId][2] = number;
  numToPlayers[number] = playerId;
  DoUpdate();
  res.status(200).json({
    string: "Success Request."
  });
  console.log(`${req.ip} 에서 inputNumber 요청을 보냈습니다. ID: ${playerId}, ${number}`);
});

// 플레이어 연결 상태 확인
app.get('/check/:id', (req, res) => {
  const playerId = req.params.id;

  // 연결된 플레이어인지 확인
  if (playerId in players) {
    players[playerId][0] = TIMEOUT_LIMIT;  // 플레이어 활동 시간 갱신
    res.status(200).json({
      connect: "true",
      needToUpdate: players[playerId][4],
      string: `test ${t}`
    });
  } else {
    res.status(206).json({ connect: "false" });
  }
});

// 플레이어 데이터 요청, 아이디 필요.
app.get('/playerData/:id', (req, res) => {
  const playerId = req.params.id;

  if (!(playerId in players)){
    console.log(`${req.ip} 에서 플레이어 데이터를 요청하였으나 오류입니다. ID: ${playerId}`);
    return res.status(404).send('PlayerID is not exist.');
  }
  
  let temp_p = FirstIdTrans(playerId, TransformData());

  if (players[playerId][4]){
    players[playerId][4] = false;
    res.status(200).json({data: temp_p});
    console.log(`${req.ip} 에서 플레이어 데이터를 요청하였습니다. ID: ${playerId}`);
  } else {
    res.status(206).json({data: temp_p});
    console.log(`${req.ip} 에서 플레이어 데이터를 요청하였으나 불필요한 요청입니다. ID: ${playerId}`);
  }
});

// 플레이어 데이터 요청, 아이디 필요 없음.
app.get('/playerData', (req, res) => {
  res.status(200).json({data: TransformData()});
  console.log(`${req.ip} 에서 플레이어 데이터를 요청하였습니다.`);
});

// 플레이어 준비 신호 반영
app.get('/ready/:id', (req, res) => {
  const playerId = req.params.id;
  if (playerId in players){
    players[playerId][1] = true;
    res.status(200).json({
      string: "200: ready true"
  });
  DoUpdate();
  } else {
    res.status(404).json({
      string: "Player is not exist."
    });
  }
  console.log(`${req.ip} 에서 ready 신호를 보냈습니다. ID: ${playerId}`);
});

// 플레이어 준비 취소 신호 반영
app.get('/notReady/:id', (req, res) => {
  const playerId = req.params.id;
  if (playerId in players){
    players[playerId][1] = false;
    res.status(200).json({
      string: "200: ready false"
    });
    DoUpdate();
  } else {
    res.status(404).json({
      string: "Player is not exist."
    });
  }
  console.log(`${req.ip} 에서 notReady 신호를 보냈습니다. ID: ${playerId}`);
});

// 게임이 시작되었는지 반환 (<boolean>)
app.get('/isRunning', (req, res) => {
  res.status(200).json({data: !isRunning && isCounting});
  console.log(`${req.ip} 에서 isRunning 신호를 보냈습니다. ${!isRunning && isCounting}`);
});

// 게임이 시작되었는지 반환 (<boolean>)
app.get('/isRunning/:id', (req, res) => {
  const playerId = req.params.id;

  res.status(200).json({data: !isRunning && isCounting});
  console.log(`${req.ip} 에서 isRunning 신호를 보냈습니다. ${!isRunning && isCounting}, ${playerId}`);
});

let nop = 0;
// 게임 상태 반환: 앱이 보내는 파트
app.get('/state', (req, res)=>{
  nop = NumOfPlayers();
  let noap = NumOfAlivePlayers();

  res.status(200).json({
    data: [
      isRunning.toString(), 
      isVoicing.toString(), 
      isCounting.toString(), 
      FRAME_PER_SECOND.toString(),
      leftCountDownFrame.toString(),
      nop.toString(),
      noap.toString(),
      playFrame.toString(),
      Math.floor(MAX_PLAY_TIME - playFrame/FRAME_PER_SECOND).toString()
    ]
  });

  console.log(`${req.ip} 에서 state 요청을 보냈습니다. isVoicing ${isVoicing}`);
});

// 아두이노는 다음 프레임에 무엇을 실행해야 하나요? + 연결 확인
app.get('/ard', (req, res)=>{
  ardLastCheckFrame = ARD_TIMEOUT_LIMIT;
  ArdActivityCodeAdd();

  res.status(200).json({
    do: activityCodes.toString(),
    voiceCode: nextVoicePlayCode.toString(),
    voiceSpeed: nextVoicePlaySpeed.toString()
  });

  ArdActivityCodeRemove();
});

// 아두이노 음성 시작
app.get('/ardIsVoicing', (req, res) => {
  isVoicing = true;
  console.log("아두이노에서 음성을 재생하였습니다.");
  res.status(200).json({string: "abcd"});
});

/**
 * 아두이노 음성 종료
 * isVoicing -> !isVoicing 으로 바뀌는 프레임은 앱에서 알아서 판단
 */
app.get('/ardIsNotVoicing', (req, res) => {
  isVoicing = false;
  playOnce = false;
  console.log("아두이노에서 음성을 종료하였습니다.");
  res.status(200).json({string: "abcd"});
});

// 아두이노 행동코드 테스트 
app.get('/ardTest/:number', (req, res) => {
  const tempNumber = req.params.number;

  if (tempNumber.toString() === '10'){
    DoVoice();
    return res.status(200).send(`${tempNumber} 추가 완료.`);
  }

  activityCodes += tempNumber.toString();
  res.status(200).send(`${tempNumber} 추가 완료.`);

  console.log(`${req.ip} 에서 ready 신호를 보냈습니다. activityCodes: ${activityCodes}`);

});

// 승리한 플레이어 처리
app.get('/survived/:id', (req, res) => {
  const playerId = req.params.id;

  if (!(playerId in players)){
    return res.status(404).json({
      string: 'The playerId is not exist.'
    });
  }

  if (!players[playerId][6]){
    return res.status(403).json({
      string: 'Player is already dead.'
    });
  }

  if (!players[playerId][3]){
    players[playerId][3] = true;
    players[playerId][7] = playFrame;
    return res.status(200).json({
      string:`Success Request. ${playerId} Player is Survived.`
    });
  } else {
    return res.status(403).json({
      string: 'Player is already Survived.'
    });
  }
});

// 탈락한 플레이어 처리
app.get('/failed/:id', (req, res) => {
  const playerId = req.params.id;

  if (players[playerId][3]){
    return res.status(403).json({
      string : 'Player is already Survived.'
    });
  }

  if (!players[playerId][6]){
    return res.status(403).json({
      string : 'Player is already Dead.'
    });
  }

  if (playerId in players){
    players[playerId][3] = false; // 승리 여부 false
    players[playerId][6] = false; // 생존 여부 false

    players[playerId][7] = playFrame;
    res.status(200).json({
      string: `Success Request. ${playerId} Player is failed.`
    });
  } else {
    return res.status(404).json({
      string: "Player is not exist."
    });
  }
});

app.get('/resultData', (req, res) => {
  res.status(200).json({data: lastResultData});
  console.log(`${req.ip} 에서 게임 결과 데이터를 요청하였습니다.`);
});


// 서버 시작
app.listen(5522, () => {
  console.log('Express server running on port 5522');
});
