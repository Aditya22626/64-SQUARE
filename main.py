from core.game_loop import train_self_play, evaluate_agent

if __name__ == "__main__":
    # Let the upgraded AI train for a larger batch to learn the new strategies
    train_self_play(epochs=500)