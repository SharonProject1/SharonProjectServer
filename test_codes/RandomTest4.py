import matplotlib.pyplot as plt
import random

# 원래 코드에서 데이터를 추출합니다.
loopFrameArray = [10]
DECREASE_RATIO = 0.95
MIDDLE_WEIGHT = 1/15

maxLoopFrame = 200
minLoopFrame = 50
atLeast = 40

def Randoms(a, b):
    return (b-a)*random.random() + a

def Averages(arr):
    return sum(arr) / len(arr)

def NextRandom():
    global minLoopFrame, maxLoopFrame
    a = Averages(loopFrameArray)
    diff = (maxLoopFrame - minLoopFrame) / 2
    mid = (maxLoopFrame + minLoopFrame) / 2

    mid *= DECREASE_RATIO
    diff *= DECREASE_RATIO

    minLoopFrame = max(mid - diff + (mid - a)*MIDDLE_WEIGHT, atLeast)
    maxLoopFrame = max(mid + diff + (mid - a)*MIDDLE_WEIGHT, atLeast)

# 데이터를 저장할 리스트
min_values = []
max_values = []
loop_values = []

# 반복 실행
for x in range(27):
    leftLoopFrame = Randoms(minLoopFrame, maxLoopFrame)
    loopFrameArray.append(leftLoopFrame)
    min_values.append(minLoopFrame)
    max_values.append(maxLoopFrame)
    loop_values.append(leftLoopFrame)
    NextRandom()

# 시각화
plt.figure(figsize=(12, 6))

# minLoopFrame, maxLoopFrame, loopFrameArray를 그래프로 그리기
plt.plot(min_values, label="minLoopFrame", linestyle="--", marker="o")
plt.plot(max_values, label="maxLoopFrame", linestyle="--", marker="o")
plt.plot(loop_values, label="loopFrameArray (Random)", linestyle="-", marker="x")

plt.title("Loop Frame Range and Random Values Over Iterations")
plt.xlabel("Iteration")
plt.ylabel("Frame Values")
plt.legend()
plt.grid(True)

plt.show()