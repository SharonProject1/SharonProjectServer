import matplotlib.pyplot as plt

def weighted_random_choice(trial, max_trials=6, bias_factor=1.5, sharpness=1.05):
    """
    trial: 현재 시행 횟수 (1부터 시작)
    max_trials: 최대 시행 횟수
    bias_factor: 경향성을 조정하는 상수
    sharpness: 경향성 증가 속도를 조정하는 추가 지수
    """
    start_range, end_range = 8, 23

    # if trial >= max_trials:
    #     start_range = 18

    f_t = (trial / max_trials) ** (-1 / sharpness)

    weights = [
        abs(((end_range - num + 1) / (end_range - start_range + 1)) ** (f_t / bias_factor) * (1 - trial/25) ** ((24 - num) ** 1.25))
        for num in range(start_range, end_range + 1)
    ]

    return list(range(start_range, end_range + 1)), weights

# 그래프를 그리기 위한 데이터 수집
weight_data = {}
for i in range(1, 15):  # Trial 1부터 9까지
    x, weights = weighted_random_choice(i)
    weight_data[i] = (x, weights)

# 그래프 그리기
plt.figure(figsize=(12, 8))
for trial, (x, weights) in weight_data.items():
    plt.plot(x, weights, label=f'Trial {trial}')

plt.title('Voice playSpeedCode random weighting per Trial', fontsize=16)
plt.xlabel('Numbers (8-23)', fontsize=14)
plt.ylabel('Weights', fontsize=14)
plt.legend(title='Trial', fontsize=10)
plt.grid(True)
plt.show()