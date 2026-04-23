const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');

ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.beginPath();

var p1 = {x: 100, y: 50};
var p2 = {x: 100, y: 150};
var jump = {x: 100, y: 100, t1: 0.5};
var radius = 7;
var dx = p2.x - p1.x, dy = p2.y - p1.y;
var len = Math.hypot(dx, dy);
var uX = dx/len, uY = dy/len;
var angle = Math.atan2(dy, dx);

ctx.moveTo(p1.x, p1.y);
var startArcX = p1.x + uX * (jump.t1 * len - radius);
var startArcY = p1.y + uY * (jump.t1 * len - radius);

ctx.lineTo(startArcX, startArcY);
ctx.arc(jump.x, jump.y, radius, angle + Math.PI, angle, false);
ctx.lineTo(p2.x, p2.y);
ctx.stroke();

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('test_jump.png', buffer);
