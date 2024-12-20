import random

loopFrameArray = [10]
DECREASE_RATIO = 0.95
MIDDLE_WEIGHT = 1/15

maxLoopFrame = 250
minLoopFrame = 120
atLeast = 30

def Randoms(a, b):
  return (b-a)*random.random()+a

def Averages(arr):
  return sum(arr) / len(arr)

def NextRandom():
  global minLoopFrame, maxLoopFrame
  a = Averages(loopFrameArray)
  diff = (maxLoopFrame - minLoopFrame) / 2
  mid = (maxLoopFrame + minLoopFrame) / 2

  mid *= DECREASE_RATIO
  diff *= DECREASE_RATIO
  
  minLoopFrame = mid - diff + (mid - a)*MIDDLE_WEIGHT if mid - diff + (mid - a)*MIDDLE_WEIGHT >= atLeast else atLeast
  maxLoopFrame = mid + diff + (mid - a)*MIDDLE_WEIGHT if mid + diff + (mid - a)*MIDDLE_WEIGHT >= atLeast else atLeast

for x in range(20):
  leftLoopFrame = Randoms(minLoopFrame, maxLoopFrame)
  loopFrameArray.append(leftLoopFrame)
  print(minLoopFrame, maxLoopFrame, leftLoopFrame)
  NextRandom()


print("\n", loopFrameArray)