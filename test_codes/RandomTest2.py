import random

def weighted_random_choice(trial, max_trials=6, bias_factor=1.5, sharpness=1.05):
    """
    trial: 현재 시행 횟수 (1부터 시작)
    max_trials: 최대 시행 횟수
    bias_factor: 경향성을 조정하는 상수
    sharpness: 경향성 증가 속도를 조정하는 추가 지수
    """
    # 초기 범위 설정
    start_range, end_range = 8, 23

    # 시행 횟수 기반 변화 함수
    f_t = (trial / max_trials) ** (-1/sharpness)  # f(t) = (t / max_trials)^-sharpness

    # 가중치 계산
    weights = [
        ((end_range - num + 1) / (end_range - start_range + 1)) ** (f_t / bias_factor) * (1 - trial/25) ** ((24 - num) ** 1.25)
        for num in range(start_range, end_range + 1)
    ]

    print(weights)

    # 랜덤 선택 (가중치 기반)
    return random.choices(range(start_range, end_range + 1), weights=weights, k=1)[0]

# 테스트
for i in range(1, 10):  # 9번 시행
    print(f"Trial {i}: {weighted_random_choice(i)}")