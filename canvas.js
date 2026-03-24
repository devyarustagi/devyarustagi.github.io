const canvas = document.getElementById('test');
const ctx = canvas.getContext("2d");
const canvas2 = document.getElementById('final');
const ctx2 = canvas2.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas2.width = window.innerWidth;
canvas2.height = window.innerHeight;

let is_drawing = false;
let startX = 0;
let startY = 0;
let pencil_array = [];
let curr_tool = localStorage.getItem("curr_tool");
let stroke_style = localStorage.getItem("stroke_style");
console.log(localStorage);

//canvas2 drawing function
function canvas2draw(object) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx2.strokeStyle = object.stroke_color;
    ctx2.globalAlpha = JSON.parse(localStorage.getItem("opacity"));
    ctx2.lineDashOffset = 0;
    ctx2.lineWidth = object.stroke_width;
    if(object.stroke_style === "dotted-line"){
        ctx2.setLineDash([2, 5]);
    }
    else{
        ctx2.setLineDash([]);
    }
    if(object.type === "line"){
        ctx2.beginPath();
        ctx2.moveTo(object.startX,object.startY);
        ctx2.lineTo(object.endX,object.endY);
        ctx2.stroke();
    }
    else if(object.type === "circle"){
        ctx2.beginPath();
        ctx2.ellipse((object.startX+object.endX)/2, (object.endY+object.startY)/2,Math.abs((object.endX-object.startX)/2),Math.abs((object.endY-object.startY)/2),0,0,2*Math.PI);
        ctx2.stroke();
    }
    else if(object.type === "rectangle"){
        ctx2.strokeRect(object.startX,object.startY,object.endX-object.startX,object.endY-object.startY);
    }
    else if(object.type === "pencil"){
        for(let i = 1; i < pencil_array.length; i++){
            ctx2.beginPath();
            ctx2.moveTo(pencil_array[i-1].x, pencil_array[i-1].y);
            ctx2.lineTo(pencil_array[i].x,pencil_array[i].y);
            ctx2.stroke();
        }
    }
}

//Object constructors
function createObject(e){
    is_drawing = false;
    let object = {};
    if(curr_tool === "line"){
        let obj = new Shape_obj(e.clientX,e.clientY);
        object = obj;
        object.type = "line";
    }
    else if(curr_tool === "draw_circle"){
        let obj = new Shape_obj(e.clientX,e.clientY);
        object = obj;
        object.type = "circle";
    }
    else if(curr_tool === "draw_rectangle"){
        let obj = new Shape_obj(e.clientX,e.clientY);
        object = obj;
        object.type = "rectangle";
    }
    else if(curr_tool === "pencil"){
        object.type = "pencil";
    }
    object.stroke_color = document.getElementById("stroke_color").value;
    object.opacity = document.getElementById("opacity").value/100;
    object.stroke_width = document.getElementById("stroke_width").value;
    object.stroke_style = stroke_style;
    canvas2draw(object);
}
function Shape_obj(endX,endY){
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY= endY;
}




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
document.getElementById("opacity").value = localStorage.getItem("opacity")*100;
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
    })}

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
    if(curr_tool === "pencil"){
        pencil_array = [{x: startX, y: startY}];
    }
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
                pencil_array.push({x: event.clientX, y: event.clientY});
                draw_free(event.clientX, event.clientY);
        }

    }
})
canvas.addEventListener("mouseup", createObject);

//to prevent glitches when mouse leaves canvas
canvas.addEventListener("mouseleave", (e) => {
    if(is_drawing === true){
        createObject(e);
    }
    })

document.getElementById("stroke_color").addEventListener("change", (event) => {
    localStorage.setItem("stroke_color", event.currentTarget.value);
    ctx.strokeStyle = event.currentTarget.value;
})
document.getElementById("opacity").addEventListener("change", (event) => {
    localStorage.setItem("opacity", event.currentTarget.value/100);
    ctx.globalAlpha = event.currentTarget.value/100;
})
//TODO:
//bug to be fixed later : drawing stops when pointer crosses toolbar
//bug to be fixed later : stroke dotted appears strange with higher opacities
//later change: change the eraser's crosshair
//add canvas resizing feature, store all canvas objects in an array