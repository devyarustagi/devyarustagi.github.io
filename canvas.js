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
let pointer_downed_text = 0;
let state_array = [];
let move_mode = 0;
let image_cache = {};
let is_selected = 0;
let toolbar_state = 1;
let curr_cursor_class = "dummy_class"; //to speed up remove only this 
let current_handles = {tl:{},tr:{},bl:{},br:{},rot:{}};
let mode = 'none';
let curr_object = {};
let s_index = -1;
let active_handle = 'none';
//pointerdown -> draw dotted lines
//-----------------------------------------------------------------------------------------
//main funcs

//convert to path2d:
function convert_to_path2d(object){
    let path = new Path2D();
    if(object.type === "line"){
        path.moveTo(object.startX,object.startY);
        path.lineTo(object.endX,object.endY);
    }
    else if(object.type === "rectangle" || object.type === "text" || object.type === "image"){
        path.rect(object.startX,object.startY,object.endX-object.startX,object.endY-object.startY);
    }
    else if(object.type === "circle"){
        path.ellipse((object.startX+object.endX)/2, (object.endY+object.startY)/2,(object.endX-object.startX)/2,(object.endY-object.startY)/2,0,0,2*Math.PI)
    }
    else if(object.type === "pencil" || object.type === "polygon")
    {
        path.moveTo(object.pencil_array[0].x,object.pencil_array[0].y);
        for(let i = 1; i < object.pencil_array.length; i++){
            path.lineTo(object.pencil_array[i].x,object.pencil_array[i].y);
        }
        if(object.type === "polygon"){
            path.closePath();
        }
    }
    return path;
}

//to convert pointer coordinates to local coordinates relative to new axes:
function change_coordinates(X,Y,object){
    let a = X - object.centre.x;
    let b = Y - object.centre.y;
    const cosA = Math.cos(-object.angle); //rotate pointer coords opposite
    const sinA = Math.sin(-object.angle);
    return {x: a*cosA - b*sinA, y: a*sinA + b*cosA};
}
//canvas2 drawing function
function canvas2draw(object) {
    ctx2.save();
    ctx2.translate(object.centre.x,object.centre.y);
    ctx2.rotate(object.angle);
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
        ctx2.lineCap = "butt";
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
        ctx2.ellipse((object.startX+object.endX)/2, (object.endY+object.startY)/2,(object.endX-object.startX)/2,(object.endY-object.startY)/2,0,0,2*Math.PI);
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
    else if(object.type === "image"){
        const x = object.startX;
        const y = object.startY;
        const w = (object.endX - object.startX);
        const h = (object.endY - object.startY);
        if (image_cache[object.imgdata]) {
            ctx2.drawImage(image_cache[object.imgdata], x, y, w, h);
        } else {
            const img = new Image();
            img.src = object.imgdata;
            img.onload = () => {
                image_cache[object.imgdata] = img;
                ctx2.save();
                ctx2.globalAlpha = 1;
                ctx2.translate(object.centre.x,object.centre.y);
                ctx2.rotate(object.angle);
                ctx2.drawImage(img, x, y, w, h);
                ctx2.restore();
        
            }
        }
    }
    ctx2.restore();

}
//function to rerender the second canvas
function rerender(){
    ctx2.save();
    ctx2.resetTransform();
    ctx2.clearRect(0,0,canvas2.width,canvas2.height);
    ctx2.restore();
    const undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
    for(let item of undo_stack){
        canvas2draw(item);
}}
//Object constructors
function update_handles(object){
    if(object.type !== "line"){
        object.tl_handle = {x: object.startX - 15, y: object.startY - 15};
        object.tr_handle = {x: object.endX + 15,   y: object.startY - 15};
        object.br_handle = {x: object.endX + 15,   y: object.endY + 15};
        object.bl_handle = {x: object.startX - 15, y: object.endY + 15};
        object.rotate_handle = { 
            x: (object.startX + object.endX) / 2, 
            y: object.startY - 45 
        };
    }
    else if(object.type === "line"){
        const sx = Math.min(object.startX, object.endX);
        const ex = Math.max(object.endX, object.startX);
        const sy = Math.min(object.startY,object.endY);
        const ey = Math.max(object.endY,object.startY);
        object.tl_handle = {x: sx - 15, y: sy - 15};
        object.tr_handle = {x: ex + 15,   y: sy - 15};
        object.br_handle = {x: ex + 15,   y: ey + 15};
        object.bl_handle = {x: sx - 15, y: ey + 15};
        object.rotate_handle = { 
            x: (sx + ex) / 2, 
            y: sy - 45
        };
    }
}
//function to initialize objects
function createObject(e){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    is_drawing = false;
    if(curr_tool === "eraser"){
        return;
    }
    let object = {};
    if (curr_tool === "image"){
        let obj = new Shape_obj(e.clientX, e.clientY);
        const width = Math.round(Math.max(30,Math.abs(obj.endX - obj.startX)));
        const height = Math.round(Math.max(30,Math.abs(obj.endY - obj.startY)));
        obj.startX = Math.min(obj.startX,obj.endX);
        obj.startY = Math.min(obj.startY,obj.endY);
        obj.endX = obj.startX + width;
        obj.endY = obj.startY + height;
    
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `https://picsum.photos/${width}/${height}`;
        const reader = new FileReader();
        fetch(img.src)
        .then(response => {
                return response.blob();
            })
        .then(blob => {
                reader.readAsDataURL(blob); 
        })
                
        reader.onloadend = () => {
                let object = obj;
                object.type = "image";
                object.imgdata = reader.result;
                object.angle = 0;

                object.centre = {x: (object.startX + object.endX)/2, y: (object.startY + object.endY)/2};
                object.startX = object.startX - object.centre.x;
                object.startY = object.startY - object.centre.y;
                object.endX = object.endX - object.centre.x;
                object.endY = object.endY - object.centre.y;

                object.tl_handle = {x: object.startX - 15, y: object.startY - 15};
                object.tr_handle = {x: object.endX + 15,   y: object.startY - 15};
                object.br_handle = {x: object.endX + 15,   y: object.endY + 15};
                object.bl_handle = {x: object.startX - 15, y: object.endY + 15};
                object.rotate_handle = { 
                    x: (object.startX + object.endX) / 2, 
                    y: object.startY - 45 
                };
                let undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
                undo_stack.push(object);
                localStorage.setItem("undo_stack", JSON.stringify(undo_stack));
                state_array.push(convert_to_path2d(object));
                canvas2draw(object);
        };
        return;
    }
    else if(curr_tool === "line"){
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
    if(object.type === "pencil" || object.type === "polygon"){
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
    }
    object.stroke_color = document.getElementById("stroke_color").value;
    object.opacity = document.getElementById("opacity").value/100;
    object.stroke_width = document.getElementById("stroke_width").value;
    object.stroke_style = stroke_style;
    object.angle = 0;

    object.centre = {x: (object.startX + object.endX)/2, y: (object.startY + object.endY)/2};
    object.startX = object.startX - object.centre.x;
    object.startY = object.startY - object.centre.y;
    object.endX = object.endX - object.centre.x;
    object.endY = object.endY - object.centre.y;
    update_handles(object);
    
    if(object.type === "pencil" || object.type === "polygon"){
        for(let i = 0 ; i < object.pencil_array.length; i++){
            object.pencil_array[i].x -= object.centre.x;
            object.pencil_array[i].y -= object.centre.y;
        }
    }
    let undo_stack = JSON.parse(localStorage.getItem("undo_stack"));
    undo_stack.push(object);
    localStorage.setItem("undo_stack", JSON.stringify(undo_stack));
    state_array.push(convert_to_path2d(object));
    canvas2draw(object);
}
//function to create corners
function Shape_obj(endX,endY){
    if(curr_tool !== "line"){
        this.startX = Math.min(startX,endX);
        this.startY = Math.min(startY,endY);
        this.endX = Math.max(startX,endX);
        this.endY= Math.max(startY,endY);
    }
    else if(curr_tool === "line"){
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }
}
//function to do the hittesting, x and y are pointer coordinates wr to og coords
function hit_test(index,obj,x,y){
    const p = change_coordinates(x,y,obj);
    ctx2.save();
    ctx2.lineWidth = obj.stroke_width;
    ctx2.resetTransform();
    const ans = (ctx2.isPointInPath(state_array[index],p.x,p.y) || ctx2.isPointInStroke(state_array[index],p.x,p.y)) ? 1 : 0;
    ctx2.restore();
    return ans;
}
//function to switch between font toolbar and shapes toolbar
function change_toolbar(s){
    if(toolbar_state === 1){
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
}

//function to change the cursor
function change_cursor(){
    canvas.classList.remove("crosshair", "textcursor", "erasing", "grabbing");
    if(curr_tool === "text"){
        canvas.classList.add("textcursor");
    }
    else if(curr_tool === "eraser"){
        canvas.classList.add("erasing");
    }
    else if (curr_tool !== "selection") {
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
        ctx.lineCap = "butt";
        ctx2.lineCap = "butt";
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
        input.addEventListener("pointerdown",(e)=>{e.stopPropagation()},true);
    }
}
function erase(e){
    let arr = JSON.parse(localStorage.getItem("undo_stack"));
    for(let i = state_array.length - 1 ; i > -1;i--){
            if(hit_test(i,arr[i],e.clientX,e.clientY) === 1){
                state_array.splice(i,1);
                arr.splice(i,1);
                localStorage.setItem("undo_stack",JSON.stringify(arr));
            }
        }
    rerender();
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
        else if(tool.id === "selection" || tool.id === "eraser" || tool.id === "image"){
            change_toolbar("selection");
            localStorage.setItem("toolbar","selection");
        }
        else
        {
            change_toolbar("stroke");
            localStorage.setItem("toolbar","stroke");
        }
        if(tool.id === "polygon"){
            document.getElementById("hint").style.display = "flex";
        }
        else{
            document.getElementById("hint").style.display = "none";
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
        localStorage.setItem("stroke_width", event.target.value);
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
document.getElementById("options").addEventListener("click", (e)=>{
        if(toolbar_state === 0){
            toolbar_state = 1;
            if(curr_tool === "eraser" || curr_tool === "selection" || curr_tool === "image"){
                change_toolbar("selection");
            }
            else if(curr_tool === "text"){
                change_toolbar("font");
            }
            else{
                change_toolbar("stroke");
            }
            
        }
        else{
            change_toolbar("selection");
            toolbar_state = 0;
        }
})
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
function return_box_outline(object){ 
        ctx2.save();
        ctx2.resetTransform();
        let path = new Path2D();
        ctx2.beginPath();
        path.moveTo(object.tl_handle.x, object.tl_handle.y);
        path.arc(object.tl_handle.x,object.tl_handle.y,5,0,2*Math.PI);
        path.moveTo(object.bl_handle.x,object.bl_handle.y);
        path.arc(object.bl_handle.x,object.bl_handle.y,5,0,2*Math.PI);
        path.moveTo(object.br_handle.x,object.br_handle.y);
        path.arc(object.br_handle.x,object.br_handle.y,5,0,2*Math.PI);
        path.moveTo(object.tr_handle.x,object.tr_handle.y);
        path.arc(object.tr_handle.x,object.tr_handle.y,5,0,2*Math.PI);
        path.moveTo(object.rotate_handle.x,object.rotate_handle.y);
        path.arc(object.rotate_handle.x,object.rotate_handle.y,5,0,2*Math.PI);
        path.moveTo(object.tl_handle.x,object.tl_handle.y);
        path.lineTo(object.bl_handle.x,object.bl_handle.y);
        path.lineTo(object.br_handle.x,object.br_handle.y);
        path.lineTo(object.tr_handle.x,object.tr_handle.y);
        path.closePath();
        ctx2.restore();
        return path;
}
function draw_box_outline(object){
        ctx2.save();
        rerender(); 
        ctx2.resetTransform();
        ctx2.translate(object.centre.x,object.centre.y);
        ctx2.rotate(object.angle);
        ctx2.lineWidth = "2";
        ctx2.lineJoin = "round";
        ctx2.lineCap = "round";
        ctx2.strokeStyle = "#16a7f5"
        ctx2.fillStyle = "#16a7f5"
        ctx2.globalAlpha = "1";
        ctx2.setLineDash([]);
        ctx2.beginPath();
        ctx2.moveTo(object.tl_handle.x, object.tl_handle.y);
        ctx2.arc(object.tl_handle.x,object.tl_handle.y,5,0,2*Math.PI);
        ctx2.moveTo(object.bl_handle.x,object.bl_handle.y);
        ctx2.arc(object.bl_handle.x,object.bl_handle.y,5,0,2*Math.PI);
        ctx2.moveTo(object.br_handle.x,object.br_handle.y);
        ctx2.arc(object.br_handle.x,object.br_handle.y,5,0,2*Math.PI);
        ctx2.moveTo(object.tr_handle.x,object.tr_handle.y);
        ctx2.arc(object.tr_handle.x,object.tr_handle.y,5,0,2*Math.PI);
        ctx2.moveTo(object.rotate_handle.x,object.rotate_handle.y);
        ctx2.arc(object.rotate_handle.x,object.rotate_handle.y,5,0,2*Math.PI);
        ctx2.fill();
        ctx2.moveTo(object.tl_handle.x,object.tl_handle.y);
        ctx2.lineTo(object.bl_handle.x,object.bl_handle.y);
        ctx2.lineTo(object.br_handle.x,object.br_handle.y);
        ctx2.lineTo(object.tr_handle.x,object.tr_handle.y);
        ctx2.closePath();
        ctx2.stroke();
        ctx2.restore();
}


//select func:
function OOB(e){ //takes event for coordinates and path2d object for restricting to one  object
    const x = e.clientX;
    const y = e.clientY;
    if(is_selected === 0){
        const arr = JSON.parse(localStorage.getItem("undo_stack"))
        for(let i = state_array.length - 1 ; i >= 0 ; i--){
            if(hit_test(i,arr[i],x,y) === 1){
                s_index = i;
                return 0;
            }
        }
        return -1;
    }
    else {
            const object = JSON.parse(localStorage.getItem("undo_stack"))[s_index];
            let ans = 0;
            ctx2.save();
            ctx2.resetTransform();
            ctx2.lineWidth = object.stroke_width;
            const pt = change_coordinates(x,y,object);
            if(ctx2.isPointInPath(curr_object,pt.x,pt.y) || ctx2.isPointInStroke(curr_object,pt.x,pt.y)){
                if((Math.abs(pt.x - object.tl_handle.x) <= 11) && (Math.abs(pt.y - object.tl_handle.y) <= 11)){
                    ans = 1; 
                    active_handle = 0;
                }
                else if((Math.abs(pt.x - object.bl_handle.x) <= 11) && (Math.abs(pt.y - object.bl_handle.y) <= 11)){
                    ans = 2;
                    active_handle = 1;
                }
                else if((Math.abs(pt.x - object.br_handle.x) <= 11) && (Math.abs(pt.y - object.br_handle.y) <= 11)){
                    ans = 3;
                    active_handle = 2;
                }
                else if((Math.abs(pt.x - object.tr_handle.x) <= 11) && (Math.abs(pt.y - object.tr_handle.y) <= 11)){
                    ans = 4;
                    active_handle = 3;
                }
                else if((Math.abs(pt.x - object.rotate_handle.x) <= 11) && (Math.abs(pt.y - object.rotate_handle.y) <= 11)){
                    ans = 5;
                }
                else{
                    ans = 0;
                }
            }
            else{
                ans = -1;
            }
            ctx2.restore();
            return ans;
    }
}
function cursor_setter(x){
    canvas.classList.remove(curr_cursor_class); //call with -1 to remove all curosrs
    if(x !== -1){
        canvas.classList.add("grabbing");
        curr_cursor_class = "grabbing";
    }
    else{
        curr_cursor_class = "dummy_class"
    }
}
function change_main_coords(pointer,handle,object){
        let arr = [object.tl_handle,object.bl_handle,object.br_handle,object.tr_handle];
        let scale = {x: 1,y: 1};
        if(Math.abs(pointer.x - arr[(handle+2)%4].x) <= 35 || Math.abs(arr[(handle+2)%4].y - pointer.y) <= 35 ){
            return scale;
        }
        else{
            arr[handle].x = pointer.x;
            arr[handle].y = pointer.y;
            if(handle % 2 === 0){
                arr[(handle + 1)%4].x  = pointer.x;
                arr[(handle + 3)%4].y  = pointer.y;
            }
            else{
                arr[(handle + 1)%4].y = pointer.y;
                arr[(handle + 3)%4].x = pointer.x;
            }
        }
        scale.x = (Math.abs(arr[0].x - arr[2].x) - 30)/Math.abs(object.startX - object.endX);
        scale.y = (Math.abs(arr[0].y - arr[1].y) - 30)/Math.abs(object.startY - object.endY);
        const cd_x = (arr[0].x + arr[2].x)/2;
        const cd_y = (arr[0].y + arr[1].y)/2;
        const cosA = Math.cos(object.angle);
        const sinA = Math.sin(object.angle);
        object.centre.x = object.centre.x + cd_x*cosA - cd_y*sinA;
        object.centre.y = object.centre.y + cd_y*cosA + cd_x*sinA;
        for(let i = 0 ; i < 4 ; i++){
            arr[i].x -= cd_x;
            arr[i].y -= cd_y;
        }
        object.rotate_handle.x = 0.5*(arr[0].x + arr[2].x);
        object.rotate_handle.y = arr[0].y - 30;
        return scale;
}
function move(e){
        let arr = JSON.parse(localStorage.getItem("undo_stack"));
        let object = arr[s_index];
        object.centre.x += (e.clientX - startX);
        object.centre.y += (e.clientY - startY);
        arr[s_index] = object;
        localStorage.setItem("undo_stack",JSON.stringify(arr));
        rerender();
        draw_box_outline(object);
        return;
}

function rotate(e){
        let arr = JSON.parse(localStorage.getItem("undo_stack"));
        let object = arr[s_index];
        object.angle = Math.atan2(e.clientY - object.centre.y,e.clientX - object.centre.x) + 0.5*Math.PI;
        arr[s_index] = object;
        localStorage.setItem("undo_stack", JSON.stringify(arr));
        rerender();
        draw_box_outline(object);
        return;
}

function resize(e){
        let arr = JSON.parse(localStorage.getItem("undo_stack"));
        let object = arr[s_index];
        let pt = change_coordinates(e.clientX,e.clientY,object);
        const scale = change_main_coords(pt,active_handle,object);
        const height = object.endY - object.startY;
        object.startX *= scale.x;
        object.startY *= scale.y;
        object.endX *= scale.x;
        object.endY *= scale.y;
        if(object.type === "pencil" || object.type === "polygon"){
            for(let i = 0 ; i < object.pencil_array.length ; i++)
            {
                object.pencil_array[i].x *= scale.x;
                object.pencil_array[i].y *= scale.y;
            }  
        }
        else if(object.type === "text"){
            object.font_size = (`${parseFloat(object.font_size) + object.endY - object.startY - height}px`);
        }
        arr[s_index] = object;
        state_array[s_index] = convert_to_path2d(object);
        localStorage.setItem("undo_stack", JSON.stringify(arr));
        rerender();
        draw_box_outline(object);
        return;
}
//-----------------------------------------------------------------------------------------
//event listeners
canvas.addEventListener("pointerdown", (event) => {
    is_drawing = true;
    startX = event.clientX;
    startY = event.clientY;
    if(curr_tool === "pencil"){
        pencil_array = [{x: startX, y: startY}];
    }
    else if(curr_tool === "selection"){
        if(is_selected === 0){
            const x = OOB(event);
            if(x === 0){
                is_selected = 1;
                curr_object = return_box_outline(JSON.parse(localStorage.getItem("undo_stack"))[s_index]);
                draw_box_outline(JSON.parse(localStorage.getItem("undo_stack"))[s_index]);
            }
        }
        else{
            const x = OOB(event);
            startX = event.clientX;
            startY = event.clientY;
            if(x === -1){
                is_selected = 0;
                curr_object = {};
                s_index = -1;
                rerender();
                cursor_setter(-1);
                mode = 'none';
            }
            else if(x === 0){
                cursor_setter(0);
                mode = "move";
            }
            else if(x === 5){
                cursor_setter(5);
                mode = "rotate";
            }
            else{
                cursor_setter(x);
                mode = "resize";
            }
        }
    }
    else if(curr_tool === "text"){
        if(text_box === 0){
            pointer_downed_text = 1;
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
document.body.addEventListener("pointerdown" , (e) => {
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
canvas.addEventListener("pointermove", (event) => {
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
                if(text_box === 0 && pointer_downed_text === 1){
                    draw_rectangle(event.clientX, event.clientY);
                }
        }
        else if(curr_tool === "eraser"){
                erase(event);
        }
        else if(curr_tool === "image"){
                draw_rectangle(event.clientX,event.clientY);
        }
        
        }
    if(curr_tool === "selection"){
        if(is_selected === 1){
                if(mode === 'none'){
                    const x = OOB(event);
                    cursor_setter(x);
                }
                else if(mode === 'rotate' ){
                    rotate(event);
                }
                else if(mode === 'resize'){
                    resize(event);
                }
                else if(mode === 'move'){
                    move(event);
                }
            }
        startX = event.clientX;
        startY = event.clientY;

    }
})
canvas.addEventListener("pointerup", (e) => {
    if(curr_tool === "text" && text_box === 0){
        ctx.lineWidth = localStorage.getItem("stroke_width");
        ctx.strokeStyle = localStorage.getItem("stroke_color");
        add_element("text",startX,startY,e.clientX,e.clientY);
        is_drawing = false;
        text_box = 1;
        pointer_downed_text = 0;
    }
    else if(curr_tool === "text" && text_box === 1){
        text_box = 0;
    }
    else if(curr_tool === "selection"){
        mode = 'none';
    }
    else if(curr_tool !== "polygon"){
        createObject(e);
    }
    
    
});

//to prevent glitches when pointer leaves canvas
canvas.addEventListener("pointerleave", (e) => {
    in_poly_mode = false;
    if(curr_tool === "selection"){
        is_selected = 0;
        curr_object = {};
        s_index = -1;
        ctx2.clearRect(0,0,canvas2.width,canvas2.height);
        rerender();
        cursor_setter(-1);
        mode = 'none';
    }
    else if(is_drawing === true){
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
