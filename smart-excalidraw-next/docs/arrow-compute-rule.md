# Excalidraw Arrow Position Calculation Logic Overview

## Variable Descriptions
- `startEle` - The element bound to the start point
- `endEle` - The element bound to the end point
- `arrow` - The arrow element

## Properties and Calculation Formulas
- Arrow start point x = `arrow.x`
- Arrow start point y = `arrow.y`
- Arrow end point x = `arrow.x + arrow.width`
- Arrow end point y = `arrow.y + arrow.height`

## Core Calculation Logic

### Element Center Point Calculation
```javascript
// Element center point coordinates
const startCenterX = startX + startWidth / 2;
const startCenterY = startY + startHeight / 2;
const endCenterX = endX + endWidth / 2;
const endCenterY = endY + endHeight / 2;
```

### Distance Variable Definitions (Based on Center Points)
```javascript
// dx and dy are only used to determine the relative position direction of elements
const dx = startCenterX - endCenterX;  // or endCenterX - startCenterX (depends on which element is being calculated)
const dy = startCenterY - endCenterY;  // or endCenterY - startCenterY (depends on which element is being calculated)
const absDx = Math.abs(dx);
const absDy = Math.abs(dy);
```

### Edge Midpoint Calculation Formulas
- **Left edge midpoint**: `{ x: element.x, y: element.y + element.height / 2 }`
- **Right edge midpoint**: `{ x: element.x + element.width, y: element.y + element.height / 2 }`
- **Top edge midpoint**: `{ x: element.x + element.width / 2, y: element.y }`
- **Bottom edge midpoint**: `{ x: element.x + element.width / 2, y: element.y + element.height }`

---

## How to Determine Arrow Start Point Coordinates
The arrow start point coordinates should be at the midpoint of the edge of `startEle`.

### New Edge Selection Algorithm
1. **Determine relative position**: Use center point coordinates to calculate `dx` and `dy`, only for determining the relative position direction of the two elements
2. **Candidate edge pairing**: Determine candidate opposite edge pairs based on relative position
3. **Edge selection**: Calculate the coordinate difference for each candidate edge pair, and select the edge pair with the largest difference

#### Step 1: Calculate Element Center Points and Relative Position
```javascript
const startCenterX = startX + startWidth / 2;
const startCenterY = startY + startHeight / 2;
const endCenterX = endX + endWidth / 2;
const endCenterY = endY + endHeight / 2;

const dx = startCenterX - endCenterX;
const dy = startCenterY - endCenterY;
```

#### Step 2: Determine Candidate Edge Pairs
Determine candidate opposite edge pairs based on relative position:

| startEle Relative Position | startEle Candidate Edge | endEle Candidate Edge | Relationship |
|------------------|-----------------|---------------|------|
| Left (dx > 0) | Right edge | Left edge | Opposite |
| Right (dx < 0) | Left edge | Right edge | Opposite |
| Above (dy > 0) | Bottom edge | Top edge | Opposite |
| Below (dy < 0) | Top edge | Bottom edge | Opposite |

#### Step 3: Calculate Edge Differences and Select Optimal Edge

##### Horizontal Edge Difference Calculation
```javascript
// X-axis distance difference between left and right edges (note: no absolute value, maintaining directionality)
const leftToRightDistance = (startX - (endX + endWidth));
const rightToLeftDistance = -((startX + startWidth) - endX);
```

##### Vertical Edge Difference Calculation
```javascript
// Y-axis distance difference between top and bottom edges (note: no absolute value, maintaining directionality)
const topToBottomDistance = (startY - (endY + endHeight));
const bottomToTopDistance = -((startY + startHeight) - endY);
```

##### Edge Selection Logic
```javascript
// Determine edge based on relative position and maximum difference
if (dx > 0 && dy > 0) {
  // startEle is to the bottom-right of endEle
  if (leftToRightDistance > topToBottomDistance) {
    // Select left-right edge pair
    startEdge = 'left';
    endEdge = 'right';
  } else {
    // Select top-bottom edge pair
    startEdge = 'top';
    endEdge = 'bottom';
  }
} else if (dx < 0 && dy > 0) {
  // startEle is to the bottom-left of endEle
  if (rightToLeftDistance > topToBottomDistance) {
    startEdge = 'right'; endEdge = 'left';
  } else {
    startEdge = 'top'; endEdge = 'bottom';
  }
} else if (dx > 0 && dy < 0) {
  // startEle is to the top-right of endEle
  if (leftToRightDistance > bottomToTopDistance) {
    startEdge = 'left'; endEdge = 'right';
  } else {
    startEdge = 'bottom'; endEdge = 'top';
  }
} else if (dx < 0 && dy < 0) {
  // startEle is to the top-left of endEle
  if (rightToLeftDistance > bottomToTopDistance) {
    startEdge = 'right'; endEdge = 'left';
  } else {
    startEdge = 'bottom'; endEdge = 'top';
  }
} else if (dx === 0 && dy > 0) {
  // Directly below
  startEdge = 'top'; endEdge = 'bottom';
} else if (dx === 0 && dy < 0) {
  // Directly above
  startEdge = 'bottom'; endEdge = 'top';
} else if (dx > 0 && dy === 0) {
  // Directly to the right
  startEdge = 'left'; endEdge = 'right';
} else if (dx < 0 && dy === 0) {
  // Directly to the left
  startEdge = 'right'; endEdge = 'left';
} else {
  // Default case (overlapping elements)
  startEdge = 'right'; endEdge = 'left';
}
```

#### Complete Edge Selection Algorithm
```javascript
function determineEdges(startEle, endEle) {
  const startX = startEle.x || 0;
  const startY = startEle.y || 0;
  const startWidth = startEle.width || 100;
  const startHeight = startEle.height || 100;

  const endX = endEle.x || 0;
  const endY = endEle.y || 0;
  const endWidth = endEle.width || 100;
  const endHeight = endEle.height || 100;

  // Calculate center point coordinates to accurately determine relative position
  const startCenterX = startX + startWidth / 2;
  const startCenterY = startY + startHeight / 2;
  const endCenterX = endX + endWidth / 2;
  const endCenterY = endY + endHeight / 2;

  // dx and dy are only used to determine relative position direction
  const dx = startCenterX - endCenterX;
  const dy = startCenterY - endCenterY;

  // Calculate distance differences between possible edge pairs
  const leftToRightDistance = (startX - (endX + endWidth));
  const rightToLeftDistance = -((startX + startWidth) - endX);
  const topToBottomDistance = (startY - (endY + endHeight));
  const bottomToTopDistance = -((startY + startHeight) - endY);

  let startEdge, endEdge;

  if (dx > 0 && dy > 0) {
    // startEle is to the bottom-right of endEle
    if (leftToRightDistance > topToBottomDistance) {
      startEdge = 'left'; endEdge = 'right';
    } else {
      startEdge = 'top'; endEdge = 'bottom';
    }
  } else if (dx < 0 && dy > 0) {
    // startEle is to the bottom-left of endEle
    if (rightToLeftDistance > topToBottomDistance) {
      startEdge = 'right'; endEdge = 'left';
    } else {
      startEdge = 'top'; endEdge = 'bottom';
    }
  } else if (dx > 0 && dy < 0) {
    // startEle is to the top-right of endEle
    if (leftToRightDistance > bottomToTopDistance) {
      startEdge = 'left'; endEdge = 'right';
    } else {
      startEdge = 'bottom'; endEdge = 'top';
    }
  } else if (dx < 0 && dy < 0) {
    // startEle is to the top-left of endEle
    if (rightToLeftDistance > bottomToTopDistance) {
      startEdge = 'right'; endEdge = 'left';
    } else {
      startEdge = 'bottom'; endEdge = 'top';
    }
  } else if (dx === 0 && dy > 0) {
    // Directly below
    startEdge = 'top'; endEdge = 'bottom';
  } else if (dx === 0 && dy < 0) {
    // Directly above
    startEdge = 'bottom'; endEdge = 'top';
  } else if (dx > 0 && dy === 0) {
    // Directly to the right
    startEdge = 'left'; endEdge = 'right';
  } else if (dx < 0 && dy === 0) {
    // Directly to the left
    startEdge = 'right'; endEdge = 'left';
  } else {
    // Default case (overlapping elements)
    startEdge = 'right'; endEdge = 'left';
  }

  return { startEdge, endEdge };
}
```

---

## How to Determine Arrow End Point Coordinates
The arrow end point coordinates should be at the midpoint of the edge of `endEle`.

**Note**: The end point coordinate calculation uses the same edge selection algorithm as the start point, ensuring that the edges selected for the two elements are always in opposite directions.

### End Point Calculation Based on Edge Selection Algorithm
```javascript
// Use the same determineEdges function to get edge pairing
const { endEdge } = determineEdges(startEle, endEle);

// Calculate end point coordinates based on the determined endEdge
function getEdgeCenter(element, edge) {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;

  switch (edge) {
    case 'left':
      return { x: x, y: y + height / 2 };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'top':
      return { x: x + width / 2, y: y };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    default:
      // Default to right edge
      return { x: x + width, y: y + height / 2 };
  }
}

const endEdgeCenter = getEdgeCenter(endEle, endEdge);
```

---

## Final Arrow Coordinate Calculation

### New Arrow Coordinate Calculation Flow

```javascript
// 1. Determine optimal edge pairing
const { startEdge, endEdge } = determineEdges(startEle, endEle);

// 2. Calculate edge center coordinates for start and end points
function getEdgeCenter(element, edge) {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;

  switch (edge) {
    case 'left':
      return { x: x, y: y + height / 2 };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'top':
      return { x: x + width / 2, y: y };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    default:
      // Default to right edge
      return { x: x + width, y: y + height / 2 };
  }
}

const startEdgeCenter = getEdgeCenter(startEle, startEdge);
const endEdgeCenter = getEdgeCenter(endEle, endEdge);

// 3. Set arrow coordinates
arrow.x = startEdgeCenter.x;
arrow.y = startEdgeCenter.y;
arrow.width = endEdgeCenter.x - startEdgeCenter.x;
arrow.height = endEdgeCenter.y - startEdgeCenter.y;

// 4. Fix Excalidraw rendering bug: set width to 1 when it equals 0
if (arrow.width === 0) {
  arrow.width = 1;
}
```

### Dedicated Function Simplified Version
The actual implementation also provides dedicated simplified functions:

```javascript
// Get the edge center point of the start element
function getStartEdgeCenter(startEle, endEle) {
  const { startEdge } = determineEdges(startEle, endEle);
  return getEdgeCenter(startEle, startEdge);
}

// Get the edge center point of the end element
function getEndEdgeCenter(endEle, startEle) {
  const { endEdge } = determineEdges(startEle, endEle);
  return getEdgeCenter(endEle, endEdge);
}

// Simplified calculation using dedicated functions
const startEdgeCenter = getStartEdgeCenter(startEle, endEle);
const endEdgeCenter = getEndEdgeCenter(endEle, startEle);

arrow.x = startEdgeCenter.x;
arrow.y = startEdgeCenter.y;
arrow.width = endEdgeCenter.x - startEdgeCenter.x;
arrow.height = endEdgeCenter.y - startEdgeCenter.y;
```

### Summary of Core Improvements
1. **Center point calculation**: dx and dy are calculated based on element center points, more accurately reflecting the relative position between elements
2. **Edge pairing principle**: Ensures that the edges of startEle and endEle are always in opposite directions (left-right, top-bottom)
3. **Distance difference selection**: By calculating the coordinate differences of candidate edge pairs (maintaining directionality, without using absolute values), the edge pair with the largest difference is selected to optimize the connection path
4. **Unified algorithm**: Start and end points use the same edge selection logic, ensuring consistency
5. **Boundary value handling**: Default values are added for element properties (x=0, y=0, width=100, height=100) to ensure calculation robustness
6. **Special case handling**: Added special handling logic for direct vertical/horizontal alignment and overlapping elements
7. **Rendering fix**: Fixed Excalidraw rendering bug where line-type element width is set to 1 when it equals 0

---

## Important Implementation Details

### 1. Directionality of Distance Difference Calculation
```javascript
// Note: Math.abs() is not used, maintaining directionality
const leftToRightDistance = (startX - (endX + endWidth));      // Positive value indicates gap
const rightToLeftDistance = -((startX + startWidth) - endX);   // Positive value indicates gap
```

### 2. Special Case Handling for Edge Selection
- **Direct alignment**: When dx=0 or dy=0, directly select the corresponding edge pair
- **Overlapping elements**: When elements overlap, use the default right-left edge pairing
- **Strictly opposite**: Ensure the selected edge pair is always in opposite directions

### 3. Element Property Default Values
All element properties use `|| 0` or `|| 100` to provide default values:
```javascript
const startX = startEle.x || 0;
const startY = startEle.y || 0;
const startWidth = startEle.width || 100;
const startHeight = startEle.height || 100;
```

### 4. Excalidraw Rendering Bug Fix
```javascript
// Fix Excalidraw rendering bug: set width to 1 when line-type element width equals 0
if ((element.type === 'arrow' || element.type === 'line') && optimized.width === 0) {
  optimized.width = 1;
  needsOptimization = true;
}
```

## Implementation Location
See the complete implementation at: `lib/optimizeArrows.js`
