const state = {
  components: [],
  wires: [
    { id: 'w1', points: [{x: 100, y: 50}, {x: 100, y: 150}] },
    { id: 'w2', points: [{x: 50, y: 100}, {x: 150, y: 100}] }
  ]
};

function testAABB(a_p1, a_p2, b_p1, b_p2) {
  var ax1 = Math.min(a_p1.x, a_p2.x), ax2 = Math.max(a_p1.x, a_p2.x);
  var ay1 = Math.min(a_p1.y, a_p2.y), ay2 = Math.max(a_p1.y, a_p2.y);
  var bx1 = Math.min(b_p1.x, b_p2.x), bx2 = Math.max(b_p1.x, b_p2.x);
  var by1 = Math.min(b_p1.y, b_p2.y), by2 = Math.max(b_p1.y, b_p2.y);
  return (ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1);
}

function getLineIntersection(p0, p1, p2, p3) {
  var s1_x = p1.x - p0.x, s1_y = p1.y - p0.y;
  var s2_x = p3.x - p2.x, s2_y = p3.y - p2.y;
  var denom = (-s2_x * s1_y + s1_x * s2_y);
  if (Math.abs(denom) < 1e-6) return null;
  var s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denom;
  var t = ( s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denom;
  if (s >= 0.01 && s <= 0.99 && t >= 0.01 && t <= 0.99) {
    return { x: p0.x + (t * s1_x), y: p0.y + (t * s1_y), t1: t, t2: s };
  }
  return null;
}

function shouldJump(p1, p2, op1, op2, idA, idB) {
  var a_vert = Math.abs(p2.y - p1.y) - Math.abs(p2.x - p1.x);
  var b_vert = Math.abs(op2.y - op1.y) - Math.abs(op2.x - op1.x);
  if (Math.abs(a_vert - b_vert) > 1e-3) return a_vert > b_vert;
  return String(idA) > String(idB);
}

var p1 = state.wires[0].points[0], p2 = state.wires[0].points[1];
var op1 = state.wires[1].points[0], op2 = state.wires[1].points[1];

var intersect = getLineIntersection(p1, p2, op1, op2);
console.log("Intersect:", intersect);

if (intersect) {
  var lenA = Math.sqrt((p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y));
  var lenB = Math.sqrt((op2.x - op1.x)*(op2.x - op1.x) + (op2.y - op1.y)*(op2.y - op1.y));
  console.log("lenA:", lenA, "lenB:", lenB);
  console.log("t1 dist:", intersect.t1 * lenA, "t2 dist:", intersect.t2 * lenB);
  console.log("shouldJump w1?", shouldJump(p1, p2, op1, op2, 'w1', 'w2'));
  console.log("shouldJump w2?", shouldJump(op1, op2, p1, p2, 'w2', 'w1'));
}
