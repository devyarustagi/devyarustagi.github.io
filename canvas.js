const canvas = document.getElementById('test');
const ctx = canvas.getContext("2d");
const canvas2 = document.getElementById('final');
const ctx2 = canvas2.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas2.width = window.innerWidth;
canvas2.height = window.innerHeight;
ctx.lineJoin = "round";
ctx2.lineJoin = "round";

let is_drawing = false;
let startX = 0;
let startY = 0;
let pencil_array = [];
let in_poly_mode = false;
let prev_undo = false;
let curr_tool = localStorage.getItem("curr_tool");
let stroke_style = localStorage.getItem("stroke_style");
let text_box = 0;
let mouse_downed_text = 0;
console.log(localStorage.getItem("undo_stack"));
let state_array = [];
let move_mode = 0;
let selected_index = -1;
//mousedown -> draw dotted lines
//-----------------------------------------------------------------------------------------
//main funcs
//select func:
function select(event){
    const x = event.clientX;
    const y = event.clientY;
    for(let i = state_array.length - 1 ; i >= 0 ; i--){
        if(ctx2.isPointInPath(state_array[i],x,y) || ctx2.isPointInStroke(state_array[i],x,y)){
            selected_index = i;
            canvas.classList.add("grabbing");
            return;
        }
    }
    selected_index = -1;
    canvas.classList.remove("grabbing");
}
//convert to path2d:
function convert_to_path2d(object){
    let path = new Path2D();
    if(object.type === "line"){
        path.moveTo(object.startX,object.startY);
        path.lineTo(object.endX,object.endY);
    }
    else if(object.type === "rectangle" || object.type === "text"){
        path.rect(object.startX,object.startY,object.endX-object.startX,object.endY-object.startY);
    }
    else if(object.type === "circle"){
        path.ellipse((object.startX+object.endX)/2, (object.endY+object.startY)/2,Math.abs((object.endX-object.startX)/2),Math.abs((object.endY-object.startY)/2),0,0,2*Math.PI)
    }
    else if(object.type === "pencil" || object.type === "polygon")
    {
        for(let i = 1; i < object.pencil_array.length; i++){
            path.moveTo(object.pencil_array[i-1].x, object.pencil_array[i-1].y);
            path.lineTo(object.pencil_array[i].x,object.pencil_array[i].y);
        }
        if(object.type === "polygon"){
            path.closePath();
        }
    }
    return path;
}
//canvas2 drawing function
function canvas2draw(object) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx2.strokeStyle = object.stroke_color;
    ctx2.globalAlpha = object.opacity;
    ctx2.lineDashOffset = 0;
    ctx2.lineWidth = object.stroke_width;
    if(object.stroke_style === "dashed-line"){
        ctx2.lineCap = "butt";
        ctx2.setLineDash([2*object.stroke_width, 2*object.stroke_width]);
    }
    else if(object.stroke_style === "dotted-line"){
        ctx2.lineCap = "round";
        ctx2.setLineDash([0,3*object.stroke_width]);
    }
    else{
        ctx2.lineCap = "round";
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
        for(let i = 1; i < object.pencil_array.length; i++){
            ctx2.beginPath();
            ctx2.moveTo(object.pencil_array[i-1].x, object.pencil_array[i-1].y);
            ctx2.lineTo(object.pencil_array[i].x,object.pencil_array[i].y);
            ctx2.stroke();
        }
    }
    else if(object.type === "polygon"){
         for(let i = 1; i < object.pencil_array.length; i++){
            ctx2.beginPath();
            ctx2.moveTo(object.pencil_array[i-1].x, object.pencil_array[i-1].y);
            ctx2.lineTo(object.pencil_array[i].x,object.pencil_array[i].y);
            ctx2.stroke();
        }
        for(let i = 0; i < 2 ; i++){
            ctx2.beginPath();
            ctx2.moveTo(object.pencil_array[object.pencil_array.length-1].x, object.pencil_array[object.pencil_array.length-1].y);
            ctx2.lineTo(object.pencil_array[0].x,object.pencil_array[0].y);
            ctx2.stroke();
        }
    }
    else if(object.type === "text"){
        ctx2.textBaseline = "top";
        ctx2.font = `${object.font_size} ${object.font_family}`;
        ctx2.fillStyle = object.font_color;
        ctx2.fillText(`${object.text}`,object.startX,object.startY);
    }
}
function rerender(){
    const undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
    for(let item of undo_stack){
    canvas2draw(item);
}}
//Object constructors
function createObject(e){
    is_drawing = false;
    if(curr_tool === "eraser"){
        return;
    }
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
        object.pencil_array = pencil_array;
    }
    else if(curr_tool === "polygon"){
        object.type = "polygon";
        object.pencil_array = pencil_array;
    }
    else if(curr_tool === "text"){
        object.type = "text";
        object.font_family = document.getElementById("font_family").value;
        object.font_size = `${document.getElementById("font_size").value}px`;
        object.font_color = document.getElementById("font_color").value;
        const tb = document.getElementById("textbox");
        object.text = tb.value;
        object.startY = parseFloat(tb.style.top);
        object.startX = parseFloat(tb.style.left);
        object.endY = parseFloat(tb.scrollHeight) + object.startY;
        object.endX = parseFloat(tb.scrollWidth) + object.startX;
        document.body.removeChild(tb);
    }
    object.stroke_color = document.getElementById("stroke_color").value;
    object.opacity = document.getElementById("opacity").value/100;
    object.stroke_width = document.getElementById("stroke_width").value;
    object.stroke_style = stroke_style;
    let undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
    undo_stack.push(object);
    localStorage.setItem("undo_stack", JSON.stringify(undo_stack));
    state_array.push(convert_to_path2d(object));
    canvas2draw(object);
}
function Shape_obj(endX,endY){
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY= endY;
}

//function to switch between font toolbar and shapes toolbar
function change_toolbar(s){
    if(s === "font"){
        document.getElementById("font_manipulation").style.display = "flex";
        document.getElementById("stroke_manipulation").style.display = "none";
    }
    else if(s === "stroke"){
        document.getElementById("font_manipulation").style.display = "none";
        document.getElementById("stroke_manipulation").style.display = "flex";
    }
    else if(s === "selection"){
        document.getElementById("font_manipulation").style.display = "none";
        document.getElementById("stroke_manipulation").style.display = "none";
    }
}

//function to change the cursor
function change_cursor(){
    canvas.classList.remove("crosshair", "textcursor", "grabbing");
    if (curr_tool !== "selection") {
            canvas.classList.add("crosshair");
        }
}

//function to change the stroke style
function change_style(){
    const stroke_width = JSON.parse(localStorage.getItem("stroke_width"));
    if(stroke_style === "dashed-line"){
        ctx.lineCap = "butt";
        ctx2.lineCap = "butt";
        ctx.setLineDash([2*stroke_width, 2*stroke_width]);
        ctx2.setLineDash([2*stroke_width, 2*stroke_width]);
    }
    else if(stroke_style === "dotted-line"){
        ctx.lineCap = "round";
        ctx2.lineCap = "round";
        ctx.setLineDash([0,3*stroke_width]);
        ctx2.setLineDash([0,3*stroke_width]);
    }
    else{
        ctx.lineCap = "round";
        ctx2.lineCap = "round";
        ctx.setLineDash([]);
        ctx2.setLineDash([]);
    }
    ctx.lineDashOffset = 0;
    ctx2.lineDashOffset = 0;
}

function add_element(s,startX,startY,endX,endY){
    if(s === "text"){
        const input = document.createElement("textarea");
        input.style.position = "absolute";
        input.id = "textbox";
        input.style.resize = "none";
        input.wrap = "off";
        input.style.top = `${Math.min(startY,endY)}px`;
        input.style.left = `${Math.min(startX,endX)}px`;
        input.style.color = `${localStorage.getItem("font_color")}`;
        input.style.fontFamily = `${localStorage.getItem("font_family")}`;
        input.style.fontSize = `${document.getElementById("font_size").value}px`
        input.style.backgroundColor = "transparent";
        input.style.overflow = "hidden";
        input.style.height = `${Math.abs(startY-endY)}px`;
        input.style.width = `${Math.abs(startX-endX)}px`;
        document.body.appendChild(input);
        input.addEventListener("input",(e)=>{
            input.style.width = `${Math.abs(startX-endX)}px`;
            input.style.width = `${input.scrollWidth}px`;
        })
        input.focus();
        input.addEventListener("mousedown",(e)=>{e.stopPropagation()},true);
    }
}
function erase(x,y){
    for(let i = state_array.length - 1 ; i > -1;i--){
        if(ctx2.isPointInStroke(state_array[i],x,y) || ctx2.isPointInPath(state_array[i],x,y)){
            state_array.splice(i,1);
            let arr = JSON.parse(localStorage.getItem("undo_stack"));
            arr.splice(i,1);
            localStorage.setItem("undo_stack",JSON.stringify(arr));
            ctx2.clearRect(0,0,canvas2.width,canvas2.height);
            rerender();
        }
    }
}

//------------------------------Initializers-----------------------------------------------
if(!localStorage.getItem("font_color")){
    localStorage.setItem("font_color","#226e08");
}
if(!localStorage.getItem("font_size")){
    localStorage.setItem("font_size",'16');
}
if(!localStorage.getItem("font_family")){
    localStorage.setItem("font_family","Arial");
}
if(!localStorage.getItem("toolbar")){
    localStorage.setItem("toolbar","selection");
    change_toolbar("selection");
}
if(!localStorage.getItem("undo_stack")){
    localStorage.setItem("undo_stack", "[]");
}

if(!localStorage.getItem("redo_stack")){
    localStorage.setItem("redo_stack", "[]");
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

document.getElementById("font_size").value = localStorage.getItem("font_size");
document.getElementById("font_color").value = localStorage.getItem("font_color");
document.getElementById("font_family").value = localStorage.getItem("font_family");
document.getElementById("stroke_color").value = localStorage.getItem("stroke_color");
document.getElementById("stroke_width").value = localStorage.getItem("stroke_width");
document.getElementById("opacity").value = localStorage.getItem("opacity")*100;
document.getElementById(curr_tool).classList.add("selected");
document.getElementById(stroke_style).classList.add("selected");

change_toolbar(localStorage.getItem("toolbar"))
change_cursor();
change_style();
{const undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
    for(let item of undo_stack){
    state_array.push(convert_to_path2d(item));
}}
ctx.lineWidth = JSON.parse(localStorage.getItem("stroke_width"));
ctx.globalAlpha = JSON.parse(localStorage.getItem("opacity"));
ctx.strokeStyle = localStorage.getItem("stroke_color");
change_style();
ctx2.lineWidth = JSON.parse(localStorage.getItem("stroke_width"));
ctx2.globalAlpha = JSON.parse(localStorage.getItem("opacity"));
ctx2.strokeStyle = localStorage.getItem("stroke_color");
rerender();

const tools = document.getElementsByClassName('tools');
for (const tool of tools) {
    tool.addEventListener("click", (event) => {
        if(tool.id === "text"){
            change_toolbar("font");
            localStorage.setItem("toolbar", "font")
        }
        else if(tool.id === "selection" || tool.id === "eraser"){
            change_toolbar("selection");
            localStorage.setItem("toolbar","selection");
        }
        else
        {
            change_toolbar("stroke");
            localStorage.setItem("toolbar","stroke");
        }
        document.getElementById(curr_tool).classList.remove("selected");
        localStorage.setItem("curr_tool", event.currentTarget.id);
        curr_tool = localStorage.getItem("curr_tool");
        document.getElementById(curr_tool).classList.add("selected");
        change_cursor();
    })}

const stroke_buttons = document.getElementsByClassName('stroke_button');
for (const butt of stroke_buttons){
    butt.addEventListener("click", (event) => {
        document.getElementById(stroke_style).classList.remove("selected");
        localStorage.setItem("stroke_style", event.currentTarget.id);
        stroke_style = localStorage.getItem("stroke_style");
        document.getElementById(stroke_style).classList.add("selected");
        change_style();
    }
)};
document.getElementById("stroke_width").addEventListener("change", (event) => {
        localStorage.setItem("stroke_width", JSON.stringify(event.target.value));
        ctx.lineWidth = event.target.value;
        ctx2.lineWidth = event.target.value;
        change_style();

});
document.getElementById("font_color").addEventListener("change", (e) => {
        localStorage.setItem("font_color",e.currentTarget.value);
});
document.getElementById("font_family").addEventListener("change", (e) => {
        localStorage.setItem("font_family", e.currentTarget.value);
});
document.getElementById("font_size").addEventListener("change", (e) => {
        localStorage.setItem("font_size", e.currentTarget.value);
});
//----------------------------------------------------------------------------------------
//live drawing functions :
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
function draw_box_outline(object){
        const dir_x = (object.startX - object.endX)/Math.abs(object.startX - object.endX);
        const dir_y = (object.startY - object.endY)/Math.abs(object.startY - object.endY);
        object.startX = object.startX + 15*dir_x;
        object.startY = object.startY + 15*dir_y;
        object.endX = object.endX - 15*dir_x;
        object.endY = object.endY - 15*dir_y;
        ctx.beginPath();
        ctx.moveTo(object.startX,object.startY);
        ctx.arc(object.startX,object.startY,5,0,2*Math.PI);
        ctx.moveTo(object.endX,object.startY);
        ctx.arc(object.endX,object.startY,5,0,2*Math.PI);
        ctx.moveTo(object.endX,object.endY);
        ctx.arc(object.endX,object.endY,5,0,2*Math.PI);
        ctx.moveTo(object.startX,object.endY);
        ctx.arc(object.startX,object.endY,5,0,2*Math.PI);
        ctx.fill();
        ctx.moveTo(object.startX,object.startY);
        ctx.lineTo(object.endX,object.startY);
        ctx.lineTo(object.endX,object.endY);
        ctx.lineTo(object.startX,object.endY);
        ctx.lineTo(object.startX,object.startY);
        ctx.stroke()
}
function draw_outline(object){
    ctx.lineWidth = "2";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#16a7f5"
    ctx.fillStyle = "#16a7f5"
    ctx.globalAlpha = "1";
    ctx.setLineDash([]);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(object.type === "line"){
       ctx.beginPath(); 
       ctx.moveTo(object.startX,object.startY);
       ctx.arc(object.startX,object.startY,5,0,2*Math.PI);
       ctx.moveTo((object.startX + object.endX)/2,(object.startY + object.endY)/2);
       ctx.arc((object.endX + object.startX)/2,(object.endY + object.startY)/2,5,0,2*Math.PI);
       ctx.moveTo(object.endX,object.endY);
       ctx.arc(object.endX,object.endY,5,0,2*Math.PI);
       ctx.fill();
    }
    else if(object.type === "rectangle" || object.type === "circle" || object.type === "text"){
        draw_box_outline(object);
    }
    else if(object.type === "pencil" || object.type === "polygon"){
        let max_x = object.pencil_array[0].x;
        let min_x = object.pencil_array[0].x;
        let max_y = object.pencil_array[0].y;
        let min_y = object.pencil_array[0].y;
        for(let i = 1 ; i < object.pencil_array.length; i++){
            max_x = Math.max(object.pencil_array[i].x,max_x);
            max_y = Math.max(object.pencil_array[i].y,max_y);
            min_x = Math.min(object.pencil_array[i].x,min_x);
            min_y = Math.min(object.pencil_array[i].y,min_y);
        }
        object.startX = min_x;
        object.endX = max_x;
        object.startY = min_y;
        object.endY = max_y;
        draw_box_outline(object);
    }

    change_style();
    ctx.lineWidth = document.getElementById("stroke_width").value;
    ctx.globalAlpha = document.getElementById("opacity").value/100;
    ctx.strokeStyle = document.getElementById("stroke_color").value;
}

function move(disp_x,disp_y){
    let arr = JSON.parse(localStorage.getItem("undo_stack"));
    let object = arr[selected_index];
    if(object.type === "pencil" || object.type === "polygon"){
        for(let i = 0 ; i < object.pencil_array.length ; i++){
            object.pencil_array[i].x += disp_x;
            object.pencil_array[i].y += disp_y;
        }
    }
    else{
        object.startX += disp_x;
        object.endX += disp_x;
        object.endY += disp_y;
        object.startY += disp_y;
    }
    arr[selected_index] = object;
    state_array[selected_index] = convert_to_path2d(object);
    ctx2.clearRect(0,0,canvas2.width,canvas2.height);
    localStorage.setItem("undo_stack",JSON.stringify(arr));
    rerender();
    draw_outline(object);
}
//-----------------------------------------------------------------------------------------
//event listeners
canvas.addEventListener("mousedown", (event) => {
    is_drawing = true;
    startX = event.clientX;
    startY = event.clientY;
    if(curr_tool === "pencil"){
        pencil_array = [{x: startX, y: startY}];
    }
    else if(curr_tool === "selection"){
        if(selected_index !== -1){
            move_mode = 1;
            startX = event.clientX;
            startY = event.clientY;
            draw_outline(JSON.parse(localStorage.getItem("undo_stack"))[selected_index]);
        }
        else{
            ctx.clearRect(0,0,canvas.width,canvas.height);
        }
    }
    else if(curr_tool === "text"){
        if(text_box === 0){
            mouse_downed_text = 1;
            ctx.lineWidth = 1;
            if(localStorage.getItem('light') === 'true'){
                ctx.strokeStyle = "black";
            }
            else{
                ctx.strokeStyle = "white";
            }
        }
    }
})
document.body.addEventListener("mousedown" , (e) => {
    if(curr_tool === "text" && text_box === 1){
        if(document.getElementById("textbox").value !== null){createObject(e);}
        else{document.body.removeChild(document.getElementById("textbox"));
        }
    }
},false)
canvas.addEventListener("click", (event) => {    
    if(curr_tool === "polygon"){
        is_drawing = true;
        startX = event.clientX;
        startY = event.clientY;
        if(in_poly_mode === false){
            in_poly_mode = true;
            pencil_array = [{x: startX, y: startY}];
        }
        else{
            ctx.clearRect(0,0,canvas.width,canvas.height);
            pencil_array.push({x: startX, y: startY});
            ctx2.beginPath();
            ctx2.moveTo(startX,startY);
            ctx2.lineTo(pencil_array[pencil_array.length-2].x,pencil_array[pencil_array.length-2].y);
            ctx2.stroke();
        }
    }
})
canvas.addEventListener("dblclick", (e) => {
    if(curr_tool === "polygon"){
        startX = e.clientX;
        startY = e.clientY;
        in_poly_mode = false;
        pencil_array.push({x: startX, y: startY});
        ctx.beginPath();
        ctx.moveTo(startX,startY);
        ctx.lineTo(pencil_array[0].x,pencil_array[0].y);
        ctx.stroke();
        createObject(e)
    }
})
canvas.addEventListener("mousemove", (event) => {
    if (is_drawing === true) {
        prev_undo = false;
        localStorage.setItem("redo_stack","[]");
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
        else if(curr_tool === "polygon"){
                draw_line(event.clientX, event.clientY);
        }
        else if(curr_tool === "text"){
                if(text_box === 0 && mouse_downed_text === 1){
                    draw_rectangle(event.clientX, event.clientY);
                }
        }
        else if(curr_tool === "eraser"){
                erase(event.clientX,event.clientY);
        }
        
        }
    if(curr_tool === "selection"){
                if(move_mode === 0){
                    select(event);
                }
                else{
                    move(event.clientX - startX,event.clientY - startY);
                    startX = event.clientX;
                    startY = event.clientY;
                }

    }
})
canvas.addEventListener("mouseup", (e) => {
    if(curr_tool === "text" && text_box === 0){
        ctx.lineWidth = localStorage.getItem("stroke_width");
        ctx.strokeStyle = localStorage.getItem("stroke_color");
        add_element("text",startX,startY,e.clientX,e.clientY);
        is_drawing = false;
        text_box = 1;
        mouse_downed_text = 0;
    }
    else if(curr_tool === "text" && text_box === 1){
        text_box = 0;
    }
    else if(curr_tool === "selection"){
        move_mode = 0;
    }
    else if(curr_tool !== "polygon"){
        createObject(e);
    }
    
    
});

//to prevent glitches when mouse leaves canvas
canvas.addEventListener("mouseleave", (e) => {
    in_poly_mode = false;
    move_mode = 0;
    if(is_drawing === true){
        createObject(e);
    }
    })

document.getElementById("stroke_color").addEventListener("change", (event) => {
    localStorage.setItem("stroke_color", event.currentTarget.value);
    ctx.strokeStyle = event.currentTarget.value;
    ctx2.strokeStyle = event.currentTarget.value;
})
document.getElementById("opacity").addEventListener("change", (event) => {
    localStorage.setItem("opacity", event.currentTarget.value/100);
    ctx.globalAlpha = event.currentTarget.value/100;
    ctx2.globalAlpha = event.currentTarget.value/100;
})



/*-------------------------------------------------------------------------------------------------------*/
//Undo redo logic:

function undo(e){
    prev_undo = true;
    let arr = JSON.parse(localStorage.getItem("undo_stack"));
    let arr2 = JSON.parse(localStorage.getItem("redo_stack"));
    if(arr.length !== 0)
    {
        const obj = arr.pop();
        state_array.pop();
        arr2.push(obj);
        localStorage.setItem("undo_stack", JSON.stringify(arr));
        localStorage.setItem("redo_stack", JSON.stringify(arr2));
        ctx2.clearRect(0,0,canvas2.width,canvas2.height);
        rerender();
    }
}

function redo(e){
    let arr = JSON.parse(localStorage.getItem("undo_stack"));
    let arr2 = JSON.parse(localStorage.getItem("redo_stack"));
    if(arr2.length !== 0){
        const obj = arr2.pop();
        arr.push(obj);
        state_array.push(convert_to_path2d(obj));
        localStorage.setItem("undo_stack", JSON.stringify(arr));
        localStorage.setItem("redo_stack", JSON.stringify(arr2));
        canvas2draw(obj);
    }
}
document.getElementById("undo").addEventListener("click", undo);
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'z'){
    undo();
}})

document.getElementById("redo").addEventListener("click", redo);
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'y'){
    redo();
}})

//-----------------------------------------------------------------------------------------
//Interactive sliders:
document.getElementById("font_size_value").textContent = `${document.getElementById("font_size").value}px`;
document.getElementById("font_size").addEventListener("input", (event) => {
document.getElementById("font_size_value").textContent = `${event.currentTarget.value}px`;
});

document.getElementById("opacity_value").textContent = `${document.getElementById("opacity").value/100}`;
document.getElementById("opacity").addEventListener("input", (event) => {
document.getElementById("opacity_value").textContent = `${event.currentTarget.value/100}`;
});

document.getElementById("stroke_width_value").textContent = `${document.getElementById("stroke_width").value}px`;
document.getElementById("stroke_width").addEventListener("input", (event) => {
document.getElementById("stroke_width_value").textContent = `${event.currentTarget.value}px`;
});
//TODO:
//bug to be fixed later : drawing stops when pointer crosses toolbar
//bug to be fixed later : stroke dotted appears strange with higher opacities
//later change: change the eraser's crosshair
//add canvas resizing feature, store all canvas objects in an array