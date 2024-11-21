# 🌸 **무궁화 꽃 게임 서버** 🌸

이 서버는 Express를 사용하여 **"무궁화 꽃이 피었습니다"** 게임의 멀티플레이어 상호작용을 처리합니다. 플레이어의 접속, 게임 상태 관리, 준비 상태 체크 등을 지원합니다.

---

## 🖥️ **서버 주소 및 기본 포트**
- **`http://sharonproject.ddns.net:5522/`**

---

## 🌐 **API 엔드포인트**

### 🔖 **메인 페이지**

- **`GET /`**  
  - 서버 베이스 페이지를 반환합니다.

---

### 👤 **플레이어 관련 엔드포인트**

- **`GET /join/:id`**  
  - 서버에 플레이어를 추가합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자
  - **응답**:
    - ✅ `200`: 성공적으로 참가
    - 🚫 `403`: 이미 존재하는 ID이거나 서버가 가득 찬 경우

- **`GET /inputNumber/:id?number=123`**  
  - 서버에 플레이어에 대한 등 번호를 반영합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자  
  - **쿼리**: `number` - 플레이어의 등 번호  
  - **응답**:
    - ✅ `200`: 성공적으로 등록됨
    - 🚫 `403`: 이미 존재하는 등 번호

- **`GET /check/:id`**  
  - 플레이어가 여전히 연결되어 있는지 확인하고, 대기 시간을 초기화합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자  
  - **응답**:  
    - 연결됨: `{ connect: true, needToUpdate: <boolean> }`  
    - 연결되지 않음: `{ connect: false }`

- **`GET /ready/:id`**  
  - 플레이어의 준비 상태를 `true`로 설정합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자  
  - **응답**:
    - ✅ `200`: 준비 상태가 `true`로 설정됨
    - 🚫 `404`: 플레이어를 찾을 수 없음

- **`GET /notready/:id`**  
  - 플레이어의 준비 상태를 `false`로 설정합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자  
  - **응답**:
    - ✅ `200`: 준비 상태가 `false`로 설정됨
    - 🚫 `404`: 플레이어를 찾을 수 없음
   
- **`GET /survived/:id`**
  - 승리한 플레이어를 처리합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자
  - **응답**:
    - 🚫 `403`: 플레이어가 이미 승리함
    - 🚫 `404`: 플레이어를 찾을 수 없음

- **`GET /falled/:id`**
  - 탈락한 플레이어를 처리합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자
  - **응답**:
    - 🚫 `404`: 플레이어를 찾을 수 없음

---

### 🕹️ **게임 상태 엔드포인트**

- **`GET /state`**  
  - 현재 게임 상태를 반환합니다.
  - **응답**:  
    - `isPlaying`: 게임이 진행 중인지 여부
    - `isVoicing`: 음성 안내가 활성화되어 있는지 여부
    - `isCounting`: 게임이 카운트다운 중인지 여부
    - `serverFPS`: 서버의 초당 프레임 수
    - `leftCountDownFrame`: 카운트다운에서 남은 프레임 수
    - `numberOfPlayers`: 현재 접속한 플레이어 수
    - `playFrame`: 게임 플레이 현재의 프레임
    - `timeLeft`: 게임 플레이 남은 시간 (초)

- **`GET /playerData/:id`**  
  - 플레이어 데이터를 요청합니다.
  - **파라미터**: `id` - 플레이어의 고유 식별자  
  - **응답**:
    - `players` - Json 변수
    - 🚫 `404`: 플레이어를 찾을 수 없음

- **`GET /playerData`**
  - 플레이어의 데이터를 요청합니다.
  - **응답**: `players` - Json 변수

- **`GET /ard`**  
  - 아두이노가 다음 어떤 행동을 해야 하는지 문자열을 반환합니다.
  - **응답**:
    - `do`: 다음 행동 코드 문자열
    - `voiceCode`: 다음 음성 재생 코드
    - `voiceSpeed`: 다음 음성 재생 속도
   
- **`GET /resultData`**  
  - 게임 플레이가 끝난 후 요청합니다. 게임 결과 데이터를 반환합니다.
  - **응답**:
    - `data`: 결과 데이터 2차원 배열

---

### 🤖 **아두이노 관련 엔드포인트**

- **`GET /ardIsVoicing`**  
  - 아두이노에서 음성이 시작되면 서버에 알립니다.
  - **응답**:
    - ✅ `200`: 정상 처리됨

- **`GET /ardIsNotVoicing`**  
  - 아두이노에서 음성이 종료되면 서버에 알립니다.
  - **응답**:
    - ✅ `200`: 정상 처리됨

- **`GET /ardWinner?number=123`**  
  - 아두이노에서 생존자가 발생하면 서버에 알립니다.
  - **쿼리**: `number`

---

## 📋 **About activityCodes (다음 행동 코드 문자열)**

- 아두이노는 서버에게 주기적으로 `GET` 요청을 보내 activityCodes를 반환받아 행동합니다.  
  - `0`: 아무 행동 없음  
  - `1`: 게임을 시작, 초기화 및 카운트다운 진행  
  - `2`: 음성 재생 시작  
  - `3`: 모터를 회전하여 벽을 바라봄  
  - `4`: 모터를 회전하여 플레이어를 바라봄  
  - `5`: 제한시간으로 인해 게임이 종료됨  
  - `6`: 플레이어가 한 명 남아 게임이 종료됨
- **예시**: `{do: '024', voiceCode: 4, voiceSpeed: 1.5}`

---

## 🖋️ **About playerData (플레이어 데이터 json)**

- 앱은 `check` 요청에 `needToUpdate`가 `true`일 때, 플레이어 데이터를 요청합니다.
  - **데이터 구조**:
    - **key**: `data`
    - **value**: `[[playerId, playerNumber, isReady, isAlive, isSurvive, needToUpdate], [playerId, ...], ...]`
- **예시**: `{"data": [["abcd", 456, false, true, false, false], ["abdfs", 101, true, true, false, true], ["weghi", 455, false, true, false, false]]}`

---

## 🏷️ **About resultData (게임 결과 데이터 json)**

- 앱은 `state` 요청에 게임이 종료되었을 때, 게임 결과 데이터를 요청합니다.
  - **데이터 구조**:
    - **key**: `data`
    - **value**: `[[playerState, Rank, playerNumber, playerId, playTime], [playerState, ...], ...]`
- **예시**: `{"data": [["survived", "2등", "456", "Faker", "25s"], ...]}`
- **`playerState`**: `"survived"`, `"failed"`, `"disconnected"`

---

## 🖨️ **About State (게임 상황 json)**

- 게임 진행 상황이 궁금할 때 `/state`를 통해 게임 상황을 반환 받습니다.
  - **데이터 구조**:
    - **key**:
      - `isPlaying`: 게임 진행 여부
      - `isVoicing`: 음성 재생 중 여부
      - `isCounting`: 카운트다운 중 여부
      - `serverFPS`: 서버 프레임
      - `leftCountDownFrame`: 카운트다운 남은 프레임
      - `numberOfPlayers`: 총 플레이어 수
      - `playFrame`: 게임 시작 후 현재 프레임
      - `timeLeft`: 게임 마무리 남은 시간 (초)
- **예시**: `{"isPlaying":true, "isVoicing":false, "isCounting":false, "serverFPS":60, "leftCountDownFrame":0, "numberOfPlayers":4, "playFrame":12, "timeLeft":50.8}`
---

# 📌 **서버 내장 함수**

여기부터는 서버에 내장되어 **외부에서 접근할 수 없는 함수**를 기재하였습니다.

---

## ⚙️ **기본 연산 함수**

### **`ReadyPlayers()`**  
- **설명**: 준비된 플레이어와 전체 플레이어 수를 반환합니다.  
- **반환값**: `[readyPlayer<int>, Player<int>]`

---

### **`NumOfPlayers()`**  
- **설명**: 총 플레이어 수를 반환합니다.  
- **반환값**: `Number`

---

### **`NumOfAlivePlayers()`**  
- **설명**: 게임을 플레이 중인 플레이어의 수를 반환합니다.
- **반환값**: `Number`

---

### **`TrnasformData()`**  
- **설명**: 앱의 요청에 맞게 플레이어 데이터를 변환하여 반환합니다.
- **반환값**: `playerArray`

---

### **`ExitPlayerIndex(num)`**  
- **설명**: 플레이어의 인덱스를 정리합니다.
- **매개변수**:
  - `num`: 연결 해제된 플레이어의 인덱스
- **반환값**: 없음

---

### **`Randoms()`**  
- **설명**: 두 실수 사이의 랜덤 값을 반환합니다.  
- **매개변수**:  
  - `min`: 최소값  
  - `max`: 최대값  
- **반환값**: `randomNumber`

---

### **`Randomn()`**  
- **설명**: 두 정수 사이의 랜덤 정수를 반환합니다.  
- **매개변수**:  
  - `min`: 최소값  
  - `max`: 최대값  
- **반환값**: `randomInteger`

---

### **`Averages()`**  
- **설명**: 배열의 평균 값을 반환합니다.  
- **매개변수**:  
  - `arr`: 평균을 구할 배열  
- **반환값**: `average`

---

### **`NextRandom()`**  
- **설명**: `minLoopFrame`과 `maxLoopFrame` 값을 갱신합니다.  
- **반환값**: 없음

---

### **`NextVoiceRandom()`**  
- **설명**: `nextVoicePlayCode`을 무작위로 결정하고, `nexVoicePlaySpeed`를 결정합니다.  
- **반환값**: 없음  

---

### **`SortRight()`**  
- **설명**: `players[playerId][4]`을 기준으로 오름차순 정렬합니다. 또한 등수도 처리합니다.
- **매개변수**:
  - `arr`: 정렬할 2차원 배열
- **반환값**: `rightSortedArray`

---

### **`SortReverse()`**  
- **설명**: `players[playerId][4]`을 기준으로 내림차순 정렬합니다. 또한 등수도 처리합니다.
- **매개변수**:
  - `arr`: 역정렬할 2차원 배열
- **반환값**: `reverseSortedArray`

---

## 🎮 **게임 진행 함수**

### **`StartCount()`**  
- **설명**: 게임 시작 카운트다운을 활성화합니다.  
- **반환값**: 없음  

---

### **`Start()`**  
- **설명**: 게임을 시작합니다.  
- **반환값**: 없음  

---

### **`DoVoice()`**  
- **설명**: 음성 재생을 시작합니다.  
- **반환값**: 없음  

---

### **`CheckConnect()`**  
- **설명**: 각 플레이어의 연결 상태를 확인합니다.  
- **반환값**: 없음  

---

### **`ExitPlayerIndex()`**  
- **설명**: 플레이어 인덱스를 정리합니다.  
- **매개변수**:  
  - `num`: 퇴장하는 플레이어의 인덱스  
- **반환값**: 없음  

---

### **`PlayOnReady()`**  
- **설명**: 준비 상태에서 실행되는 함수입니다.  
- **반환값**: 없음  

---

### **`PlayOnCounting()`**  
- **설명**: 카운트다운 중 주기적으로 실행됩니다.  
- **반환값**: 없음  

---

### **`PlayOnGame()`**  
- **설명**: 게임 진행 중 주기적으로 실행됩니다.  
- **반환값**: 없음  

---

### **`GameEnd()`**  
- **설명**: 게임을 종료합니다.
- **반환값**: 없음  

---

## 📙 **State 관련 함수**

### **`DoUpdate()`**  
- **설명**: 플레이어 데이터가 업데이트가 필요하면 수정 필요 여부를 수정합니다.  
- **반환값**: 없음

---

### **`ResultArray()`**  
- **설명**: 결과 배열을 보기 좋게 정리합니다. (앱의 요청에 따라)
- **반환값**: `resultArray`

---
