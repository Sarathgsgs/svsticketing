def calculate_priority(impact: int, risk: int, frequency: int):
    """
    Weighted scoring:
    P = 0.5*impact + 0.3*risk + 0.2*frequency
    Returns P1-P4 label.
    """
    score = 0.5*impact + 0.3*risk + 0.2*frequency
    if score >= 8: return "P1"
    if score >= 6: return "P2"
    if score >= 4: return "P3"
    return "P4"