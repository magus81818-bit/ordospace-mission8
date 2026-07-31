import json
import sys
from PIL import Image
import numpy as np

a = np.asarray(Image.open(sys.argv[1]).convert("RGB"), dtype=np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB"), dtype=np.int16)
if a.shape != b.shape:
    print(json.dumps({"available": True, "sameDimensions": False, "ratio": 1}))
else:
    changed = np.any(np.abs(a - b) > 25, axis=2)
    count = int(np.count_nonzero(changed))
    total = int(changed.size)
    ys, xs = np.where(changed)
    bbox = None if count == 0 else [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    excluded = changed.copy()
    if len(sys.argv) > 3:
        for box in json.loads(sys.argv[3]):
            x, y, w, h = [int(v) for v in box]
            excluded[max(0,y):min(excluded.shape[0],y+h), max(0,x):min(excluded.shape[1],x+w)] = False
    excluded_count = int(np.count_nonzero(excluded))
    print(json.dumps({"available": True, "sameDimensions": True, "differentPixels": count, "totalPixels": total, "ratio": count / total, "diffBoundingBox": bbox, "excludedDifferentPixels": excluded_count, "excludedRatio": excluded_count / total}))
