from gamechangerml.src.featurization.keywords.rake import Rake
from typing import List

kw_alg = Rake(stop_words="smart")


def get_keywords(text: str, amount: int = 10) -> List[str]:
    """
    This function is used to extract keywords.
    """
    try:
        key_w = kw_alg.rank(text, ngram=(1, 1), topn=amount, clean=True)
        return key_w
    except ValueError:
        raise
