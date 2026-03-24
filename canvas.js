const canvas = document.getElementById('paper');
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
/*add canvas resizing feature, store all canvas objects in an array*/

let is_drawing = false;
let startX = 0;
let startY = 0;
let curr_tool = localStorage.getItem("curr_tool");
let stroke_style = localStorage.getItem("stroke_style");
console.log(localStorage);

if(!localStorage.getItem("stroke_width")){
    localStorage.setItem("stroke_width", "1");
}
if(!localStorage.getItem("opacity")){
    localStorage.setItem("opacity","1");
}
if (!curr_tool) {
    localStorage.setItem("curr_tool", "selection");
    curr_tool = "selection";
    canvas.classList.remove("crosshair", "textcursor");
}
if (!localStorage.getItem("stroke_color")) {
    if(localStorage.getItem("light") === 'false')
        localStorage.setItem("stroke_color", "#f5b811");
    else {
        localStorage.setItem("stroke_color","#a60818");
    }
}
if (!stroke_style) {
    localStorage.setItem("stroke_style", "straight-line");
    stroke_style = "straight-line";
}

document.getElementById("stroke_color").value = localStorage.getItem("stroke_color");
document.getElementById("stroke_width").value = localStorage.getItem("stroke_width");
document.getElementById("opacity").value = localStorage.getItem("opacity");
document.getElementById(curr_tool).classList.add("selected");
document.getElementById(stroke_style).classList.add("selected");
console.log(localStorage);

//function to change the cursor
function change_cursor(){
    canvas.classList.remove("crosshair", "textcursor");
    if (curr_tool === "text") {
            canvas.classList.add("textcursor");
        }
    else if (curr_tool !== "selection") {
            canvas.classList.add("crosshair");
        }
}
//function to change the stroke style
function change_style(){
    if(stroke_style === "dotted-line"){
        ctx.setLineDash([2, 5]);
    }
    else{
        ctx.setLineDash([]);
    }
    ctx.lineDashOffset = 0;
}

change_cursor();
change_style();
ctx.lineWidth = JSON.parse(localStorage.getItem("stroke_width"));
ctx.globalAlpha = JSON.parse(localStorage.getItem("opacity"));
ctx.strokeStyle = localStorage.getItem("stroke_color");

const tools = document.getElementsByClassName('tools');
for (const tool of tools) {
    tool.addEventListener("click", (event) => {
        document.getElementById(curr_tool).classList.remove("selected");
        console.log(`class selected removed from ${curr_tool}.`);
        localStorage.setItem("curr_tool", event.currentTarget.id);
        curr_tool = localStorage.getItem("curr_tool");
        document.getElementById(curr_tool).classList.add("selected");
        console.log(`class selected added to ${curr_tool}`);
        change_cursor();
    })};

const stroke_buttons = document.getElementsByClassName('stroke_button');
for (const butt of stroke_buttons){
    butt.addEventListener("click", (event) => {
        document.getElementById(stroke_style).classList.remove("selected");
        console.log(`class selected removed from ${stroke_style}.`);
        localStorage.setItem("stroke_style", event.currentTarget.id);
        stroke_style = localStorage.getItem("stroke_style");
        document.getElementById(stroke_style).classList.add("selected");
        console.log(`class selected added to ${stroke_style}`);
        change_style();
    }
)};

document.getElementById("stroke_width").addEventListener("change", (event) => {
        localStorage.setItem("stroke_width", JSON.stringify(event.target.value));
        ctx.lineWidth = event.target.value;

});

//drawing functions :
function draw_line(endX,endY) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.lineTo(endX,endY);
    ctx.stroke();
}
function draw_rectangle(endX,endY) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeRect(startX,startY,endX-startX,endY-startY);
}

function draw_ellipse(endX, endY) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();
    ctx.ellipse((startX+endX)/2, (endY+startY)/2,Math.abs((endX-startX)/2),Math.abs((endY-startY)/2),0,0,2*Math.PI);
    ctx.stroke();
}

function draw_free(endX, endY) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    startX = endX;
    startY = endY;
}

canvas.addEventListener("mousedown", (event) => {
    is_drawing = true;
    startX = event.clientX;
    startY = event.clientY;
})
canvas.addEventListener("mousemove", (event) => {
    if (is_drawing === true) {
        if(curr_tool === "line"){
                draw_line(event.clientX, event.clientY);
        }
        else if(curr_tool === "draw_rectangle"){
                draw_rectangle(event.clientX, event.clientY);
        }
        else if(curr_tool === "draw_circle"){
                draw_ellipse(event.clientX, event.clientY);
        }
        else if(curr_tool === "pencil"){
                draw_free(event.clientX, event.clientY);
        }

    }
})
canvas.addEventListener("mouseup", (event) => {
    is_drawing = false;
})

//to prevent glitches when mouse leaves canvas
canvas.addEventListener("mouseleave", (event) => {
    is_drawing = false;
})

document.getElementById("stroke_color").addEventListener("change", (event) => {
    localStorage.setItem("stroke_color", event.currentTarget.value);
    ctx.strokeStyle = event.currentTarget.value;
})
document.getElementById("opacity").addEventListener("change", (event) => {
    localStorage.setItem("opacity", event.currentTarget.value/100);
    ctx.globalAlpha = event.currentTarget.value/100;
})

//bug to be fixed later : drawing stops when pointer crosses toolbar